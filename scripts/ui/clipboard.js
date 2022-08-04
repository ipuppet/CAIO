const { UIKit, ViewController, PageController, SearchBar } = require("../libs/easy-jsbox")
const Editor = require("./components/editor")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Clipboard {
    copied = {}
    #singleLine = false

    reorder = {}
    #savedClipboard = []
    savedClipboardIndex = {}

    static singleLineHeight = $text.sizeThatFits({
        text: "text",
        width: $device.info.screen.width,
        font: $font(this.fontSize)
    }).height

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

    get savedClipboard() {
        if (this.#savedClipboard.length === 0) {
            this.loadSavedClipboard()
        }
        return this.#savedClipboard
    }

    set savedClipboard(savedClipboard) {
        this.#savedClipboard = savedClipboard
    }

    setSingleLine() {
        // 图片高度与文字一致
        this.imageContentHeight = Clipboard.singleLineHeight
        this.#singleLine = true
    }

    loadDataWithSingleLine() {
        this.setSingleLine()
        this.loadSavedClipboard()
    }

    static updateMenu(kernel) {
        // TODO 更新 menu 中的动作
    }

    setClipboardText(text) {
        if (this.kernel.setting.get("clipboard.universal")) {
            $clipboard.text = text
        } else {
            $clipboard.setTextLocalOnly(text)
        }
    }

    /**
     * list view
     */
    ready() {
        // check url scheme
        $delay(0.5, () => {
            if ($context.query["copy"]) {
                const uuid = $context.query["copy"]
                const content = this.kernel.storage.getByUUID(uuid)
                this.setClipboardText(content.text)
                this.setCopied(uuid, this.getIndexPathByUUID(uuid))
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

        $app.listen({
            // iCloud
            syncByiCloud: object => {
                if (object.status) {
                    this.loadSavedClipboard()
                    const view = $(this.listId)
                    if (view) view.data = this.savedClipboard
                }
            },
            resume: () => {
                // 在应用恢复响应后调用
                $delay(0.5, () => {
                    this.loadSavedClipboard()
                    $(this.listId).data = this.savedClipboard
                    this.readClipboard()
                })
            }
        })
    }

    setCopied(uuid, indexPath, isUpdateIndicator = true, delay = 0.5) {
        if (
            uuid === this.copied.uuid &&
            indexPath.section === this.copied.indexPath?.section &&
            indexPath.row === this.copied.indexPath?.row
        ) {
            return
        }

        if (!uuid) {
            this.copied = {}
            $clipboard.clear()
        } else {
            if (isUpdateIndicator) {
                if (this.copied.indexPath) {
                    this.savedClipboard[this.copied.indexPath.section].rows[
                        this.copied.indexPath.row
                    ].copied.hidden = true
                }
                this.savedClipboard[indexPath.section].rows[indexPath.row].copied.hidden = false
                $delay(delay, () => {
                    // 直接重置数据，解决小绿点滚动到屏幕外后消失问题
                    $(this.listId).data = this.savedClipboard
                })
            }
            if (this.copied.uuid !== uuid) {
                this.copied = Object.assign(this.copied, this.kernel.storage.getByUUID(uuid) ?? {})
            }
            this.copied.indexPath = indexPath
        }
        $cache.set("clipboard.copied", this.copied)
    }

    /**
     * 警告！该方法可能消耗大量资源
     * @param {String} uuid
     */
    getIndexPathByUUID(uuid) {
        const data = $(this.listId).data
        let length = data[0].rows.length
        for (let index = 0; index < length; index++) {
            if (data[0].rows[index].content.info.uuid === uuid) return $indexPath(0, index)
        }
        length = data[1].rows.length
        for (let index = 0; index < length; index++) {
            if (data[1].rows[index].content.info.uuid === uuid) return $indexPath(1, index)
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

                return
            }

            const text = String($clipboard.text ?? "").trim()
            $clipboard.text = text // 防止重复弹窗提示读取剪切板
            if (!text) {
                return
            }

            // 判断 copied 是否和剪切板一致
            if (this.copied.text === text) {
                return
            }

            // 判断缓存是否和剪切板一致
            const cache = $cache.get("clipboard.copied") ?? {}
            if (text === cache.text) {
                this.setCopied(cache.uuid, cache.indexPath)
                return
            }

            const md5 = $text.MD5(text)
            const res = this.kernel.storage.getByMD5(md5)
            if (this.copied.uuid && this.copied.uuid === res?.uuid) {
                this.setCopied(res.uuid, this.getIndexPathByUUID(res.uuid))
            } else if (!this.savedClipboardIndex[md5]) {
                const data = this.add(text)
                this.copy(text, data.uuid, data.indexPath)
            }
        }
    }

    add(item, uiUpdate) {
        // 元数据
        const data = {
            uuid: this.kernel.uuid(),
            text: item,
            md5: null,
            image: null,
            prev: null,
            next: this.savedClipboard[1].rows[0] ? this.savedClipboard[1].rows[0].content.info.uuid : null
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
        // 写入数据库
        this.kernel.storage.beginTransaction()
        try {
            this.kernel.storage.insert(data)
            if (data.next) {
                // 更改指针
                this.savedClipboard[1].rows[0].content.info.prev = data.uuid
                this.kernel.storage.update(this.savedClipboard[1].rows[0].content.info)
            }
            this.kernel.storage.commit()

            // 格式化数据
            const lineData = this.lineData(data)

            // 保存到内存中
            this.savedClipboard[1].rows.unshift(lineData)
            this.savedClipboardIndex[$text.MD5(data.text)] = 1

            if (typeof uiUpdate === "function") {
                uiUpdate(data)
            } else {
                // 在列表中插入行
                data.indexPath = $indexPath(1, 0)
                $(this.listId).insert({
                    indexPath: data.indexPath,
                    value: lineData
                })
                // 被复制的元素向下移动了一个单位
                if (this.copied?.indexPath?.section === 1) {
                    this.setCopied(
                        this.copied.uuid,
                        $indexPath(this.copied?.indexPath?.section, this.copied?.indexPath?.row + 1),
                        false
                    )
                }
                return data
            }
        } catch (error) {
            this.kernel.storage.rollback()
            this.kernel.print(error)
            $ui.alert(error)
        }
    }

    delete(uuid, indexPath) {
        const section = indexPath.section
        const index = indexPath.row

        // 删除数据库中的值
        this.kernel.storage.beginTransaction()
        try {
            section === 0 ? this.kernel.storage.deletePin(uuid) : this.kernel.storage.delete(uuid)
            // 更改指针
            if (this.savedClipboard[section].rows[index - 1]) {
                const prevItem = {
                    uuid: this.savedClipboard[section].rows[index - 1].content.info.uuid,
                    text: this.savedClipboard[section].rows[index - 1].content.info.text,
                    prev: this.savedClipboard[section].rows[index - 1].content.info.prev,
                    next: this.savedClipboard[section].rows[index].content.info.next // next 指向被删除元素的 next
                }
                section === 0 ? this.kernel.storage.updatePin(prevItem) : this.kernel.storage.update(prevItem)
                this.savedClipboard[section].rows[index - 1] = this.lineData(prevItem)
            }
            if (this.savedClipboard[section].rows[index + 1]) {
                const nextItem = {
                    uuid: this.savedClipboard[section].rows[index + 1].content.info.uuid,
                    text: this.savedClipboard[section].rows[index + 1].content.info.text,
                    prev: this.savedClipboard[section].rows[index].content.info.prev, // prev 指向被删除元素的 prev
                    next: this.savedClipboard[section].rows[index + 1].content.info.next
                }
                section === 0 ? this.kernel.storage.updatePin(nextItem) : this.kernel.storage.update(nextItem)
                this.savedClipboard[section].rows[index + 1] = this.lineData(nextItem)
            }
            this.kernel.storage.commit()

            // update index
            delete this.savedClipboardIndex[this.savedClipboard[section].rows[index].content.info.md5]
            // 删除内存中的值
            this.savedClipboard[section].rows.splice(index, 1)

            // 删除列表中的行
            if (this.copied.uuid === uuid) {
                // 删除剪切板信息
                this.setCopied(null)
            }
        } catch (error) {
            this.kernel.storage.rollback()
            this.kernel.print(error)
            $ui.alert(error)
        }
    }

    update(uuid, text, indexPath) {
        const info = $(this.listId).cell(indexPath).get("content").info
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
        this.savedClipboard[indexPath.section].rows[indexPath.row] = lineData

        // 更新列表
        $(this.listId).data = this.savedClipboard
        if (uuid === this.copied.uuid) {
            this.setClipboardText(text)
        }

        try {
            indexPath.section === 0
                ? this.kernel.storage.updateTextPin(uuid, text)
                : this.kernel.storage.updateText(uuid, text)
            return true
        } catch (error) {
            this.kernel.print(error)
            return false
        }
    }

    /**
     * 将from位置的元素移动到to位置
     * @param {Number} from
     * @param {Number} to
     */
    move(from, to, section, copiedIndex = true) {
        if (from === to) return
        if (from < to) to++ // 若向下移动则 to 增加 1，因为代码为移动到 to 位置的上面
        if (!this.savedClipboard[section].rows[to])
            this.savedClipboard[section].rows[to] = this.lineData({
                uuid: null,
                text: "",
                next: null,
                prev: this.savedClipboard[section].rows[to - 1].content.info.uuid
            })
        this.kernel.storage.beginTransaction() // 开启事务
        try {
            const oldFromItem = {
                uuid: this.savedClipboard[section].rows[from].content.info.uuid,
                text: this.savedClipboard[section].rows[from].content.info.text
            }
            const oldToItem = {
                uuid: this.savedClipboard[section].rows[to].content.info.uuid,
                text: this.savedClipboard[section].rows[to].content.info.text
            }
            {
                // 删除元素
                if (this.savedClipboard[section].rows[from - 1]) {
                    const fromPrevItem = {
                        // from 位置的上一个元素
                        uuid: this.savedClipboard[section].rows[from - 1].content.info.uuid,
                        text: this.savedClipboard[section].rows[from - 1].content.info.text,
                        prev: this.savedClipboard[section].rows[from - 1].content.info.prev,
                        next: this.savedClipboard[section].rows[from].content.info.next
                    }
                    section === 0
                        ? this.kernel.storage.updatePin(fromPrevItem)
                        : this.kernel.storage.update(fromPrevItem)
                    this.savedClipboard[section].rows[from - 1] = this.lineData(fromPrevItem)
                }
                if (this.savedClipboard[section].rows[from + 1]) {
                    const fromNextItem = {
                        // from 位置的下一个元素
                        uuid: this.savedClipboard[section].rows[from + 1].content.info.uuid,
                        text: this.savedClipboard[section].rows[from + 1].content.info.text,
                        prev: this.savedClipboard[section].rows[from].content.info.prev,
                        next: this.savedClipboard[section].rows[from + 1].content.info.next
                    }
                    section === 0
                        ? this.kernel.storage.updatePin(fromNextItem)
                        : this.kernel.storage.update(fromNextItem)
                    this.savedClipboard[section].rows[from + 1] = this.lineData(fromNextItem)
                }
            }
            {
                // 在 to 上方插入元素
                if (this.savedClipboard[section].rows[to - 1]) {
                    const toPrevItem = {
                        // 原来 to 位置的上一个元素
                        uuid: this.savedClipboard[section].rows[to - 1].content.info.uuid,
                        text: this.savedClipboard[section].rows[to - 1].content.info.text,
                        prev: this.savedClipboard[section].rows[to - 1].content.info.prev,
                        next: oldFromItem.uuid // 指向即将被移动元素的uuid
                    }
                    section === 0 ? this.kernel.storage.updatePin(toPrevItem) : this.kernel.storage.update(toPrevItem)
                    this.savedClipboard[section].rows[to - 1] = this.lineData(toPrevItem)
                }
                const toItem = {
                    // 原来 to 位置的元素
                    uuid: oldToItem.uuid,
                    text: oldToItem.text,
                    prev: oldFromItem.uuid, // 指向即将被移动的元素
                    next: this.savedClipboard[section].rows[to].content.info.next // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                }
                section === 0 ? this.kernel.storage.updatePin(toItem) : this.kernel.storage.update(toItem)
                const fromItem = {
                    // 被移动元素
                    uuid: oldFromItem.uuid,
                    text: oldFromItem.text,
                    prev: this.savedClipboard[section].rows[to].content.info.prev, // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                    next: oldToItem.uuid
                }
                section === 0 ? this.kernel.storage.updatePin(fromItem) : this.kernel.storage.update(fromItem)
                // 修改内存中的值
                this.savedClipboard[section].rows[to] = this.lineData(toItem)
                this.savedClipboard[section].rows[from] = this.lineData(fromItem)
            }
            {
                // 移动位置
                this.savedClipboard[section].rows.splice(to, 0, this.savedClipboard[section].rows[from])
                this.savedClipboard[section].rows.splice(from > to ? from + 1 : from, 1)
                this.kernel.storage.commit() // 提交事务
                // 去掉补位元素
                if (this.savedClipboard[section].rows[to].content.info.uuid === null) {
                    this.savedClipboard[section].rows.splice(to, 1)
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
                        indexPath: $indexPath(section, to),
                        value: this.savedClipboard[section].rows[_to]
                    })
                    listView.delete($indexPath(section, from))
                } else {
                    // 从下往上移动
                    listView.delete($indexPath(section, from))
                    listView.insert({
                        indexPath: $indexPath(section, to),
                        value: this.savedClipboard[section].rows[to]
                    })
                }
                // 修正指示器
                if (copiedIndex && this.copied.indexPath) {
                    const copiedIndex = this.copied.indexPath
                    if (copiedIndex.section === section) {
                        const copiedUUID = this.copied.uuid
                        if (copiedIndex.row === from) {
                            // 被移动的行是被复制的行
                            this.setCopied(copiedUUID, $indexPath(section, _to))
                        } else if (
                            (copiedIndex.row > from && copiedIndex.row < _to) ||
                            (copiedIndex.row < from && copiedIndex.row > _to) ||
                            copiedIndex.row === _to
                        ) {
                            // 被复制的行介于 from 和 _to 之间或等于 _to
                            // 从上往下移动则 -1 否则 +1
                            this.setCopied(
                                copiedUUID,
                                $indexPath(section, from < _to ? copiedIndex.row - 1 : copiedIndex.row + 1)
                            )
                        }
                    }
                }
            }
        } catch (error) {
            this.kernel.storage.rollback()
            this.kernel.print(error)
            $ui.alert(error)
        }
    }

    pin(item, indexPath) {
        if (item?.section === "pin") return
        const res = this.kernel.storage.getPinByMD5(item.md5)
        if (res) {
            $ui.warning("Already exists")
            return
        }
        item.next = this.savedClipboard[0].rows[0]?.content?.info?.uuid ?? null
        item.prev = null
        console.log(this.savedClipboard[0].rows[0]?.content?.info)
        // 写入数据库
        this.kernel.storage.beginTransaction()
        try {
            this.kernel.storage.insertPin(item)
            if (item.next) {
                // 更改指针
                this.savedClipboard[0].rows[0].content.info.prev = item.uuid
                this.kernel.storage.updatePin(this.savedClipboard[0].rows[0].content.info)
            }
            this.kernel.storage.commit()

            // 删除原表数据
            this.delete(item.uuid, indexPath)

            const listUI = $(this.listId)
            const lineData = listUI.object(indexPath)
            // 保存到内存中
            this.savedClipboard[0].rows.unshift(lineData)
            this.savedClipboardIndex[item.md5] = 1

            // UI insert
            listUI.insert({
                indexPath: $indexPath(0, 0),
                value: lineData
            })
            listUI.delete(indexPath)
        } catch (error) {
            this.kernel.storage.rollback()
            this.kernel.print(error)
            $ui.alert(error)
        }
    }

    /**
     * 复制
     * @param {*} text
     * @param {*} uuid
     * @param {Number} index 被复制的行的索引
     */
    copy(text, uuid, indexPath) {
        const path = this.kernel.storage.keyToPath(text)
        if (path && $file.exists(path.original)) {
            $clipboard.image = $file.read(path.original).image
        } else {
            this.setClipboardText(text)
        }
        const isMoveToTop = indexPath.section === 1
        // 将被复制的行移动到最前端
        if (isMoveToTop) this.move(indexPath.row, 0, indexPath.section)
        // 写入缓存并更新数据
        this.setCopied(uuid, isMoveToTop ? $indexPath(indexPath.section, 0) : indexPath)
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
            const pageController = editor.getPageController(text, navButtons)
            this.viewController.setEvent("onPop", () => callback(editor.text))
            this.viewController.push(pageController)
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
                this.kernel.print(error)
            }
        }
        this.savedClipboard = [
            {
                rows: initData(this.kernel.storage.allPin()) ?? []
            },
            {
                rows: initData(this.kernel.storage.all()) ?? []
            }
        ]
    }

    searchAction(text) {
        try {
            if (text === "") {
                $(this.listId).data = this.savedClipboard
            } else {
                const res = this.kernel.storage.search(text)
                if (res && res.length > 0) $(this.listId).data = res.map(data => this.lineData(data))
            }
        } catch (error) {
            $(this.listId).data = this.savedClipboard
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
                            this.copy(data.content.info.text, data.content.info.uuid, indexPath)
                        }
                    },
                    {
                        title: $l10n("DELETE"),
                        symbol: "trash",
                        destructive: true,
                        handler: (sender, indexPath) => {
                            this.kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), () => {
                                const data = sender.object(indexPath)
                                this.delete(data.content.info.uuid, indexPath)
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
        const path = this.kernel.storage.keyToPath(data.text)
        if (path) {
            return {
                copied: { hidden: !indicator },
                image: {
                    src: path.preview,
                    hidden: false
                },
                content: {
                    info: {
                        text: data.text,
                        section: data.section,
                        uuid: data.uuid,
                        md5: data.md5,
                        height: this.imageContentHeight,
                        prev: data.prev,
                        next: data.next
                    }
                }
            }
        } else {
            const sliceText = text => {
                // 显示最大长度
                const textMaxLength = this.kernel.setting.get("clipboard.textMaxLength")
                return text.length > textMaxLength ? text.slice(0, textMaxLength) + "..." : text
            }
            const text = sliceText(data.text)
            const height = this.#singleLine
                ? Clipboard.singleLineHeight
                : $text.sizeThatFits({
                      text: text,
                      width: $device.info.screen.width,
                      font: $font(this.fontSize)
                  }).height
            return {
                copied: { hidden: !indicator },
                image: {
                    hidden: true
                },
                content: {
                    text: text,
                    info: {
                        text: data.text,
                        section: data.section,
                        uuid: data.uuid,
                        md5: data.md5,
                        height: height,
                        prev: data.prev,
                        next: data.next
                    }
                }
            }
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

    getListView() {
        this.loadSavedClipboard()
        return {
            // 剪切板列表
            type: "list",
            props: {
                id: this.listId,
                menu: {
                    items: this.menuItems(this.kernel)
                },
                bgcolor: UIKit.primaryViewBackgroundColor,
                separatorInset: $insets(0, this.edges, 0, 0),
                data: this.savedClipboard,
                template: this.listTemplate(),
                actions: [
                    {
                        // 复制
                        title: $l10n("COPY"),
                        color: $color("systemLink"),
                        handler: (sender, indexPath) => {
                            const data = sender.object(indexPath)
                            this.copy(data.content.info.text, data.content.info.uuid, indexPath)
                        }
                    },
                    {
                        // 置顶
                        title: $l10n("PIN"),
                        color: $color("orange"),
                        handler: (sender, indexPath) => {
                            const content = sender.object(indexPath).content.info
                            delete content.height
                            this.pin(content, indexPath)
                        }
                    },
                    {
                        // 删除
                        title: " " + $l10n("DELETE") + " ", // 防止JSBox自动更改成默认的删除操作
                        color: $color("red"),
                        handler: (sender, indexPath) => {
                            this.kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), () => {
                                const data = sender.object(indexPath)
                                this.delete(data.content.info.uuid, indexPath)
                                sender.delete(indexPath)
                            })
                        }
                    }
                ]
            },
            layout: $layout.fill,
            events: {
                ready: () => this.ready(),
                rowHeight: (sender, indexPath) => {
                    const content = sender.object(indexPath).content
                    return content.info.height + this.edges * 2 + 1
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
                            if (content.info.md5 !== $text.MD5(text)) this.update(content.info.uuid, text, indexPath)
                        })
                    }
                }
            }
        }
    }

    getPageController() {
        const searchBar = new SearchBar()
        // 初始化搜索功能
        searchBar.controller.setEvent("onChange", text => this.searchAction(text))
        const pageController = new PageController()
        pageController.navigationItem
            .setTitle($l10n("CLIPBOARD"))
            .setTitleView(searchBar)
            .setRightButtons([
                {
                    symbol: "plus.circle",
                    tapped: () => this.getAddTextView()
                }
            ])
            .setLeftButtons([
                {
                    symbol: "arrow.up.arrow.down.circle",
                    tapped: (animate, sender) => {
                        $ui.popover({
                            sourceView: sender,
                            directions: $popoverDirection.up,
                            size: $size(200, 300),
                            views: [
                                {
                                    type: "label",
                                    props: {
                                        text: $l10n("SORT"),
                                        color: $color("secondaryText"),
                                        font: $font(14)
                                    },
                                    layout: (make, view) => {
                                        make.top.equalTo(view.super.safeArea).offset(0)
                                        make.height.equalTo(40)
                                        make.left.inset(20)
                                    }
                                },
                                UIKit.separatorLine(),
                                {
                                    type: "list",
                                    props: {
                                        id: "clipboard-list-sort",
                                        reorder: true,
                                        crossSections: false,
                                        bgcolor: $color("clear"),
                                        data: this.savedClipboard,
                                        template: this.listTemplate(1),
                                        actions: [
                                            {
                                                // 删除
                                                title: "delete",
                                                handler: (sender, indexPath) => {
                                                    const listView = $(this.listId)
                                                    const data = listView.object(indexPath)
                                                    this.delete(data.content.info.uuid, indexPath)
                                                    listView.delete(indexPath)
                                                }
                                            }
                                        ]
                                    },
                                    events: {
                                        rowHeight: (sender, indexPath) => {
                                            const obj = sender.object(indexPath)
                                            if (obj.image !== undefined && !obj.image.hidden) {
                                                // image height
                                                return obj.content?.info?.height
                                            } else {
                                                // no image
                                                return this.fontSize + this.edges
                                            }
                                        },
                                        reorderBegan: indexPath => {
                                            // 用于纠正 rowHeight 高度计算
                                            this.reorder.content =
                                                this.savedClipboard[indexPath.section].rows[indexPath.row].content
                                            this.reorder.image =
                                                this.savedClipboard[indexPath.section].rows[indexPath.row].image
                                            this.reorder.section = indexPath.section
                                            this.reorder.from = indexPath.row
                                            this.reorder.to = undefined
                                        },
                                        reorderMoved: (fromIndexPath, toIndexPath) => {
                                            this.reorder.section = toIndexPath.section
                                            this.reorder.to = toIndexPath.row
                                        },
                                        reorderFinished: () => {
                                            if (this.reorder.to === undefined) return
                                            this.move(this.reorder.from, this.reorder.to, this.reorder.section)
                                        }
                                    },
                                    layout: (make, view) => {
                                        make.width.equalTo(view.super)
                                        make.top.equalTo(view.prev.bottom)
                                        make.bottom.inset(0)
                                    }
                                }
                            ]
                        })
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
        pageController.navigationController.navigationBar.setBackgroundColor(UIKit.primaryViewBackgroundColor)
        if (this.kernel.isUseJsboxNav) {
            pageController.navigationController.navigationBar.withoutStatusBarHeight()
        }
        pageController.setView(this.getListView())

        return pageController
    }
}

module.exports = Clipboard
