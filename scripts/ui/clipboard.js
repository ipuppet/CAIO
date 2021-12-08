const {
    UIKit,
    PageController,
    SearchBar
} = require("../easy-jsbox")

class Clipboard {
    constructor(kernel) {
        this.kernel = kernel
        this.listId = "clipboard-list"
        // 剪贴板列个性化设置
        this.edges = 20 // 列表边距
        this.edgesForSort = 20 // 列表边距
        this.fontSize = 16 // 字体大小
        this.copiedIndicatorSize = 7 // 已复制指示器（小绿点）大小
        // 检查是否携带URL scheme
        this.checkUrlScheme()
        // 数据
        this.initCopied()
        this.savedClipboard = this.getSavedClipboard()
        this.reorder = {}
        $app.listen({
            syncByiCloud: object => {
                if (object.status) {
                    this.savedClipboard = this.getSavedClipboard()
                    const view = $(this.listId)
                    if (view) view.data = this.savedClipboard
                }
            }
        })
    }

    checkUrlScheme() {
        if ($context.query["copy"]) {
            const content = this.kernel.storage.getByUUID($context.query["copy"])
            $clipboard.text = content.text
            /* setTimeout(() => {
                this.readClipboard()
                $ui.success($l10n("COPIED"))
            }, 500) */
        } else if ($context.query["add"]) {
            this.getAddTextView()
        }
    }

    initCopied() {
        if (this.kernel.setting.get("clipboard.autoSave")) {
            const res = this.kernel.storage.getByMD5($text.MD5($clipboard.text))
            if (res) this.setCopied(res.uuid, 0, false)
        }
    }

    setCopied(uuid, index, isUpdateIndicator = true) {
        if (!uuid) {
            this.copied = undefined
            $clipboard.clear()
            $cache.set("clipboard.copied", this.copied)
        } else {
            if (isUpdateIndicator) {
                const listView = $(this.listId)
                if (this.copied?.index !== undefined) {
                    listView.cell($indexPath(0, this.copied.index)).get("copied").hidden = true
                    this.savedClipboard[this.copied.index].copied.hidden = true
                }
                listView.cell($indexPath(0, index)).get("copied").hidden = false
                this.savedClipboard[index].copied.hidden = false
            }
            this.copied = {
                uuid: uuid,
                index: index
            }
            $cache.set("clipboard.copied", this.copied)
        }
    }

    readClipboard(manual = false) {
        if (manual || this.kernel.setting.get("clipboard.autoSave")) {
            this.kernel.print("读取剪切板")
            if ($cache.get("clipboard.copied") && this.copied) // 只更新 uuid
                this.copied.uuid = $cache.get("clipboard.copied").uuid
            const md5 = $text.MD5($clipboard.text)
            const res = this.kernel.storage.getByMD5(md5)
            if ((this.copied && res) && this.copied.uuid === res.uuid) {
                this.setCopied(res.uuid, this.getIndexByUUID(res.uuid))
            } else if ($clipboard.text) {
                if (res?.md5 !== md5) this.add($clipboard.text)
            }
        }
    }

    /**
     * 警告！该方法可能消耗大量资源
     * @param {String} uuid 
     */
    getIndexByUUID(uuid) {
        const data = $(this.listId).data
        const length = data.length
        for (let index = 0; index < length; index++) {
            if (data[index].content.info.uuid === uuid) return index
        }
        return false
    }

    update(uuid, text, index) {
        const info = $(this.listId).cell($indexPath(0, index)).get("content").info
        const lineData = this.lineData(Object.assign(info, { text, text }), info.uuid === this.copied?.uuid)
        this.savedClipboard[index] = lineData
        $(this.listId).data = this.savedClipboard
        if (uuid === this.copied?.uuid) {
            $clipboard.text = text
        }
        return this.kernel.storage.updateText(uuid, text)
    }

