const {
    View,
    Kernel,
    UIKit,
    Sheet,
    ViewController,
    NavigationView,
    NavigationBar,
    Toast
} = require("../libs/easy-jsbox")
const Editor = require("./components/editor")
const ClipsData = require("../dao/clips-data")
const ClipsSearch = require("./clips-search")
const ClipsEditor = require("./clips-editor")
const { ActionData, ActionEnv } = require("../action/action")
const WebDavSync = require("../dao/webdav-sync")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Clips extends ClipsData {
    listId = "clips-list"

    // 剪贴板列个性化设置
    #singleLine = false
    #singleLineContentHeight = -1
    #tagHeight = -1
    tabLeftMargin = 20 // tab 左边距
    horizontalMargin = 20 // 列表边距
    verticalMargin = 20 // 列表边距
    containerMargin = 0 // list 单边边距。如果 list 未贴合屏幕左右边缘，则需要此值辅助计算文字高度
    fontSize = 16 // 字体大小
    copiedIndicatorSize = 6 // 已复制指示器（小绿点）大小
    imageContentHeight = 50
    tagFontSize = 14
    menuItemActionMaxCount = 5

    tabHeight = 44

    copied = $cache.get("clips.copied") ?? {}
    #textHeightCache = {}

    viewController

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)

        this.viewController = new ViewController()
    }

    get tagHeight() {
        if (this.#tagHeight < 0) {
            this.#tagHeight = this.getTextHeight($font(this.tagFontSize))
        }
        return this.#tagHeight
    }

    get singleLineContentHeight() {
        if (this.#singleLineContentHeight < 0) {
            this.#singleLineContentHeight = this.getTextHeight($font(this.fontSize))
        }
        return this.#singleLineContentHeight
    }

    setSingleLine() {
        this.#singleLine = true
        // 图片高度与文字一致
        this.imageContentHeight = this.singleLineContentHeight
    }

    getTextHeight(font, text = "a") {
        return $text.sizeThatFits({
            text,
            font,
            width: UIKit.windowSize.width - (this.horizontalMargin + this.containerMargin) * 2
        }).height
    }

    getContentHeight(text) {
        if (!this.#textHeightCache[text]) {
            this.#textHeightCache[text] = this.#singleLine
                ? this.singleLineContentHeight
                : Math.min(this.getTextHeight($font(this.fontSize), text), this.singleLineContentHeight * 2)
        }
        return this.#textHeightCache[text]
    }

    appListen() {
        if (Kernel.isTaio) return
        $app.listen({
            resume: () => {
                // 在应用恢复响应后调用
                this.updateList(true)
                $delay(0.5, () => {
                    this.readClipboard()
                })
            },
            clipSyncStatus: args => {
                const list = $(this.listId)
                if (args.status === WebDavSync.status.success) {
                    if (args.updateList) {
                        this.updateList(true)
                        if (list) list.endRefreshing()
                    }
                } else if (args.status === WebDavSync.status.syncing) {
                    if (list) list.beginRefreshing()
                }
            }
        })
    }

    /**
     * list view ready event
     */
    listReady() {
        this.updateList()

        if (Kernel.isTaio) return

        // check url scheme
        $delay(0.5, () => {
            if ($context.query["copy"]) {
                const uuid = $context.query["copy"]
                const content = this.kernel.storage.getByUUID(uuid)
                this.setClipboardText(content.text)
                this.setCopied(this.getRowByUUID(uuid))
                $ui.success($l10n("COPIED"))
            } else if ($context.query["add"]) {
                this.getAddTextView()
            } else if ($context.query["actions"]) {
                if (this.kernel.isUseJsboxNav) {
                    this.kernel.actionManager.present()
                } else {
                    this.kernel.tabBarController.switchPageTo("actions")
                }
            }
        })

        // readClipboard
        $delay(0.5, () => {
            this.readClipboard()
        })

        this.appListen()
    }

    updateList(reload = false) {
        if (reload) {
            this.loadAllClips()
        }
        $(this.listId).data = this.clips.map(data => this.lineData(data, this.copied.uuid === data.uuid))
        this.updateListBackground()
    }

    updateListBackground() {
        const bg = $(this.listId + "-empty-list-background")
        if (bg) {
            bg.hidden = this.clips.length > 0
        }
    }

    updateCopied(copied = {}) {
        if (copied === null) {
            this.copied = {}
        } else {
            Object.assign(this.copied, copied)
        }
        this.kernel.print(`this.copied: ${JSON.stringify(this.copied, null, 2)}`)
        $cache.set("clips.copied", this.copied)
    }

    /**
     * 将元素标记为 copied
     * @param {string|undefined} uuid 若为 undefined 则清空剪切板
     * @param {number} row
     * @param {boolean} isUpdateIndicator
     * @returns
     */
    setCopied(row, isUpdateIndicator = true) {
        const uuid = this.clips[row]?.uuid
        if (
            !uuid ||
            (uuid === this.copied.uuid && this.tabIndex === this.copied?.tabIndex && row === this.copied?.row)
        ) {
            return
        }

        let copied = {}
        if (this.copied.uuid !== uuid) {
            copied = this.kernel.storage.getByUUID(uuid) ?? {}
        }
        copied.tabIndex = this.tabIndex
        copied.row = row

        this.updateCopied(copied)

        if (isUpdateIndicator) {
            $delay(0.3, () => {
                const listView = $(this.listId)
                const oldCell = listView.cell($indexPath(0, this.copied.row))
                if (oldCell) {
                    oldCell.get("copied").hidden = true
                }
                listView.cell($indexPath(0, row)).get("copied").hidden = false
            })
        }
    }

    clearCopied() {
        const listView = $(this.listId)
        const oldCell = listView.cell($indexPath(0, this.copied.row))
        if (oldCell) {
            oldCell.get("copied").hidden = true
        }
        this.updateCopied(null)
    }

    async readClipboard(manual = false) {
        if (manual || this.kernel.setting.get("clipboard.autoSave")) {
            this.kernel.print("read clipboard")

            // 仅手动模式下保存图片
            if ($clipboard.images?.length > 0) {
                if (manual) {
                    await $wait(0.1)
                    $clipboard.images.forEach(image => {
                        this.add(image)
                    })
                    return
                }
                return
            }

            // 剪切板没有变化则直接退出
            if (!manual && !this.isChanged) {
                return
            }

            const text = $clipboard.text

            if (!text || text === "") {
                this.clearCopied()
                return
            }

            // 判断 copied 是否和剪切板一致
            // 开发模式下，清空数据后该值仍然存在，可能造成：无法保存相同的数据
            if (this.copied.text === text) {
                if (manual) {
                    $ui.toast($l10n("CLIPBOARD_NO_CHANGE"))
                }
                return
            }

            const md5 = $text.MD5(text)
            if (this.savedClipboardIndex[md5]) {
                const res = this.kernel.storage.getByMD5(md5)
                // 切换标签页
                this.switchTab(this.tabItemsIndex.indexOf(res.section), true)
                this.setCopied(this.getRowByUUID(res.uuid))
            } else {
                // 切换标签页
                this.switchTab(1, true) // clips
                this.add(text)
                this.copy(0)
            }
        }
    }

    add(item) {
        try {
            const data = super.addItem(item)

            // 先修改背景，让 list 显示出来
            this.updateListBackground()

            // 在列表中插入行
            $(this.listId).insert({
                indexPath: $indexPath(0, 0),
                value: this.lineData(data)
            })
            // 被复制的元素向下移动了一个单位
            if (this.copied?.tabIndex === this.tabIndex && this.copied?.row < this.clips.length) {
                this.setCopied(this.copied.row + 1, false)
            }
        } catch (error) {
            $ui.alert(error)
            this.kernel.error(error)
        }
    }

    delete(row) {
        try {
            const deleteedItem = this.getCopy(this.clips[row])
            super.deleteItem(row)
            // 删除剪切板信息
            if (this.copied.uuid === deleteedItem.uuid) {
                this.copied = {}
                $clipboard.clear()
            }

            this.updateListBackground()
        } catch (error) {
            $ui.alert(error)
            this.kernel.error(error)
        }
    }

    update(text, row) {
        try {
            super.updateItem(text, row)
            // 更新列表
            this.updateList()
            if (this.clips[row].uuid === this.copied.uuid) {
                this.setClipboardText(text)
                this.updateCopied({ text })
            }

            return true
        } catch (error) {
            this.kernel.error(error)
            $ui.alert(error)
            return false
        }
    }

    /**
     * 将from位置的元素移动到to位置
     * @param {number} from
     * @param {number} to
     * @param {boolean} updateUI
     */
    move(from, to, updateUI = true) {
        if (from === to) return

        try {
            super.moveItem(from, to)

            if (!updateUI) return
            // 操作 UI
            const listView = $(this.listId)
            // 移动列表
            if (from < to) {
                // 从上往下移动
                listView.insert({
                    indexPath: $indexPath(0, to + 1), // 若向下移动则 to 增加 1，因为代码为移动到 to 位置的上面
                    value: this.lineData(this.clips[to])
                })
                listView.delete($indexPath(0, from))
            } else {
                // 从下往上移动
                listView.delete($indexPath(0, from))
                listView.insert({
                    indexPath: $indexPath(0, to),
                    value: this.lineData(this.clips[to])
                })
            }
            // 修正指示器
            if (this.copied.tabIndex !== undefined) {
                if (this.copied.tabIndex === this.tabIndex) {
                    if (this.copied.row === from) {
                        // 被移动的行是被复制的行
                        this.setCopied(to)
                    } else if (
                        (this.copied.row > from && this.copied.row < to) ||
                        (this.copied.row < from && this.copied.row > to) ||
                        this.copied.row === to
                    ) {
                        // 被复制的行介于 from 和 _to 之间或等于 _to
                        // 从上往下移动则 -1 否则 +1
                        this.setCopied(from < to ? this.copied.row - 1 : this.copied.row + 1)
                    }
                }
            }
        } catch (error) {
            $ui.alert(error)
            this.kernel.error(error)
        }
    }

    favorite(row) {
        const item = this.clips[row]

        if (item?.section === "favorite") {
            this.move(row, 0)
            return
        }

        const res = this.kernel.storage.getByMD5(item.md5)
        if (res?.section === "favorite") {
            Toast.warning("Already exists")
            return
        }

        try {
            super.favoriteItem(row)
            // UI 操作
            $(this.listId).delete(row)
        } catch (error) {
            $ui.alert(error)
        }
    }

    /**
     * 复制
     * @param {number} row 被复制的行
     */
    copy(row) {
        const text = this.clips[row].text
        const path = this.kernel.storage.keyToPath(text)
        if (path && this.kernel.fileStorage.exists(path.original)) {
            $clipboard.image = this.kernel.fileStorage.readSync(path.original).image
        } else {
            this.setClipboardText(text)
        }
        const isMoveToTop = this.tabIndex !== 0
        // 将被复制的行移动到最前端
        if (isMoveToTop) this.move(row, 0)
        // 写入缓存并更新数据
        this.setCopied(isMoveToTop ? 0 : row)
    }

    edit(text, callback) {
        const editor = new Editor(this.kernel)
        const navButtons = [
            {
                symbol: "square.and.arrow.up",
                tapped: () => {
                    if (editor.text) {
                        $share.sheet(editor.text)
                    } else {
                        $ui.warning($l10n("NONE"))
                    }
                }
            }
        ]

        if (this.kernel.isUseJsboxNav) {
            editor.uikitPush(text, text => callback(text), navButtons)
        } else {
            const navigationView = editor.getNavigationView(text, text => callback(text), navButtons)
            this.viewController.push(navigationView)
        }
    }

    getAddTextView() {
        this.edit("", text => {
            if (text !== "") this.add(text)
        })
    }

    menuItems(defaultOnly = false) {
        const defaultButtons = [
            {
                inline: true,
                items: [
                    {
                        title: $l10n("TAG"),
                        symbol: "tag",
                        handler: (sender, indexPath) => {
                            const uuid = this.clips[indexPath.row].uuid
                            $input.text({
                                placeholder: $l10n("ADD_TAG"),
                                text: sender.text,
                                handler: text => {
                                    text = text.trim()
                                    if (text.length > 0) {
                                        this.kernel.storage.setTag(uuid, text)
                                    } else {
                                        this.kernel.storage.deleteTag(uuid)
                                    }
                                    this.updateList(true)
                                }
                            })
                        }
                    }
                ]
            },
            {
                inline: true,
                items: [
                    {
                        title: $l10n("SHARE"),
                        symbol: "square.and.arrow.up",
                        handler: (sender, indexPath) => {
                            const text = this.clips[indexPath.row].text
                            let shareContent = text
                            const path = this.kernel.storage.keyToPath(text)
                            if (path && this.kernel.fileStorage.exists(path.original)) {
                                const image = this.kernel.fileStorage.readSync(path.original)?.image?.png
                                shareContent = {
                                    name: image.fileName,
                                    data: image
                                }
                            }
                            $share.sheet([shareContent])
                        }
                    },
                    {
                        title: $l10n("COPY"),
                        symbol: "square.on.square",
                        handler: (sender, indexPath) => this.copy(indexPath.row)
                    },
                    {
                        title: $l10n("DELETE"),
                        symbol: "trash",
                        destructive: true,
                        handler: (sender, indexPath) => {
                            this.kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), () => {
                                sender.delete(indexPath)
                                this.delete(indexPath.row)
                            })
                        }
                    }
                ]
            }
        ]

        if (defaultOnly) {
            return defaultButtons
        }

        const action = action => {
            const handler = this.kernel.actionManager.getActionHandler(action.type, action.dir)
            action.handler = (sender, indexPath) => {
                const item = this.clips[indexPath.row]
                const actionData = new ActionData({
                    env: ActionEnv.clipboard,
                    text: item.text,
                    uuid: item.uuid
                })
                handler(actionData)
            }
            action.title = action.name
            action.symbol = action.icon
            return action
        }
        const actions = this.kernel.actionManager.getActions("clipboard")
        const actionButtons = {
            inline: true,
            items: actions.slice(0, this.menuItemActionMaxCount).map(action)
        }
        if (actions.length > this.menuItemActionMaxCount) {
            actionButtons.items.push({
                title: $l10n("MORE_ACTIONS"),
                symbol: "square.grid.2x2",
                items: actions.slice(this.menuItemActionMaxCount).map(action)
            })
        }

        return [actionButtons, ...defaultButtons]
    }

    switchTab(index, manual = false) {
        this.tabIndex = index
        this.updateList()

        if (manual) {
            $(this.listId + "-tab").index = this.tabIndex
        }
    }

    tabView() {
        return {
            type: "tab",
            props: {
                id: this.listId + "-tab",
                items: this.tabItems,
                index: this.tabIndex,
                dynamicWidth: true
            },
            events: {
                changed: sender => this.switchTab(sender.index)
            },
            layout: (make, view) => {
                make.centerY.equalTo(view.super)
                if (view.prev) {
                    make.left.equalTo(view.prev.right).offset(this.tabLeftMargin)
                } else {
                    make.left.inset(this.tabLeftMargin)
                }
            }
        }
    }

    quickLookImage(path) {
        const originalPath = this.kernel.fileStorage.filePath(path.original)
        const sheet = new Sheet()
        sheet
            .setView({
                type: "view",
                views: [
                    {
                        type: "scroll",
                        props: {
                            zoomEnabled: true,
                            maxZoomScale: 3
                        },
                        layout: $layout.fill,
                        views: [
                            {
                                type: "image",
                                props: { src: originalPath },
                                layout: $layout.fill
                            }
                        ]
                    }
                ],
                layout: $layout.fill
            })
            //.setStyle(Sheet.UIModalPresentationStyle.FullScreen)
            .addNavBar({
                title: $l10n("PREVIEW"),
                popButton: { title: $l10n("CLOSE") },
                rightButtons: [
                    {
                        symbol: "square.and.arrow.up",
                        tapped: () => $share.sheet(this.kernel.fileStorage.readSync(path.original))
                    }
                ]
            })
            .init()
            .present()
    }

    lineData(data, indicator = false) {
        const image = { hidden: true }
        const content = { text: "" }

        const path = this.kernel.storage.keyToPath(data.text, false)
        if (path) {
            image.src = path.preview
            image.hidden = false
        } else {
            content.text = data.text
        }

        return {
            copied: { hidden: !indicator },
            image,
            tag: { text: data.tag ?? "" },
            content
        }
    }

    listTemplate() {
        return {
            props: { bgcolor: $color("clear") },
            views: [
                {
                    type: "view",
                    views: [
                        {
                            type: "view",
                            props: {
                                id: "copied",
                                circular: this.copiedIndicatorSize,
                                hidden: true,
                                bgcolor: $color("green")
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.size.equalTo(this.copiedIndicatorSize)
                                // 放在前面小缝隙的中间 `this.copyedIndicatorSize / 2` 指大小的一半
                                make.left
                                    .equalTo(view.super)
                                    .inset(this.horizontalMargin / 2 - this.copiedIndicatorSize / 2)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "content",
                                lines: this.#singleLine ? 1 : 2,
                                font: $font(this.fontSize)
                            },
                            layout: (make, view) => {
                                make.left.right.equalTo(view.super).inset(this.horizontalMargin)
                                make.centerY.equalTo(view.super)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "tag",
                                lines: 1,
                                color: $color("lightGray"),
                                font: $font(this.tagFontSize)
                            },
                            layout: (make, view) => {
                                make.bottom.equalTo(view.super)
                                make.left.right.equalTo(view.prev)
                                make.height.equalTo(this.tagHeight)
                            }
                        }
                    ],
                    layout: $layout.fill
                },
                {
                    type: "image",
                    props: {
                        id: "image",
                        hidden: true
                    },
                    layout: $layout.fill
                }
            ]
        }
    }

    getListView(id = this.listId, data = []) {
        const listView = {
            // 剪切板列表
            type: "list",
            props: {
                id,
                associateWithNavigationBar: false,
                bgcolor: $color("clear"),
                separatorInset: $insets(0, this.horizontalMargin, 0, 0),
                menu: { items: this.menuItems() },
                data,
                template: this.listTemplate(),
                actions: [
                    {
                        // 复制
                        title: $l10n("COPY"),
                        color: $color("systemLink"),
                        handler: (sender, indexPath) => this.copy(indexPath.row)
                    },
                    {
                        // 收藏
                        title: $l10n("FAVORITE"),
                        color: $color("orange"),
                        handler: (sender, indexPath) => {
                            this.favorite(indexPath.row)
                        }
                    }
                ]
            },
            layout: $layout.fill,
            events: {
                ready: () => this.listReady(),
                rowHeight: (sender, indexPath) => {
                    const text = this.clips[indexPath.row].text
                    const tag = this.clips[indexPath.row].tag

                    const tagHeight = tag && tag !== "" ? this.tagHeight : this.verticalMargin
                    const itemHeight = this.kernel.storage.isImage(text)
                        ? this.imageContentHeight
                        : this.getContentHeight(text)
                    return this.verticalMargin + itemHeight + tagHeight
                },
                didSelect: (sender, indexPath, data) => {
                    const item = this.clips[indexPath.row]
                    const text = item.text
                    const path = this.kernel.storage.keyToPath(text)
                    if (path && this.kernel.fileStorage.exists(path.original)) {
                        this.quickLookImage(path)
                    } else {
                        this.edit(item.text, text => {
                            if (item.md5 !== $text.MD5(text)) this.update(text, indexPath.row)
                        })
                    }
                },
                pulled: sender => {
                    this.updateList(true)
                    if (this.kernel.storage.sync()) {
                        // 若开启了同步则通过 $app.listen 关闭加载动画
                        return
                    }
                    $delay(0.5, () => sender.endRefreshing())
                }
            }
        }

        const emptyListBackground = {
            type: "label",
            props: {
                id: id + "-empty-list-background",
                color: $color("secondaryText"),
                hidden: this.clips.length > 0,
                text: $l10n("NONE"),
                align: $align.center
            },
            layout: $layout.center
        }

        return View.createFromViews([listView, emptyListBackground])
    }

    getNavigationView() {
        const search = new ClipsSearch(this.kernel)
        search.setCallback(res => {
            const sheet = new Sheet()
            sheet
                .setView(
                    this.getListView(
                        this.listId + "-search-result",
                        res.map(data => this.lineData(data))
                    )
                )
                .addNavBar({
                    title: $l10n("SEARCH_RESULT"),
                    popButton: { title: $l10n("DONE"), tapped: () => search.dismiss() }
                })
                .init()
                .present()
        })

        const menuView = this.tabView()
        menuView.type = "menu"
        menuView.layout = (make, view) => {
            make.top.left.right.equalTo(view.super)
            make.height.equalTo(this.tabHeight)
        }

        const view = this.getListView()
        view.views.unshift(menuView)
        view.views[1].layout = (make, view) => {
            make.bottom.left.right.equalTo(view.super)
            make.top.equalTo(view.prev.bottom)
        }
        view.views.push(search.getSearchHistoryView())

        const navigationView = new NavigationView().navigationBarTitle($l10n("CLIPS")).setView(view)
        navigationView.navigationBarItems
            .setTitleView(search.getSearchBarView())
            .pinTitleView()
            .setRightButtons([
                {
                    symbol: "plus.circle",
                    tapped: () => this.getAddTextView()
                }
            ])
            .setLeftButtons([
                {
                    title: $l10n("EDIT"),
                    tapped: () => {
                        new ClipsEditor(this).presentSheet()
                    }
                },
                {
                    symbol: "square.and.arrow.down.on.square",
                    tapped: async animate => {
                        animate.start()
                        try {
                            await this.readClipboard(true)
                            animate.done()
                        } catch (error) {
                            animate.cancel()
                            this.kernel.error(error)
                        }
                    }
                }
            ])

        navigationView.navigationBar
            .setBackgroundColor(UIKit.primaryViewBackgroundColor)
            .setLargeTitleDisplayMode(NavigationBar.largeTitleDisplayModeNever)
        if (this.kernel.isUseJsboxNav) {
            navigationView.navigationBar.removeTopSafeArea()
        }

        return navigationView
    }
}

module.exports = Clips
