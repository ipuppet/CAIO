const {
    View,
    Kernel,
    UIKit,
    Sheet,
    ViewController,
    NavigationView,
    NavigationBar,
    SearchBar
} = require("../libs/easy-jsbox")
const Editor = require("./components/editor")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Clipboard {
    copied = $cache.get("clipboard.copied") ?? {}

    reorder = {}
    #savedClipboard = []
    // 键为 md5，值为 1 或 undefined 用来判断某个 md5 是否已经存在
    savedClipboardIndex = {}

    tabHeight = 44
    tabItems = [$l10n("PIN"), $l10n("CLIPBOARD")]
    tabItemsIndex = ["pin", "clipboard"]

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
        this.listId = "clipboard-list"
        // 剪贴板列个性化设置
        this.edges = 20 // 列表边距
        this.fontSize = 16 // 字体大小
        this.copiedIndicatorSize = 7 // 已复制指示器（小绿点）大小
        this.imageContentHeight = 50

        this.viewController = new ViewController()
    }

    set tabIndex(index) {
        $cache.set("caio.main.tab.index", index)
    }

    get tabIndex() {
        return $cache.get("caio.main.tab.index") ?? 0
    }

    get folder() {
        return this.tabItemsIndex[this.tabIndex]
    }

    get savedClipboard() {
        if (this.#savedClipboard.length === 0) {
            this.loadSavedClipboard()
        }
        return this.#savedClipboard
    }

    set savedClipboard(savedClipboard) {
        this.#savedClipboard = savedClipboard.map(item => {
            return new Proxy(item, {
                set: (obj, prop, value) => {
                    // 更新空列表背景
                    this.updateListBackground()

                    this.kernel.print(
                        `data changed at index ${prop}\n${obj[prop]?.content?.text}\n↓\n${value?.content?.text}`
                    )

                    return Reflect.set(obj, prop, value)
                }
            })
        })
    }

    get clipboard() {
        return this.savedClipboard[this.tabIndex]
    }

    getSingleLineHeight() {
        return $text.sizeThatFits({
            text: "A",
            width: this.fontSize,
            font: $font(this.fontSize)
        }).height
    }

    setSingleLine() {
        // 图片高度与文字一致
        this.imageContentHeight = this.getSingleLineHeight()
    }

    setClipboardText(text) {
        if (this.kernel.setting.get("clipboard.universal")) {
            $clipboard.text = text
        } else {
            $clipboard.setTextLocalOnly(text)
        }
    }

    appListen() {
        if (Kernel.isTaio) return
        $app.listen({
            resume: () => {
                // 在应用恢复响应后调用
                this.loadSavedClipboard()
                this.updateList()
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
                this.setCopied(uuid, this.getIndexPathRowByUUID(uuid))
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

    updateList() {
        // 直接重置数据，解决小绿点滚动到屏幕外后消失问题
        $(this.listId).data = this.clipboard
        this.updateListBackground()
    }

    updateListBackground() {
        $(this.listId + "-empty-list-background").hidden = this.clipboard.length > 0
    }

    /**
     * 将元素标记为 copied
     * @param {string|undefined} uuid 若为 undefined 则清空剪切板
     * @param {$indexPath} row
     * @param {boolean} isUpdateIndicator
     * @returns
     */
    setCopied(uuid, row, isUpdateIndicator = true) {
        if (uuid === this.copied.uuid && this.tabIndex === this.copied?.tabIndex && row === this.copied?.row) {
            return
        }

        if (isUpdateIndicator) {
            if (this.copied.tabIndex !== undefined) {
                try {
                    this.savedClipboard[this.copied.tabIndex][this.copied.row].copied.hidden = true
                } catch {
                    // 清空剪切板
                    uuid = undefined
                }
            }
            if (uuid) {
                this.clipboard[row].copied.hidden = false
            }
            $delay(0.3, () => this.updateList())
        }
        if (uuid) {
            if (this.copied.uuid !== uuid) {
                this.copied = Object.assign(this.copied, this.kernel.storage.getByUUID(uuid) ?? {})
            }
            this.copied.tabIndex = this.tabIndex
            this.copied.row = row
        } else {
            this.copied = {}
            $clipboard.clear()
        }
        $cache.set("clipboard.copied", this.copied)
    }

    /**
     * 警告！该方法可能消耗大量资源
     * @param {string} uuid
     */
    getIndexPathRowByUUID(uuid) {
        const data = $(this.listId).data
        for (let i = 0; i < data.length; i++) {
            let length = data[i].length
            for (let index = 0; index < length; index++) {
                if (data[i][index].content.info.uuid === uuid) return index
            }
        }

        return false
    }

    readClipboard(manual = false) {
        if (manual || this.kernel.setting.get("clipboard.autoSave")) {
            this.kernel.print("read clipboard")

            // 仅手动模式下保存图片
            if (manual && $clipboard.images?.length > 0) {
                $clipboard.images.forEach(image => {
                    this.add(image)
                })

                return true
            }

            const text = $clipboard.text
            if (!text || text === "") {
                // 删除剪切板信息
                this.setCopied()
                return false
            }

            $clipboard.text = text // 防止重复弹窗提示从其他 App 读取剪切板

            // 判断 copied 是否和剪切板一致
            if (this.copied.text === text) {
                return false
            }

            const md5 = $text.MD5(text)
            if (this.savedClipboardIndex[md5]) {
                const res = this.kernel.storage.getByMD5(md5)
                this.setCopied(res.uuid, this.getIndexPathRowByUUID(res.uuid))
            } else {
                const data = this.add(text)
                this.copy(text, data.uuid, 0)
            }
        }

        return false
    }

    add(item, uiUpdate) {
        // 元数据
        const data = {
            uuid: $text.uuid,
            text: item,
            md5: null,
            image: null,
            prev: null,
            next: this.clipboard[0] ? this.clipboard[0].content.info.uuid : null
        }
        if (typeof item === "string") {
            if (item.trim() === "") return
            data.md5 = $text.MD5(item)
        } else if (typeof item === "object") {
            data.text = ""
            data.image = item
        } else {
            return
        }

        try {
            // 写入数据库
            this.kernel.storage.beginTransaction()
            this.kernel.storage.insert(this.folder, data)
            if (data.next) {
                // 更改指针
                this.clipboard[0].content.info.prev = data.uuid
                this.kernel.storage.update(this.folder, this.clipboard[0].content.info)
            }
            this.kernel.storage.commit()

            // 格式化数据
            const lineData = this.lineData(data)

            // 保存到内存中
            this.clipboard.unshift(lineData)
            this.savedClipboardIndex[$text.MD5(data.text)] = 1

            if (typeof uiUpdate === "function") {
                uiUpdate(data)
            } else {
                // 在列表中插入行
                $(this.listId).insert({
                    indexPath: $indexPath(0, 0),
                    value: lineData
                })
                // 被复制的元素向下移动了一个单位
                if (this.copied?.tabIndex === this.tabIndex) {
                    this.setCopied(this.copied.uuid, this.copied?.row + 1, false)
                }
                return data
            }
        } catch (error) {
            this.kernel.error(error)
            this.kernel.storage.rollback()
            $ui.alert(error)
        }
    }

    delete(uuid, row) {
        const folder = this.folder

        try {
            // 删除数据库中的值
            this.kernel.storage.beginTransaction()
            this.kernel.storage.delete(folder, uuid)
            // 更改指针
            if (this.clipboard[row - 1]) {
                const prevItem = {
                    uuid: this.clipboard[row - 1].content.info.uuid,
                    text: this.clipboard[row - 1].content.info.text,
                    prev: this.clipboard[row - 1].content.info.prev,
                    next: this.clipboard[row].content.info.next // next 指向被删除元素的 next
                }
                this.kernel.storage.update(folder, prevItem)
                this.clipboard[row - 1] = this.lineData(prevItem)
            }
            if (this.clipboard[row + 1]) {
                const nextItem = {
                    uuid: this.clipboard[row + 1].content.info.uuid,
                    text: this.clipboard[row + 1].content.info.text,
                    prev: this.clipboard[row].content.info.prev, // prev 指向被删除元素的 prev
                    next: this.clipboard[row + 1].content.info.next
                }
                this.kernel.storage.update(folder, nextItem)
                this.clipboard[row + 1] = this.lineData(nextItem)
            }
            this.kernel.storage.commit()

            // update index
            delete this.savedClipboardIndex[this.clipboard[row].content.info.md5]
            // 删除内存中的值
            this.clipboard.splice(row, 1)

            // 删除列表中的行
            if (this.copied.uuid === uuid) {
                // 删除剪切板信息
                this.setCopied()
            }
        } catch (error) {
            this.kernel.error(error)
            this.kernel.storage.rollback()
            $ui.alert(error)
        }
    }

    update(uuid, text, row) {
        const info = $(this.listId).cell($indexPath(this.tabIndex, row)).get("content").info
        const newMD5 = $text.MD5(text)

        // 更新索引
        delete this.savedClipboardIndex[info.md5]
        this.savedClipboardIndex[newMD5] = 1

        // 更新内存数据
        const lineData = this.lineData(
            Object.assign(info, {
                text,
                md5: newMD5
            }),
            info.uuid === this.copied.uuid
        )
        this.clipboard[row] = lineData

        // 更新列表
        this.updateList()
        if (uuid === this.copied.uuid) {
            this.setClipboardText(text)
        }

        try {
            this.kernel.storage.updateText(this.folder, uuid, text)
            return true
        } catch (error) {
            this.kernel.error(error)
            return false
        }
    }

    /**
     * 将from位置的元素移动到to位置
     * @param {number} from
     * @param {number} to
     * @param {number} section
     * @param {boolean} copiedIndex
     */
    move(from, to, copiedIndex = true) {
        if (from === to) return
        if (from < to) to++ // 若向下移动则 to 增加 1，因为代码为移动到 to 位置的上面

        const folder = this.folder

        if (!this.clipboard[to])
            this.clipboard[to] = this.lineData({
                uuid: null,
                text: "",
                next: null,
                prev: this.clipboard[to - 1].content.info.uuid
            })

        try {
            this.kernel.storage.beginTransaction() // 开启事务
            const oldFromItem = {
                uuid: this.clipboard[from].content.info.uuid,
                text: this.clipboard[from].content.info.text
            }
            const oldToItem = {
                uuid: this.clipboard[to].content.info.uuid,
                text: this.clipboard[to].content.info.text
            }
            {
                // 删除元素
                if (this.clipboard[from - 1]) {
                    const fromPrevItem = {
                        // from 位置的上一个元素
                        uuid: this.clipboard[from - 1].content.info.uuid,
                        text: this.clipboard[from - 1].content.info.text,
                        prev: this.clipboard[from - 1].content.info.prev,
                        next: this.clipboard[from].content.info.next
                    }
                    this.kernel.storage.update(folder, fromPrevItem)
                    this.clipboard[from - 1] = this.lineData(fromPrevItem)
                }
                if (this.clipboard[from + 1]) {
                    const fromNextItem = {
                        // from 位置的下一个元素
                        uuid: this.clipboard[from + 1].content.info.uuid,
                        text: this.clipboard[from + 1].content.info.text,
                        prev: this.clipboard[from].content.info.prev,
                        next: this.clipboard[from + 1].content.info.next
                    }
                    this.kernel.storage.update(folder, fromNextItem)
                    this.clipboard[from + 1] = this.lineData(fromNextItem)
                }
            }
            {
                // 在 to 上方插入元素
                if (this.clipboard[to - 1]) {
                    const toPrevItem = {
                        // 原来 to 位置的上一个元素
                        uuid: this.clipboard[to - 1].content.info.uuid,
                        text: this.clipboard[to - 1].content.info.text,
                        prev: this.clipboard[to - 1].content.info.prev,
                        next: oldFromItem.uuid // 指向即将被移动元素的uuid
                    }
                    this.kernel.storage.update(folder, toPrevItem)
                    this.clipboard[to - 1] = this.lineData(toPrevItem)
                }
                const toItem = {
                    // 原来 to 位置的元素
                    uuid: oldToItem.uuid,
                    text: oldToItem.text,
                    prev: oldFromItem.uuid, // 指向即将被移动的元素
                    next: this.clipboard[to].content.info.next // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                }
                this.kernel.storage.update(folder, toItem)
                const fromItem = {
                    // 被移动元素
                    uuid: oldFromItem.uuid,
                    text: oldFromItem.text,
                    prev: this.clipboard[to].content.info.prev, // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                    next: oldToItem.uuid
                }
                this.kernel.storage.update(folder, fromItem)
                // 修改内存中的值
                this.clipboard[to] = this.lineData(toItem)
                this.clipboard[from] = this.lineData(fromItem)
            }
            {
                // 移动位置
                this.clipboard.splice(to, 0, this.clipboard[from])
                this.clipboard.splice(from > to ? from + 1 : from, 1)
                this.kernel.storage.commit() // 提交事务
                // 去掉补位元素
                if (this.clipboard[to].content.info.uuid === null) {
                    this.clipboard.splice(to, 1)
                }
            }
            {
                // 操作 UI
                // 去除偏移
                const _to = from < to ? to - 1 : to
                const listView = $(this.listId)
                // 移动列表
                if (from < _to) {
                    // 从上往下移动
                    listView.insert({
                        indexPath: $indexPath(0, to),
                        value: this.clipboard[_to]
                    })
                    listView.delete($indexPath(0, from))
                } else {
                    // 从下往上移动
                    listView.delete($indexPath(0, from))
                    listView.insert({
                        indexPath: $indexPath(0, to),
                        value: this.clipboard[to]
                    })
                }
                // 修正指示器
                if (copiedIndex && this.copied.tabIndex !== undefined) {
                    if (this.copied.tabIndex === this.tabIndex) {
                        if (this.copied.row === from) {
                            // 被移动的行是被复制的行
                            this.setCopied(this.copied.uuid, _to)
                        } else if (
                            (this.copied.row > from && this.copied.row < _to) ||
                            (this.copied.row < from && this.copied.row > _to) ||
                            this.copied.row === _to
                        ) {
                            // 被复制的行介于 from 和 _to 之间或等于 _to
                            // 从上往下移动则 -1 否则 +1
                            this.setCopied(this.copied.uuid, from < _to ? this.copied.row - 1 : this.copied.row + 1)
                        }
                    }
                }
            }
        } catch (error) {
            this.kernel.error(error)
            this.kernel.storage.rollback()
            $ui.alert(error)
        }
    }

    pin(item, row) {
        if (item?.section === "pin") return
        const res = this.kernel.storage.getByMD5(item.md5)
        if (res.section === "pin") {
            $ui.warning("Already exists")
            return
        }
        item.next = this.savedClipboard[0][0]?.content?.info?.uuid ?? null
        item.prev = null

        try {
            // 写入数据库
            this.kernel.storage.beginTransaction()
            this.kernel.storage.insert("pin", item)
            if (item.next) {
                // 更改指针
                this.savedClipboard[0][0].content.info.prev = item.uuid
                this.kernel.storage.update("pin", this.savedClipboard[0][0].content.info)
            }
            this.kernel.storage.commit()

            // 删除原表数据
            this.delete(item.uuid, row)

            const listUI = $(this.listId)
            const lineData = this.lineData(item)
            // 保存到内存中
            this.savedClipboard[0].unshift(lineData)
            this.savedClipboardIndex[item.md5] = 1

            // UI 操作
            listUI.delete($indexPath(0, row))
        } catch (error) {
            this.kernel.error(error)
            this.kernel.storage.rollback()
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
        if (path && $file.exists(path.original)) {
            $clipboard.image = $file.read(path.original).image
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
            editor.uikitPush(text, () => callback(editor.text), navButtons)
        } else {
            const navigationView = editor.getNavigationView(text, navButtons)
            this.viewController.setEvent("onPop", () => callback(editor.text))
            this.viewController.push(navigationView)
        }
    }

    getAddTextView() {
        this.edit("", text => {
            if (text !== "") this.add(text)
        })
    }

    loadSavedClipboard() {
        this.kernel.print("load clipboard")
        const initData = data => {
            try {
                const sorted = this.kernel.storage.sort(data, this.kernel.setting.get("clipboard.maxItemLength"))
                return sorted.map(data => {
                    this.savedClipboardIndex[data.md5] = 1
                    return this.lineData(data, this.copied.uuid === data.uuid)
                })
            } catch (error) {
                $ui.alert({
                    title: $l10n("REBUILD_DATABASE"),
                    message: $l10n("CLIPBOARD_STRUCTURE_ERROR"),
                    actions: [
                        {
                            title: $l10n("OK"),
                            handler: () => {
                                const loading = UIKit.loading()
                                loading.start()
                                this.kernel.storage.rebuild()
                                loading.end()
                                $delay(0.8, () => $addin.restart())
                            }
                        },
                        { title: $l10n("CANCEL") }
                    ]
                })
                this.kernel.error(error)
            }
        }
        this.savedClipboard = [initData(this.kernel.storage.all("pin")), initData(this.kernel.storage.all("clipboard"))]
    }

    searchAction(text) {
        try {
            if (text === "") {
                this.updateList()
            } else {
                const res = this.kernel.storage.search(text)
                if (res && res.length > 0) $(this.listId).data = res.map(data => this.lineData(data))
            }
        } catch (error) {
            this.updateList()
            throw error
        }
    }

    menuItems(withDefaultButtons = true) {
        const handlerRewrite = handler => {
            return (sender, indexPath) => {
                const item = sender.object(indexPath)
                const data = {
                    text: item.content.info.text,
                    uuid: item.content.info.uuid
                }
                handler(data)
            }
        }
        const actions = this.kernel.actionManager.getActions("clipboard").map(action => {
            const actionHandler = this.kernel.actionManager.getActionHandler(action.type, action.dir)
            action.handler = handlerRewrite(actionHandler)
            action.title = action.name
            action.symbol = action.icon
            return action
        })
        const defaultButtons = [
            {
                inline: true,
                items: [
                    {
                        title: $l10n("SHARE"),
                        symbol: "square.and.arrow.up",
                        handler: (sender, indexPath) => {
                            const text = sender.object(indexPath).content.info.text
                            let shareContent = text
                            const path = this.kernel.storage.keyToPath(text)
                            if (path && $file.exists(path.original)) {
                                const image = $file.read(path.original)?.image?.png
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
                            const data = sender.object(indexPath)
                            this.copy(data.content.info.text, data.content.info.uuid, indexPath.row)
                        }
                    },
                    {
                        title: $l10n("DELETE"),
                        symbol: "trash",
                        destructive: true,
                        handler: (sender, indexPath) => {
                            this.kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), () => {
                                const data = sender.object(indexPath)
                                this.delete(data.content.info.uuid, indexPath.row)
                                sender.delete(indexPath)
                            })
                        }
                    }
                ]
            }
        ]
        return actions.concat(withDefaultButtons ? defaultButtons : [])
    }

    lineData(data, indicator = false) {
        const image = {
            hidden: true
        }
        const content = {
            text: "",
            info: {
                text: data.text,
                section: data.section,
                uuid: data.uuid,
                md5: data.md5,
                prev: data.prev,
                next: data.next
            }
        }

        const path = this.kernel.storage.keyToPath(data.text)
        if (path) {
            image.src = path.preview
            image.hidden = false
            content.info.height = this.imageContentHeight
        } else {
            const sliceText = text => {
                // 显示最大长度
                const textMaxLength = this.kernel.setting.get("clipboard.textMaxLength")
                return text.length > textMaxLength ? text.slice(0, textMaxLength) + "..." : text
            }
            content.text = sliceText(data.text)
            content.info.height = $text.sizeThatFits({
                text: content.text,
                width: UIKit.windowSize.width - this.edges * 2,
                font: $font(this.fontSize)
            }).height
        }

        return {
            copied: { hidden: !indicator },
            image,
            content
        }
    }

    listTemplate(lines = 0) {
        return {
            props: { bgcolor: $color("clear") },
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
                        make.left.inset(this.edges / 2 - this.copiedIndicatorSize / 2)
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "content",
                        lines: lines,
                        font: $font(this.fontSize)
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.super)
                        make.left.right.inset(this.edges)
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
            ]
        }
    }

    getReorderView() {
        const reorderView = {
            type: "list",
            props: {
                bgcolor: UIKit.primaryViewBackgroundColor,
                separatorInset: $insets(0, this.edges, 0, 0),
                data: new Array(...this.clipboard),
                template: this.listTemplate(),
                reorder: true,
                crossSections: false,
                actions: [
                    {
                        // 删除
                        title: "delete",
                        handler: (sender, indexPath) => {
                            const listView = $(this.listId)
                            const data = listView.object(indexPath)
                            this.delete(data.content.info.uuid, indexPath.row)
                            listView.delete(indexPath)
                        }
                    }
                ]
            },
            events: {
                rowHeight: (sender, indexPath) => {
                    // sender 取不到值时代表此项为占位符，从原列表取值
                    const content = sender.object(indexPath).content ?? $(this.listId).object(indexPath).content
                    return content.info.height + this.edges * 2
                },
                reorderBegan: indexPath => {
                    // 用于纠正 rowHeight 高度计算
                    this.reorder.content = this.clipboard[indexPath.row].content
                    this.reorder.image = this.clipboard[indexPath.row].image
                    this.reorder.from = indexPath.row
                    this.reorder.to = undefined
                },
                reorderMoved: (fromIndexPath, toIndexPath) => {
                    this.reorder.to = toIndexPath.row
                },
                reorderFinished: () => {
                    if (this.reorder.to === undefined) return
                    this.move(this.reorder.from, this.reorder.to)
                }
            },
            layout: $layout.fill
        }

        const sheet = new Sheet()
        sheet
            .setView(reorderView)
            .addNavBar({
                title: "",
                popButton: { title: $l10n("DONE") }
            })
            .preventDismiss()
            .init()
            .present()
    }

    getListView() {
        const menuView = {
            type: "menu",
            props: {
                id: this.listId + "-menu",
                items: this.tabItems,
                index: this.tabIndex,
                dynamicWidth: true
            },
            events: {
                changed: sender => {
                    this.tabIndex = sender.index
                    this.updateList()
                }
            },
            layout: (make, view) => {
                make.top.left.right.equalTo(view.super)
                make.height.equalTo(this.tabHeight)
            }
        }

        const listView = {
            // 剪切板列表
            type: "list",
            props: {
                id: this.listId,
                bgcolor: $color("clear"),
                separatorInset: $insets(0, this.edges, 0, 0),
                menu: { items: this.menuItems(this.kernel) },
                data: [],
                template: this.listTemplate(),
                actions: [
                    {
                        // 复制
                        title: $l10n("COPY"),
                        color: $color("systemLink"),
                        handler: (sender, indexPath) => {
                            const data = sender.object(indexPath)
                            this.copy(data.content.info.text, data.content.info.uuid, indexPath.row)
                        }
                    },
                    {
                        // 置顶
                        title: $l10n("PIN"),
                        color: $color("orange"),
                        handler: (sender, indexPath) => {
                            const content = sender.object(indexPath).content.info
                            delete content.height
                            this.pin(content, indexPath.row)
                        }
                    }
                ]
            },
            layout: (make, view) => {
                make.bottom.left.right.equalTo(view.super)
                make.top.equalTo(view.prev.bottom)
            },
            events: {
                ready: () => this.listReady(),
                rowHeight: (sender, indexPath) => {
                    const content = sender.object(indexPath).content
                    return content.info.height + this.edges * 2
                },
                didSelect: (sender, indexPath, data) => {
                    const content = data.content
                    const text = content.info.text
                    const path = this.kernel.storage.keyToPath(text)
                    if (path && $file.exists(path.original)) {
                        $quicklook.open({
                            image: $file.read(path.original)?.image
                        })
                    } else {
                        this.edit(content.info.text, text => {
                            if (content.info.md5 !== $text.MD5(text))
                                this.update(content.info.uuid, text, indexPath.row)
                        })
                    }
                }
            }
        }

        const emptyListBackground = {
            type: "label",
            props: {
                id: this.listId + "-empty-list-background",
                hidden: this.clipboard.length > 0,
                text: "Hello, World!",
                align: $align.center
            },
            layout: $layout.center
        }

        return View.createFromViews([menuView, listView, emptyListBackground])
    }

    getNavigationView() {
        const searchBar = new SearchBar()
        // 初始化搜索功能
        searchBar.controller.setEvent("onChange", text => this.searchAction(text))
        searchBar.setEvent("didBeginEditing", () => {
            $ui.animate({
                duration: 0.4,
                animation: () => {
                    $(this.listId + "-menu").updateLayout(make => {
                        make.height.equalTo(0)
                    })
                }
            })
        })
        searchBar.setEvent("didEndEditing", () => {
            $ui.animate({
                duration: 0.4,
                animation: () => {
                    $(this.listId + "-menu").updateLayout(make => {
                        make.height.equalTo(this.tabHeight)
                    })
                }
            })
        })

        const navigationView = new NavigationView()
        navigationView.navigationBarTitle($l10n("CLIPBOARD"))
        navigationView.navigationBarItems
            .setTitleView(searchBar)
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
                    tapped: () => this.getReorderView()
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

        navigationView.navigationBar.setBackgroundColor(UIKit.primaryViewBackgroundColor)
        navigationView.navigationBar.largeTitleDisplayMode = NavigationBar.largeTitleDisplayModeNever

        if (this.kernel.isUseJsboxNav) {
            navigationView.navigationBar.removeTopSafeArea()
        }
        navigationView.setView(this.getListView())

        return navigationView
    }
}

module.exports = Clipboard
