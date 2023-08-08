const { View, UIKit, Sheet, ViewController, NavigationView, NavigationBar, Toast } = require("../libs/easy-jsbox")
const Editor = require("./components/editor")
const ClipsData = require("../dao/clips-data")
const ClipsSearch = require("./clips-search")
const ClipsEditor = require("./clips-editor")
const { ActionData, ActionEnv } = require("../action/action")
const WebDavSync = require("../dao/webdav-sync")

/**
 * @typedef {import("../dao/storage").Clip} Clip
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Clips extends ClipsData {
    listId = "clips-list"

    editModeToolBarId = this.listId + "-edit-mode-tool-bar"

    // 剪贴板列个性化设置
    #singleLine = false
    #singleLineContentHeight = -1
    tabLeftMargin = 20 // tab 左边距
    horizontalMargin = 20 // 列表边距
    verticalMargin = 14 // 列表边距
    containerMargin = 0 // list 单边边距。如果 list 未贴合屏幕左右边缘，则需要此值辅助计算文字高度
    fontSize = 16 // 字体大小
    copiedIndicatorSize = 6 // 已复制指示器（小绿点）大小
    imageContentHeight = 50
    tagHeight = this.verticalMargin + 5
    tagColor = $color("lightGray")
    menuItemActionMaxCount = 5

    tabHeight = 44
    editModeToolBarHeight = 44

    copied = $cache.get("clips.copied") ?? {}
    #textHeightCache = {}

    /**
     * @type {NavigationView}
     */
    navigationView
    viewController

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)

        this.viewController = new ViewController()
    }

    get singleLineContentHeight() {
        if (this.#singleLineContentHeight < 0) {
            this.#singleLineContentHeight = this.getTextHeight($font(this.fontSize))
        }
        return this.#singleLineContentHeight
    }

    get listSelected() {
        const selected = $(this.listId)?.ocValue()?.$indexPathsForSelectedRows()?.jsValue()
        return Array.isArray(selected) ? selected : []
    }

    get defaultMenuItems() {
        return [
            {
                inline: true,
                items: [
                    {
                        title: $l10n("TAG"),
                        symbol: "tag",
                        handler: (sender, indexPath) => {
                            const clip = this.getByIndex(indexPath)
                            $input.text({
                                placeholder: $l10n("ADD_TAG"),
                                text: clip.tag,
                                handler: text => {
                                    text = text.trim()
                                    if (text.length > 0) {
                                        this.kernel.storage.setTag(clip.uuid, text)
                                    } else {
                                        this.kernel.storage.deleteTag(clip.uuid)
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
                            const clip = this.getByIndex(indexPath)
                            $share.sheet(clip.image ? clip.imageOriginal : clip.text)
                        }
                    },
                    {
                        title: $l10n("COPY"),
                        symbol: "square.on.square",
                        handler: (sender, indexPath) => this.copy(this.getByIndex(indexPath).uuid)
                    },
                    {
                        title: $l10n("DELETE"),
                        symbol: "trash",
                        destructive: true,
                        items: [
                            {
                                title: $l10n("CONFIRM"),
                                destructive: true,
                                handler: (sender, indexPath) => {
                                    sender.delete(indexPath)
                                    this.delete(this.getByIndex(indexPath).uuid)
                                    // 重新计算列表项高度
                                    $delay(0.25, () => sender.reload())
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    }

    get menu() {
        const action = action => {
            const handler = this.kernel.actionManager.getActionHandler(action.type, action.dir)
            action.handler = (sender, indexPath) => {
                const item = this.getByIndex(indexPath)
                const actionData = new ActionData({
                    env: ActionEnv.clipboard,
                    text: item.text,
                    section: item.section,
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

        return { items: [actionButtons, ...this.defaultMenuItems] }
    }

    getByIndex(index) {
        if (typeof index === "object") {
            index = index.row
        }
        return this.clips[index]
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
        if (UIKit.isTaio) return
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
                    }
                    if (list) list.endRefreshing()
                } else if (args.status === WebDavSync.status.syncing && args.animate) {
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

        if (UIKit.isTaio) return

        // check url scheme
        $delay(0.5, () => {
            if ($context.query["copy"]) {
                const uuid = $context.query["copy"]
                this.setCopied(uuid)
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

        const view = $(this.listId).ocValue()
        view.$setDelegate(this.listViewDelegate())
    }

    updateList(reload = false) {
        if (reload) {
            this.setNeedReload()
        }
        $(this.listId).data = this.clips.map(data => this.lineData(data, this.copied.uuid === data.uuid))
        this.updateListBackground()
    }

    updateListBackground() {
        if (this.clips.length > 0) {
            $(this.listId).ocValue().$setBackgroundView(undefined)
        } else {
            $(this.listId).ocValue().$setBackgroundView($ui.create(this.getEmptyBackground()))
        }
    }

    updateCopied(copied = null) {
        const oldCopied = this.copied?.uuid
        $delay(0.3, () => {
            try {
                const listView = $(this.listId)
                const oldCell = listView.cell($indexPath(0, this.getIndexByUUID(oldCopied)))
                if (oldCell) {
                    oldCell.get("copied").hidden = true
                }
                if (copied) {
                    listView.cell($indexPath(0, this.getIndexByUUID(copied.uuid))).get("copied").hidden = false
                }
            } catch (error) {
                this.kernel.error("set copied error")
                this.kernel.error(error)
            }
        })

        if (!copied) {
            this.copied = {}
        } else {
            Object.assign(this.copied, copied)
        }
        this.kernel.print(`this.copied: ${JSON.stringify(this.copied, null, 2)}`)
        $cache.set("clips.copied", this.copied)
    }

    /**
     * 将元素标记为 copied
     * @param {string} uuid
     * @param {boolean} isUpdateIndicator
     * @returns
     */
    setCopied(uuid) {
        if (!uuid || (uuid === this.copied.uuid && this.tabIndex === this.copied?.tabIndex)) {
            return
        }

        let copied = {}
        if (this.copied.uuid !== uuid) {
            copied = this.getClip(uuid) ?? {}
        }
        copied.tabIndex = this.tabIndex

        this.updateCopied(copied)
        this.setClipboardText(copied.text)
    }

    clearCopied() {
        const listView = $(this.listId)
        const oldCell = listView.cell($indexPath(0, this.getIndexByUUID(this.copied.uuid)))
        if (oldCell) {
            oldCell.get("copied").hidden = true
        }
        this.updateCopied(null)
    }

    async readClipboard(manual = false) {
        if (manual || this.kernel.setting.get("clipboard.autoSave")) {
            this.kernel.print("read clipboard")

            // 剪切板没有变化则直接退出
            if (!manual && !this.isChanged) {
                return
            }

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

            const text = $clipboard.text
            if (!text || text === "") {
                this.clearCopied()
                return
            }
            // 判断 copied 是否和剪切板一致
            // 开发模式下，清空数据后该值仍然存在，可能造成：无法保存相同的数据
            if (this.getClip(this.copied?.uuid)?.text === text) {
                if (manual) {
                    $ui.toast($l10n("CLIPBOARD_NO_CHANGE"))
                }
                return
            }
            if (this.exists(text)) {
                const res = this.kernel.storage.getByMD5($text.MD5(text))
                this.switchTab(this.tabItemsMap[res.section], true)
                this.setCopied(res.uuid)
            } else {
                this.switchTab(1, true) // clips
                const data = this.add(text)
                this.setCopied(data.uuid)
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
            return data
        } catch (error) {
            $ui.alert(error)
        }
    }

    delete(uuid) {
        try {
            super.deleteItem(uuid)
            // 删除剪切板信息
            if (this.copied.uuid === uuid) {
                this.updateCopied(null)
                $clipboard.clear()
            }

            this.updateListBackground()
        } catch (error) {
            $ui.alert(error)
        }
    }

    update(text, uuid) {
        try {
            super.updateItem(text, uuid)
            // 更新列表
            this.updateList()
            if (uuid === this.copied.uuid) {
                this.setClipboardText(text)
            }

            return true
        } catch (error) {
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
            //this.updateList()
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
        } catch (error) {
            $ui.alert(error)
        }
    }

    favorite(index) {
        const clip = this.getByIndex(index)

        if (clip?.section === "favorite") {
            this.move(index, 0)
            return
        }

        const res = this.kernel.storage.getByUUID(clip.uuid)
        if (res?.section === "favorite") {
            Toast.warning("Already exists")
            return
        }

        try {
            super.favoriteItem(clip.uuid)
            // UI 操作
            $(this.listId).delete(index)
        } catch (error) {
            $ui.alert(error)
        }
    }

    /**
     * 复制
     * @param {string} uuid 被复制的 uuid
     */
    copy(uuid) {
        const clip = this.getClip(uuid)
        if (clip.image) {
            $clipboard.image = clip.imageOriginal
        } else {
            this.setCopied(uuid)
        }
        const isMoveToTop = this.tabIndex !== 0
        // 将被复制的行移动到最前端
        if (isMoveToTop) this.move(this.getIndexByUUID(uuid), 0)
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

    switchTab(index, manual = false) {
        this.tabIndex = index
        this.updateList()

        if (manual) {
            $(this.listId + "-tab").index = this.tabIndex
        }

        this.switchEditMode(false)
    }

    updateEditModeToolBar() {
        const isEmpty = this.listSelected.length === 0

        const editButton = $(this.editModeToolBarId + "-select-button")
        const deleteButton = $(this.editModeToolBarId + "-delete-button")
        const reorderButton = $(this.editModeToolBarId + "-reorder-button")

        editButton.title = isEmpty ? $l10n("SELECT_ALL") : $l10n("DESELECT_ALL")
        deleteButton.hidden = isEmpty
        reorderButton.hidden = !isEmpty
    }

    toggleAllSelected(deselecteAll = false, updateEditModeToolBar = true) {
        const length = this.clips.length
        const listViewOC = $(this.listId).ocValue()
        if (deselecteAll || this.listSelected.length !== 0) {
            for (let i = 0; i < length; i++) {
                const indexPath = $indexPath(0, i).ocValue()
                listViewOC.$deselectRowAtIndexPath_animated(indexPath, false)
            }
        } else if (this.listSelected.length === 0) {
            for (let i = 0; i < length; i++) {
                const indexPath = $indexPath(0, i).ocValue()
                listViewOC.$selectRowAtIndexPath_animated_scrollPosition(indexPath, false, 0)
            }
        }

        if (updateEditModeToolBar && listViewOC.$isEditing()) {
            this.updateEditModeToolBar()
        }
    }

    toggleReorder() {
        this.switchEditMode(false)
        new ClipsEditor(this).presentSheet()
    }

    deleteSelected() {
        UIKit.deleteConfirm($l10n("DELETE_CONFIRM_MSG"), () => {
            const selected = this.listSelected.sort((a, b) => {
                return a.row < b.row
            }) // 倒序排序
            const uuids = selected.map(indexPath => {
                return this.getByIndex(indexPath).uuid
            })
            // 关闭编辑模式
            this.switchEditMode(false)
            uuids.forEach(uuid => this.delete(uuid))
            selected.forEach(item => {
                $(this.listId).delete(item)
            })
        })
    }

    getListEditModeToolBarView() {
        const blurBox = UIKit.blurBox({ id: this.editModeToolBarId }, [
            UIKit.separatorLine(),
            {
                type: "view",
                views: [
                    {
                        type: "button",
                        props: {
                            id: this.editModeToolBarId + "-select-button",
                            title: $l10n("SELECT_ALL"),
                            titleColor: $color("tint"),
                            bgcolor: $color("clear")
                        },
                        layout: (make, view) => {
                            make.left.inset(this.horizontalMargin)
                            make.centerY.equalTo(view.super)
                        },
                        events: { tapped: () => this.toggleAllSelected() }
                    },
                    {
                        type: "button",
                        props: {
                            id: this.editModeToolBarId + "-reorder-button",
                            title: $l10n("SORT"),
                            titleColor: $color("tint"),
                            bgcolor: $color("clear")
                        },
                        layout: (make, view) => {
                            make.right.inset(this.horizontalMargin)
                            make.centerY.equalTo(view.super)
                        },
                        events: { tapped: () => this.toggleReorder() }
                    },
                    {
                        type: "button",
                        props: {
                            id: this.editModeToolBarId + "-delete-button",
                            symbol: "trash",
                            hidden: true,
                            tintColor: $color("red"),
                            bgcolor: $color("clear")
                        },
                        layout: (make, view) => {
                            make.height.equalTo(view.super)
                            make.width.equalTo(this.horizontalMargin * 2)
                            make.right.inset(this.horizontalMargin / 2)
                            make.centerY.equalTo(view.super)
                        },
                        events: { tapped: () => this.deleteSelected() }
                    }
                ],
                layout: (make, view) => {
                    make.left.right.top.equalTo(view.super)
                    make.bottom.equalTo(view.super.safeAreaBottom)
                }
            }
        ])
        return blurBox
    }

    /**
     * @param {boolean} mode
     */
    switchEditMode(mode) {
        const listView = $(this.listId)
        const listViewOC = $(this.listId).ocValue()
        let status = mode !== undefined ? mode : !listViewOC.$isEditing()

        if (status === listViewOC.$isEditing()) {
            return
        }

        listView.setEditing(status)
        this.navigationView.navigationBarItems.getButtons().forEach(button => {
            if (button.id === this.listId + "-navbtn-edit") {
                button.setTitle(status ? $l10n("DONE") : $l10n("EDIT"))
            } else {
                status ? button.hide() : button.show()
            }
        })
        if (!status) {
            // 非强制关闭编辑模式
            $(this.editModeToolBarId).remove()
        } else {
            const toolBar = $ui.create(this.getListEditModeToolBarView())
            $ui.window.add(toolBar)
            // 进入编辑模式
            $(this.editModeToolBarId).layout((make, view) => {
                make.left.right.bottom.equalTo(view.super)
                make.top.equalTo(view.super.safeAreaBottom).offset(-this.editModeToolBarHeight)
            })
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

    /**
     * @param {Clip} clip
     * @param {boolean} indicator
     * @returns
     */
    lineData(clip, indicator = false) {
        const image = { hidden: true }
        const content = { text: "" }
        const tag = { hidden: !clip?.hasTag }

        if (clip.image) {
            image.src = clip.imagePath.preview
            image.hidden = false
        } else {
            if (clip.textStyledText) {
                content.styledText = clip.textStyledText
            } else {
                content.text = clip.text
            }
            if (clip.tagStyledText) {
                tag.styledText = clip.tagStyledText
            } else {
                tag.text = clip.tag
            }
        }

        return {
            copied: { hidden: !indicator },
            image,
            tag,
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
                                make.top.equalTo(this.verticalMargin)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "tag",
                                lines: 1,
                                color: this.tagColor,
                                autoFontSize: true,
                                align: $align.leading
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

    getEmptyBackground() {
        return {
            type: "label",
            props: {
                color: $color("secondaryText"),
                hidden: this.clips.length > 0,
                text: $l10n("NONE"),
                align: $align.center
            },
            events: {
                ready: sender => {
                    sender.layout((make, view) => {
                        make.top.equalTo(this.tabHeight)
                        make.left.right.bottom.equalTo(view.super)
                    })
                }
            }
        }
    }

    listViewDelegate() {
        const createUIMenu = ({ title, image, actions, inline = false, destructive = false } = {}) => {
            let options
            if (inline) {
                options = options | (1 << 0)
            }
            if (destructive) {
                options = options | (1 << 1)
            }
            return $objc("UIMenu").$menuWithTitle_image_identifier_options_children(
                title ?? "",
                image,
                null,
                options ?? 0,
                actions
            )
        }
        const createUIAction = ({ title, image, handler, destructive = false } = {}) => {
            const action = $objc("UIAction").$actionWithTitle_image_identifier_handler(
                title,
                image,
                null,
                $block("void, UIAction *", action => {
                    handler(action)
                })
            )

            if (destructive) {
                action.$setAttributes(1 << 1)
            }

            return action
        }
        const createUIContextualAction = ({
            title,
            handler,
            color,
            image,
            destructive = false,
            autoCloseEditing = true
        } = {}) => {
            const action = $objc("UIContextualAction").$contextualActionWithStyle_title_handler(
                destructive ? 1 : 0,
                title,
                $block("void, UIContextualAction *, UIView *, void", (action, sourceView, completionHandler) => {
                    handler(action, sourceView, completionHandler)
                    if (autoCloseEditing) {
                        $(this.listId).setEditing(false)
                    }
                })
            )
            if (color) {
                action.$setBackgroundColor(color)
            }
            if (image) {
                action.$setImage(image)
            }

            return action
        }
        const delegate = {
            type: "UITableViewDelegate",
            events: {
                "tableView:shouldBeginMultipleSelectionInteractionAtIndexPath:": () => {
                    this.switchEditMode(true)
                    return true
                },
                "tableView:didBeginMultipleSelectionInteractionAtIndexPath:": (sender, indexPath) => {
                    this.switchEditMode(true)
                },
                "tableView:didSelectRowAtIndexPath:": (sender, indexPath) => {
                    if (sender.$isEditing()) {
                        this.updateEditModeToolBar()
                    } else {
                        const clip = this.getByIndex(indexPath.jsValue())
                        if (clip.image) {
                            Sheet.quickLookImage(clip.imageOriginal)
                        } else {
                            this.edit(clip.text, text => {
                                if (clip.md5 !== $text.MD5(text)) this.update(text, clip.uuid)
                            })
                        }
                    }
                },
                "tableView:didDeselectRowAtIndexPath:": (sender, indexPath) => {
                    if (sender.$isEditing()) {
                        this.updateEditModeToolBar()
                    }
                },
                "tableView:contextMenuConfigurationForRowAtIndexPath:point:": (sender, indexPath) => {
                    // 编辑模式不显示菜单
                    if (sender.$isEditing()) return

                    const generateUIMenu = menu => {
                        const actions = []
                        menu.items.forEach(item => {
                            if (item.items) {
                                actions.push(generateUIMenu(item))
                            } else {
                                actions.push(
                                    createUIAction({
                                        title: item.title,
                                        image: item.symbol,
                                        handler: () => {
                                            item.handler(sender.jsValue(), indexPath.jsValue())
                                        },
                                        destructive: item.destructive
                                    })
                                )
                            }
                        })

                        return createUIMenu({
                            title: menu.title,
                            image: menu.symbol,
                            actions: actions,
                            inline: menu.inline,
                            destructive: menu.destructive
                        })
                    }

                    return $objc(
                        "UIContextMenuConfiguration"
                    ).$configurationWithIdentifier_previewProvider_actionProvider(
                        null,
                        null,
                        $block("UIMenu *, NSArray *", () => generateUIMenu(this.menu))
                    )
                },
                "tableView:leadingSwipeActionsConfigurationForRowAtIndexPath:": (sender, indexPath) => {
                    sender = sender.jsValue()
                    indexPath = indexPath.jsValue()
                    return $objc("UISwipeActionsConfiguration").$configurationWithActions([
                        createUIContextualAction({
                            title: $l10n("COPY"),
                            color: $color("systemLink"),
                            handler: (action, sourceView, completionHandler) => {
                                this.copy(this.getByIndex(indexPath).uuid)
                            }
                        })
                    ])
                },
                "tableView:trailingSwipeActionsConfigurationForRowAtIndexPath:": (sender, indexPath) => {
                    sender = sender.jsValue()
                    indexPath = indexPath.jsValue()
                    return $objc("UISwipeActionsConfiguration").$configurationWithActions([
                        createUIContextualAction({
                            destructive: true,
                            autoCloseEditing: false,
                            title: $l10n("DELETE"),
                            handler: (action, sourceView, completionHandler) => {
                                this.delete(this.getByIndex(indexPath).uuid)
                                sender.delete(indexPath)
                                // 重新计算列表项高度
                                $delay(0.25, () => sender.reload())
                            }
                        }),
                        createUIContextualAction({
                            title: $l10n("FAVORITE"),
                            color: $color("orange"),
                            autoCloseEditing: false,
                            handler: (action, sourceView, completionHandler) => {
                                this.favorite(indexPath.row)
                            }
                        })
                    ])
                },
                "tableView:heightForRowAtIndexPath:": (sender, indexPath) => {
                    sender = sender.jsValue()
                    indexPath = indexPath.jsValue()
                    const clip = this.getByIndex(indexPath)
                    const tagHeight = clip?.hasTag ? this.tagHeight : this.verticalMargin
                    const itemHeight = clip.image ? this.imageContentHeight : this.getContentHeight(clip.text)
                    return this.verticalMargin + itemHeight + tagHeight
                }
            }
        }
        return $delegate(delegate)
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
                data,
                allowsMultipleSelectionDuringEditing: true,
                template: this.listTemplate(),
                backgroundView: $ui.create(this.getEmptyBackground())
            },
            layout: (make, view) => {
                if (view.prev) {
                    make.top.equalTo(view.prev.bottom)
                } else {
                    make.top.equalTo(view.super)
                }
                make.left.right.bottom.equalTo(view.super)
            },
            events: {
                ready: () => this.listReady(),
                pulled: sender => {
                    this.updateList(true)
                    this.kernel.storage.sync()
                    if (!this.kernel.setting.get("webdav.status")) {
                        $delay(0.5, () => sender.endRefreshing())
                    }
                }
            }
        }

        return listView
    }

    getNavigationView() {
        const search = new ClipsSearch(this.kernel)
        search.setCallback(obj => {
            const sheet = new Sheet()
            const getView = obj => {
                const { keyword, result, isTagKeyword } = obj
                const view = this.getListView(
                    this.listId + "-search-result",
                    result.map(clip => {
                        const targetText = isTagKeyword ? clip.tag : clip.text
                        let styles = []
                        keyword.forEach(kw => {
                            let pos = targetText.indexOf(kw)
                            while (pos > -1) {
                                styles.push({
                                    range: $range(pos, kw.length),
                                    color: $color("red")
                                })
                                pos = targetText.indexOf(kw, pos + 1)
                            }
                        })
                        clip.styledText = {}
                        if (isTagKeyword) {
                            clip.tagStyledText = {
                                color: this.tagColor,
                                text: targetText,
                                styles
                            }
                        } else {
                            clip.textStyledText = {
                                text: targetText,
                                styles
                            }
                        }
                        return this.lineData(clip, false)
                    })
                )
                delete view.events.pulled
                view.events.rowHeight = (sender, indexPath) => {
                    const clip = result[indexPath.row]
                    const tagHeight = clip?.hasTag ? this.tagHeight : this.verticalMargin
                    const itemHeight = clip.image ? this.imageContentHeight : this.getContentHeight(clip.text)
                    return this.verticalMargin + itemHeight + tagHeight
                }
                view.events.didSelect = (sender, indexPath) => {
                    const clip = result[indexPath.row]
                    if (clip.image) {
                        Sheet.quickLookImage(clip.imageOriginal)
                    } else {
                        sheet.dismiss()
                        this.edit(clip.text, text => {
                            if (clip.md5 !== $text.MD5(text)) this.update(text, clip.uuid)
                        })
                    }
                }
                return view
            }
            sheet
                .setView(getView(obj))
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
            make.left.right.equalTo(view.super)
            make.height.equalTo(this.tabHeight)
            if (this.kernel.isUseJsboxNav && UIKit.isTaio) {
                make.top.equalTo(view.super).offset(UIKit.PageSheetNavigationBarNormalHeight)
            } else {
                make.top.equalTo(view.super)
            }
        }

        const view = View.createFromViews([menuView, this.getListView(), search.getSearchHistoryView()])

        this.navigationView = new NavigationView().navigationBarTitle($l10n("CLIPS")).setView(view)
        this.navigationView.navigationBarItems
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
                    id: this.listId + "-navbtn-edit",
                    title: $l10n("EDIT"),
                    tapped: () => this.switchEditMode()
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

        this.navigationView.navigationBar
            .setBackgroundColor(UIKit.primaryViewBackgroundColor)
            .setLargeTitleDisplayMode(NavigationBar.largeTitleDisplayModeNever)
        if (this.kernel.isUseJsboxNav) {
            this.navigationView.navigationBar.removeTopSafeArea()
        }

        return this.navigationView
    }
}

module.exports = Clips
