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

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Clips extends ClipsData {
    listId = "clips-list"

    // 剪贴板列个性化设置
    #singleLine = false
    #singleLineHeight = -1
    tabLeftMargin = 20 // tab 左边距
    horizontalMargin = 20 // 列表边距
    verticalMargin = 20 // 列表边距
    containerMargin = 0 // list 单边边距。如果 list 未贴合屏幕左右边缘，则需要此值辅助计算文字高度
    fontSize = 16 // 字体大小
    copiedIndicatorSize = 6 // 已复制指示器（小绿点）大小
    imageContentHeight = 50
    tagFontSize = 14
    tagContainerHeight = 25
    menuItemActionMaxCount = 5

    tabHeight = 44

    copied = $cache.get("clips.copied") ?? {}
    #textHeightCache = {}

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)

        this.viewController = new ViewController()

        this.search = new ClipsSearch(this.kernel)
        this.search.setCallback(res => {
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
                    popButton: { title: $l10n("DONE"), tapped: () => this.search.dismiss() }
                })
                .init()
                .present()
        })
    }

    get singleLineHeight() {
        if (this.#singleLineHeight < 0) {
            this.#singleLineHeight = $text.sizeThatFits({
                text: "A",
                width: this.fontSize,
                font: $font(this.fontSize)
            }).height
        }
        return this.#singleLineHeight
    }

    setSingleLine() {
        this.#singleLine = true
        // 图片高度与文字一致
        this.imageContentHeight = this.singleLineHeight
    }

    getTextHeight(text) {
        if (!this.#textHeightCache[text]) {
            this.#textHeightCache[text] = this.#singleLine
                ? this.singleLineHeight
                : Math.min(
                      $text.sizeThatFits({
                          text: text,
                          width: UIKit.windowSize.width - (this.horizontalMargin + this.containerMargin) * 2,
                          font: $font(this.fontSize)
                      }).height,
                      this.singleLineHeight * 2
                  )
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
                this.setCopied(uuid, this.getRowByUUID(uuid))
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
        Object.assign(this.copied, copied)
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
    setCopied(uuid, row, isUpdateIndicator = true) {
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

        const oldRow = this.copied.row

        this.updateCopied(copied)

        if (isUpdateIndicator) {
            $delay(0.3, () => {
                const listView = $(this.listId)
                listView.cell($indexPath(0, oldRow)).get("copied").hidden = true
                listView.cell($indexPath(0, row)).get("copied").hidden = false
            })
        }
    }

    readClipboard(manual = false) {
        if (manual || this.kernel.setting.get("clipboard.autoSave")) {
            this.kernel.print("read clipboard")

            // 剪切板没有变化则直接退出
            if (!this.isChanged) {
                if (manual) {
                    $ui.toast($l10n("CLIPBOARD_NO_CHANGE"))
                }
                return
            }

            // 切换标签页
            this.switchTab(1, true) // clips

            // 仅手动模式下保存图片
            if ($clipboard.images?.length > 0) {
                if (manual) {
                    $clipboard.images.forEach(image => {
                        this.add(image)
                    })

                    return true
                }

                return false
            }

            const text = $clipboard.text

            if (!text || text === "") {
                return false
            }

            // 判断 copied 是否和剪切板一致
            // 开发模式下，清空数据后该值仍然存在，可能造成：无法保存相同的数据
            if (this.copied.text === text) {
                return false
            }

            const md5 = $text.MD5(text)
            if (this.savedClipboardIndex[md5]) {
                const res = this.kernel.storage.getByMD5(md5)
                this.setCopied(res.uuid, this.getRowByUUID(res.uuid))
            } else {
                const data = this.add(text)
                this.copy(text, data.uuid, 0)
            }
        }

        return false
    }

    add(item) {
        try {
            const data = super.add(item)

            // 先修改背景，让 list 显示出来
            this.updateListBackground()

            // 在列表中插入行
            $(this.listId).insert({
                indexPath: $indexPath(0, 0),
                value: this.lineData(data)
            })
            // 被复制的元素向下移动了一个单位
            if (this.copied?.tabIndex === this.tabIndex) {
                this.setCopied(this.copied.uuid, this.copied?.row + 1, false)
            }

            return data
        } catch (error) {
            $ui.alert(error)
        }
    }

    delete(row) {
        try {
            super.delete(row)
            // 删除剪切板信息
            if (this.copied.uuid === this.clips[row].uuid) {
                this.copied = {}
                $clipboard.clear()
            }

            this.updateListBackground()
        } catch (error) {
            $ui.alert(error)
        }
    }

    update(uuid, text, row) {
        if (super.update(uuid, text, row)) {
            // 更新列表
            this.updateList()
            if (uuid === this.copied.uuid) {
                this.setClipboardText(text)
                this.updateCopied({ text })
            }

            return true
        }

        return false
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
            super.move(from, to)

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
                        this.setCopied(this.copied.uuid, to)
                    } else if (
                        (this.copied.row > from && this.copied.row < to) ||
                        (this.copied.row < from && this.copied.row > to) ||
                        this.copied.row === to
                    ) {
                        // 被复制的行介于 from 和 _to 之间或等于 _to
                        // 从上往下移动则 -1 否则 +1
                        this.setCopied(this.copied.uuid, from < to ? this.copied.row - 1 : this.copied.row + 1)
                    }
                }
            }
        } catch (error) {
            $ui.alert(error)
        }
    }

    favorite(row) {
        let item = this.clips[row]

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
            super.favorite(row)
            // UI 操作
            $(this.listId).delete($indexPath(0, row))
        } catch (error) {
            $ui.alert(error)
        }
    }

    /**
     * 复制
     * @param {*} text
     * @param {*} uuid
     * @param {number} index 被复制的行的索引
     */
    copy(text, uuid, row) {
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
        this.setCopied(uuid, isMoveToTop ? 0 : row)
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
                        handler: (sender, indexPath) => {
                            const item = this.clips[indexPath.row]
                            this.copy(item.text, item.uuid, indexPath.row)
                        }
                    },
                    {
                        title: $l10n("DELETE"),
                        symbol: "trash",
                        destructive: true,
                        handler: (sender, indexPath) => {
                            this.kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), () => {
                                this.delete(indexPath.row)
                                sender.delete(indexPath)
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

    lineData(data, indicator = false) {
        const image = { hidden: true }
        const content = { text: "" }

        const path = this.kernel.storage.keyToPath(data.text)
        if (path) {
            image.src = path.preview
            image.hidden = false
        } else {
            content.text = data.text
        }

        return {
            copied: { hidden: !indicator },
            image,
            tag: { text: data.tag },
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
                                if (this.#singleLine) {
                                    make.top.inset(this.imageContentHeight / 2)
                                } else {
                                    make.top.inset(this.verticalMargin)
                                }
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: "image",
                                hidden: true
                            },
                            layout: $layout.fill
                        }
                    ],
                    layout: $layout.fill
                },
                {
                    type: "label",
                    props: {
                        id: "tag",
                        color: $color("systemGray2"),
                        font: $font(this.tagFontSize)
                    },
                    layout: (make, view) => {
                        make.bottom.width.equalTo(view.super)
                        make.left.inset(this.horizontalMargin)
                        make.height.equalTo(this.tagContainerHeight)
                    }
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
                        handler: (sender, indexPath) => {
                            const item = this.clips[indexPath.row]
                            this.copy(item.text, item.uuid, indexPath.row)
                        }
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
                    const object = sender.object(indexPath)
                    const tagHeight = object.tag.text ? this.tagContainerHeight : this.verticalMargin
                    const itemHeight = this.kernel.storage.isImage(object.content.text)
                        ? this.imageContentHeight
                        : this.getTextHeight(object.content.text)
                    return itemHeight + this.verticalMargin + tagHeight
                },
                didSelect: (sender, indexPath, data) => {
                    const item = this.clips[indexPath.row]
                    const text = item.text
                    const path = this.kernel.storage.keyToPath(text)
                    if (path && this.kernel.fileStorage.exists(path.original)) {
                        // TODO: preview image
                        $quicklook.open({
                            image: this.kernel.fileStorage.readSync(path.original)?.image
                        })
                    } else {
                        this.edit(item.text, text => {
                            if (item.md5 !== $text.MD5(text)) this.update(item.uuid, text, indexPath.row)
                        })
                    }
                },
                pulled: sender => {
                    this.updateList(true)
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
        view.views.push(this.search.getSearchHistoryView())

        const navigationView = new NavigationView().navigationBarTitle($l10n("CLIPS")).setView(view)
        navigationView.navigationBarItems
            .setTitleView(this.search.getSearchBarView())
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
                    tapped: animate => {
                        animate.start()
                        this.readClipboard(true)
                        animate.done()
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