    /**
     * 将from位置的元素移动到to位置
     * @param {Number} from 
     * @param {Number} to 
     */
    move(from, to) {
        if (from === to) return
        if (from < to) to++ // 若向下移动则 to 增加 1，因为代码为移动到 to 位置的上面
        if (!this.savedClipboard[to]) this.savedClipboard[to] = this.lineData({
            uuid: null,
            text: "",
            next: null,
            prev: this.savedClipboard[to - 1].content.info.uuid
        })
        this.kernel.storage.beginTransaction() // 开启事务
        try {
            const oldFromItem = {
                uuid: this.savedClipboard[from].content.info.uuid,
                text: this.savedClipboard[from].content.info.text
            }
            const oldToItem = {
                uuid: this.savedClipboard[to].content.info.uuid,
                text: this.savedClipboard[to].content.info.text
            }
            { // 删除元素
                if (this.savedClipboard[from - 1]) {
                    const fromPrevItem = { // from 位置的上一个元素
                        uuid: this.savedClipboard[from - 1].content.info.uuid,
                        text: this.savedClipboard[from - 1].content.info.text,
                        prev: this.savedClipboard[from - 1].content.info.prev,
                        next: this.savedClipboard[from].content.info.next
                    }
                    this.kernel.storage.update(fromPrevItem)
                    this.savedClipboard[from - 1] = this.lineData(fromPrevItem)
                }
                if (this.savedClipboard[from + 1]) {
                    const fromNextItem = { // from 位置的下一个元素
                        uuid: this.savedClipboard[from + 1].content.info.uuid,
                        text: this.savedClipboard[from + 1].content.info.text,
                        prev: this.savedClipboard[from].content.info.prev,
                        next: this.savedClipboard[from + 1].content.info.next
                    }
                    this.kernel.storage.update(fromNextItem)
                    this.savedClipboard[from + 1] = this.lineData(fromNextItem)
                }
            }
            { // 在 to 上方插入元素
                if (this.savedClipboard[to - 1]) {
                    const toPrevItem = { // 原来 to 位置的上一个元素
                        uuid: this.savedClipboard[to - 1].content.info.uuid,
                        text: this.savedClipboard[to - 1].content.info.text,
                        prev: this.savedClipboard[to - 1].content.info.prev,
                        next: oldFromItem.uuid // 指向即将被移动元素的uuid
                    }
                    this.kernel.storage.update(toPrevItem)
                    this.savedClipboard[to - 1] = this.lineData(toPrevItem)
                }
                const toItem = { // 原来 to 位置的元素
                    uuid: oldToItem.uuid,
                    text: oldToItem.text,
                    prev: oldFromItem.uuid, // 指向即将被移动的元素
                    next: this.savedClipboard[to].content.info.next // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                }
                this.kernel.storage.update(toItem)
                const fromItem = { // 被移动元素
                    uuid: oldFromItem.uuid,
                    text: oldFromItem.text,
                    prev: this.savedClipboard[to].content.info.prev, // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                    next: oldToItem.uuid
                }
                this.kernel.storage.update(fromItem)
                // 修改内存中的值
                this.savedClipboard[to] = this.lineData(toItem)
                this.savedClipboard[from] = this.lineData(fromItem)
            }
            { // 移动位置
                this.savedClipboard.splice(to, 0, this.savedClipboard[from])
                this.savedClipboard.splice(from > to ? from + 1 : from, 1)
                this.kernel.storage.commit() // 提交事务
                // 去掉补位元素
                if (this.savedClipboard[to].content.info.uuid === null) {
                    this.savedClipboard.splice(to, 1)
                }
            }
            { // 操作 UI
                // 去除偏移
                const _to = from < to ? to - 1 : to
                const listView = $(this.listId)
                // 移动列表
                if (from < _to) { // 从上往下移动
                    listView.insert({
                        indexPath: $indexPath(0, to),
                        value: this.savedClipboard[_to]
                    })
                    listView.delete(from)
                } else { // 从下往上移动
                    listView.delete(from)
                    listView.insert({
                        indexPath: $indexPath(0, to),
                        value: this.savedClipboard[to]
                    })
                }
                // 修正指示器
                if (this.copied?.index !== undefined) {
                    const copiedIndex = this.copied.index
                    const copiedUUID = this.copied.uuid
                    if (copiedIndex === from) { // 被移动的行是被复制的行
                        this.setCopied(copiedUUID, _to)
                    } else if (
                        copiedIndex > from && copiedIndex < _to
                        || copiedIndex < from && copiedIndex > _to
                        || copiedIndex === _to
                    ) { // 被复制的行介于 from 和 _to 之间或等于 _to
                        // 从上往下移动则 -1 否则 +1
                        this.setCopied(copiedUUID, from < _to ? copiedIndex - 1 : copiedIndex + 1)
                    }
                }
            }
        } catch (error) {
            this.kernel.storage.rollback()
            throw error
        }
    }

    /**
     * 复制
     * @param {*} text 
     * @param {*} uuid 
     * @param {Number} index 被复制的行的索引
     */
    copy(text, uuid, index, isMoveToTop = true) {
        // 复制到剪切板
        $clipboard.text = text
        // 将被复制的行移动到最前端
        if (isMoveToTop) this.move(index, 0)
        // 写入缓存并更新数据
        this.setCopied(uuid, isMoveToTop ? 0 : index)
    }

    add(text) {
        text = text.trim()
        if (text === "") return
        // 元数据
        const data = {
            uuid: this.kernel.uuid(),
            text: text,
            prev: null,
            next: this.savedClipboard[0] ? this.savedClipboard[0].content.info.uuid : null
        }
        // 写入数据库
        this.kernel.storage.beginTransaction()
        this.kernel.storage.insert(data)
        if (data.next) {
            // 更改指针
            this.kernel.storage.update({
                uuid: this.savedClipboard[0].content.info.uuid,
                text: this.savedClipboard[0].content.info.text,
                prev: data.uuid,
                next: this.savedClipboard[0].content.info.next
            })
            this.savedClipboard[0].content.info.prev = data.uuid
        }
        this.kernel.storage.commit()
        // 格式化数据
        const lineData = this.lineData(data)
        lineData.copied.hidden = false // 强制显示指示器
        this.savedClipboard.unshift(lineData) // 保存到内存中
        // 在列表中插入行
        $(this.listId).insert({
            indexPath: $indexPath(0, 0),
            value: lineData
        })
        // 只更新数据，不更新指示器
        if (this.copied?.index !== undefined)
            this.setCopied(this.copied.uuid, this.copied.index + 1, false)
        // 复制新添加的元素
        this.copy(text, data.uuid, 0, false)
    }

    getAddTextView() {
        this.edit("", text => {
            if (text !== "") this.add(text)
        })
    }

    delete(uuid, index) {
        // 删除数据库中的值
        this.kernel.storage.beginTransaction()
        this.kernel.storage.delete(uuid)
        // 更改指针
        if (this.savedClipboard[index - 1]) {
            const prevItem = {
                uuid: this.savedClipboard[index - 1].content.info.uuid,
                text: this.savedClipboard[index - 1].content.info.text,
                prev: this.savedClipboard[index - 1].content.info.prev,
                next: this.savedClipboard[index].content.info.next // next 指向被删除元素的 next
            }
            this.kernel.storage.update(prevItem)
            this.savedClipboard[index - 1] = this.lineData(prevItem)
        }
        if (this.savedClipboard[index + 1]) {
            const nextItem = {
                uuid: this.savedClipboard[index + 1].content.info.uuid,
                text: this.savedClipboard[index + 1].content.info.text,
                prev: this.savedClipboard[index].content.info.prev, // prev 指向被删除元素的 prev
                next: this.savedClipboard[index + 1].content.info.next
            }
            this.kernel.storage.update(nextItem)
            this.savedClipboard[index + 1] = this.lineData(nextItem)
        }
        this.kernel.storage.commit()
        // 删除内存中的值
        this.savedClipboard.splice(index, 1)
        // 删除列表中的行
        // 删除剪切板信息
        if (this.copied?.uuid === uuid) {
            this.setCopied(null)
        }
    }

    sliceText(text) {
        // 显示最大长度
        const textMaxLength = this.kernel.setting.get("clipboard.textMaxLength")
        return text.length > textMaxLength ? text.slice(0, textMaxLength) + "..." : text
    }

    lineData(data, indicator = false) {
        const text = this.sliceText(data.text)
        const size = $text.sizeThatFits({
            text: text,
            width: $device.info.screen.width,
            font: $font(this.fontSize)
        })
        return {
            content: {
                text: text,
                info: {
                    text: data.text,
                    uuid: data.uuid,
                    md5: data.md5,
                    height: size.height,
                    prev: data.prev,
                    next: data.next
                }
            },
            copied: { hidden: !indicator }
        }
    }

    getSavedClipboard() {
        const dataObj = {}
        let length = 0
        let header = null
        this.kernel.storage.all().forEach(item => {
            // 构建结构
            dataObj[item.uuid] = item
            // 寻找头节点
            if (item.prev === null) {
                header = item.uuid
            }
            // 统计长度
            length++
        })
        // 排序
        const sorted = []
        if (length > 0) {
            let p = dataObj[header]
            let maxLoop = this.kernel.setting.get("clipboard.maxItemLength") // 控制显示行数
            while (p.next !== null && maxLoop > 0) {
                maxLoop--
                sorted.push(p)
                p = dataObj[p.next]
                if (p === undefined) {
                    $ui.alert({
                        title: $l10n("BACKUP_AND_REBUILD_DATABASE"),
                        actions: [
                            {
                                title: $l10n("OK"),
                                style: $alertActionType.destructive,
                                handler: () => {
                                    this.kernel.storage.backup(() => {
                                        $file.delete(this.kernel.storage.localDb)
                                        $addin.restart()
                                    })
                                }
                            },
                            { title: $l10n("CANCEL") }
                        ]
                    })
                    throw $l10n("CLIPBOARD_STRUCTURE_ERROR")
                }
            }
            sorted.push(p) // 将最后一个元素推入
        }
        return sorted.map((data, index) => {
            if (data.uuid === this.copied?.uuid) { // 初始化索引
                this.setCopied(data.uuid, index, false)
            }
            return this.lineData(data, this.copied?.uuid === data.uuid)
        })
    }

    searchAction(text) {
        try {
            if (text === "") {
                $(this.listId).data = this.savedClipboard
            } else {
                const res = this.kernel.storage.search(text)
                if (res && res.length > 0)
                    $(this.listId).data = res.map(data => this.lineData(data))
            }
        } catch (error) {
            $(this.listId).data = this.savedClipboard
            throw error
        }
    }

    edit(text, callback) {
        this.kernel.editor.push(text, text => {
            callback(text)
        }, $l10n("CLIPBOARD"), "", [
            {
                symbol: "square.and.arrow.up",
                tapped: () => {
                    if (this.kernel.editor.text) {
                        $share.sheet(this.kernel.editor.text)
                    } else {
                        $ui.warning($l10n("NONE"))
                    }
                }
            },
            {
                symbol: "doc.on.clipboard",
                tapped: () => {
                    if (this.kernel.editor.text) {
                        $clipboard.text = this.kernel.editor.text
                        $ui.success($l10n("COPIED"))
                    }
                }
            }
        ])
    }

    menuItems() {
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
        return this.kernel.getActions("clipboard").map(action => {
            const actionHandler = this.kernel.getActionHandler(action.type, action.dir)
            action.handler = handlerRewrite(actionHandler)
            action.title = action.name
            return action
        })
    }

    getPageView() {
        const searchBar = new SearchBar()
        const pageController = new PageController()
        pageController.navigationItem
            .setTitle($l10n("CLIPBOARD"))
            .setTitleView(searchBar)
            .setRightButtons([
                {
                    symbol: "plus.circle",
                    tapped: () => this.getAddTextView()
                },
                this.kernel.getActionButton({
                    text: () => this.copied === undefined ? null : this.kernel.storage.getByUUID(this.copied.uuid).text
                })
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
                                    layout: (make, view) => {
                                        make.width.equalTo(view.super)
                                        make.top.equalTo(view.prev.bottom)
                                        make.bottom.inset(0)
                                    },
                                    props: {
                                        id: "clipboard-list-sort",
                                        reorder: true,
                                        bgcolor: $color("clear"),
                                        data: this.savedClipboard,
                                        template: {
                                            props: { bgcolor: $color("clear") },
                                            views: [
                                                {
                                                    type: "view",
                                                    props: {
                                                        id: "copied",
                                                        circular: this.copiedIndicatorSize,
                                                        bgcolor: $color("green")
                                                    },
                                                    layout: (make, view) => {
                                                        make.centerY.equalTo(view.super)
                                                        make.size.equalTo(this.copiedIndicatorSize)
                                                        make.left.inset(this.edgesForSort / 2 - this.copiedIndicatorSize / 2)
                                                    }
                                                },
                                                {
                                                    type: "label",
                                                    props: {
                                                        id: "content",
                                                        lines: 1,
                                                        font: $font(this.fontSize)
                                                    },
                                                    layout: (make, view) => {
                                                        make.centerY.equalTo(view.super)
                                                        make.left.right.inset(this.edgesForSort)
                                                    }
                                                }
                                            ]
                                        },
                                        actions: [
                                            { // 删除
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
                                            return this.fontSize + this.edgesForSort
                                        },
                                        reorderBegan: indexPath => {
                                            // 用于纠正 rowHeight 高度计算
                                            this.reorder.content = this.savedClipboard[indexPath.row].content
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
        pageController.navigationController.navigationBar.setBackgroundColor($color("primarySurface"))
        pageController.setView({ // 剪切板列表
            type: "list",
            props: {
                id: this.listId,
                menu: {
                    title: $l10n("ACTION"),
                    items: this.menuItems()
                },
                indicatorInsets: $insets(50, 0, 50, 0),
                separatorInset: $insets(0, this.edges, 0, 0),
                data: this.savedClipboard,
                template: {
                    props: { bgcolor: $color("clear") },
                    views: [
                        {
                            type: "view",
                            props: {
                                id: "copied",
                                circular: this.copiedIndicatorSize,
                                bgcolor: $color("green")
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.size.equalTo(this.copiedIndicatorSize)
                                make.left.inset(this.edges / 2 - this.copiedIndicatorSize / 2) // 放在前面小缝隙的中间 `this.copyedIndicatorSize / 2` 指大小的一半
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "content",
                                lines: 0,
                                font: $font(this.fontSize)
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.edges.inset(this.edges)
                            }
                        }
                    ]
                },
                footer: { // 防止list被菜单遮挡
                    type: "view",
                    props: { height: 50 }
                },
                actions: [
                    { // 复制
                        title: $l10n("COPY"),
                        color: $color("systemLink"),
                        handler: (sender, indexPath) => {
                            const data = sender.object(indexPath)
                            this.copy(data.content.info.text, data.content.info.uuid, indexPath.row)
                        }
                    },
                    { // 删除
                        title: " " + $l10n("DELETE") + " ", // 防止JSBox自动更改成默认的删除操作
                        color: $color("red"),
                        handler: (sender, indexPath) => {
                            $ui.alert({
                                title: $l10n("CONFIRM_DELETE_MSG"),
                                actions: [
                                    {
                                        title: $l10n("DELETE"),
                                        style: $alertActionType.destructive,
                                        handler: () => {
                                            const data = sender.object(indexPath)
                                            this.delete(data.content.info.uuid, indexPath.row)
                                            sender.delete(indexPath)
                                        }
                                    },
                                    { title: $l10n("CANCEL") }
                                ]
                            })
                        }
                    }
                ]
            },
            layout: $layout.fill,
            events: {
                ready: () => {
                    setTimeout(() => { this.readClipboard() }, 500)
                    $app.listen({
                        // 在应用恢复响应后调用
                        resume: () => {
                            setTimeout(() => { this.readClipboard() }, 500)
                        }
                    })
                },
                rowHeight: (sender, indexPath) => {
                    const content = sender.object(indexPath).content
                    return content.info.height + this.edges * 2 + 1
                },
                didSelect: (sender, indexPath, data) => {
                    const content = data.content
                    this.edit(content.info.text, text => {
                        if (content.info.md5 !== $text.MD5(text))
                            this.update(content.info.uuid, text, indexPath.row)
                    })
                }
            }
        })
        return pageController.getPage()
    }
}

module.exports = Clipboard