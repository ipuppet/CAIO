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

    static updateMenu(kernel) {
        // TODO 更新 menu 中的动作
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
            if (res) this.setCopied(res.uuid, $indexPath(0, 0), false)
        }
    }

    setCopied(uuid, indexPath, isUpdateIndicator = true) {
        if (!uuid) {
            this.copied = undefined
            $clipboard.clear()
            $cache.set("clipboard.copied", this.copied)
        } else {
            if (isUpdateIndicator) {
                const listView = $(this.listId)
                if (this.copied?.indexPath !== undefined) {
                    listView.cell(this.copied.indexPath).get("copied").hidden = true
                    this.savedClipboard[this.copied.indexPath.section].rows[this.copied.indexPath.row].copied.hidden = true
                }
                listView.cell(indexPath).get("copied").hidden = false
                this.savedClipboard[indexPath.section].rows[indexPath.row].copied.hidden = false
            }
            this.copied = {
                uuid: uuid,
                indexPath: indexPath
            }
            $cache.set("clipboard.copied", this.copied)
        }
    }

    readClipboard(manual = false) {
        /**
         * 警告！该方法可能消耗大量资源
         * @param {String} uuid 
         */
        const getIndexPathByUUID = uuid => {
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

        if (manual || this.kernel.setting.get("clipboard.autoSave")) {
            this.kernel.print("读取剪切板")
            if ($cache.get("clipboard.copied") && this.copied) // 只更新 uuid
                this.copied.uuid = $cache.get("clipboard.copied").uuid
            const md5 = $text.MD5($clipboard.text)
            const res = this.kernel.storage.getByMD5(md5)
            if ((this.copied && res) && this.copied.uuid === res.uuid) {
                this.setCopied(res.uuid, getIndexPathByUUID(res.uuid))
            } else if ($clipboard.text) {
                if (res?.md5 !== md5) this.add($clipboard.text)
            }
        }
    }

    pin(item, indexPath) {
        if (item?.section === "pin") return
        const res = this.kernel.storage.getByMD5(item.md5)
        if (res?.section === "pin") {
            $ui.warning("Already exists")
            return
        }
        item.next = this.savedClipboard[0].rows[0] ? this.savedClipboard[0].rows[0].content.info.uuid : null
        item.prev = null
        // 写入数据库
        this.kernel.storage.beginTransaction()
        this.kernel.storage.insertPin(item)
        if (item.next) {
            // 更改指针
            this.kernel.storage.updatePin({
                uuid: this.savedClipboard[0].rows[0].content.info.uuid,
                text: this.savedClipboard[0].rows[0].content.info.text,
                prev: item.uuid,
                next: this.savedClipboard[0].rows[0].content.info.next
            })
            this.savedClipboard[0].rows[0].content.info.prev = item.uuid
        }
        this.kernel.storage.commit()
        // 原表数据
        const listUI = $(this.listId)
        const lineData = listUI.object(indexPath)
        // 保存到内存中
        this.savedClipboard[0].rows.unshift(lineData)
        // 删除原表数据
        this.delete(item.uuid, indexPath)
        // UI insert
        listUI.insert({
            indexPath: $indexPath(0, 0),
            value: lineData
        })
        listUI.delete(indexPath)
    }

    /**
     * 将from位置的元素移动到to位置
     * @param {Number} from 
     * @param {Number} to 
     */
    move(from, to, section) {
        if (from === to) return
        if (from < to) to++ // 若向下移动则 to 增加 1，因为代码为移动到 to 位置的上面
        if (!this.savedClipboard[section].rows[to]) this.savedClipboard[section].rows[to] = this.lineData({
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
            { // 删除元素
                if (this.savedClipboard[section].rows[from - 1]) {
                    const fromPrevItem = { // from 位置的上一个元素
                        uuid: this.savedClipboard[section].rows[from - 1].content.info.uuid,
                        text: this.savedClipboard[section].rows[from - 1].content.info.text,
                        prev: this.savedClipboard[section].rows[from - 1].content.info.prev,
                        next: this.savedClipboard[section].rows[from].content.info.next
                    }
                    section === 0 ? this.kernel.storage.updatePin(fromPrevItem) : this.kernel.storage.update(fromPrevItem)
                    this.savedClipboard[section].rows[from - 1] = this.lineData(fromPrevItem)
                }
                if (this.savedClipboard[section].rows[from + 1]) {
                    const fromNextItem = { // from 位置的下一个元素
                        uuid: this.savedClipboard[section].rows[from + 1].content.info.uuid,
                        text: this.savedClipboard[section].rows[from + 1].content.info.text,
                        prev: this.savedClipboard[section].rows[from].content.info.prev,
                        next: this.savedClipboard[section].rows[from + 1].content.info.next
                    }
                    section === 0 ? this.kernel.storage.updatePin(fromNextItem) : this.kernel.storage.update(fromNextItem)
                    this.savedClipboard[section].rows[from + 1] = this.lineData(fromNextItem)
                }
            }
            { // 在 to 上方插入元素
                if (this.savedClipboard[section].rows[to - 1]) {
                    const toPrevItem = { // 原来 to 位置的上一个元素
                        uuid: this.savedClipboard[section].rows[to - 1].content.info.uuid,
                        text: this.savedClipboard[section].rows[to - 1].content.info.text,
                        prev: this.savedClipboard[section].rows[to - 1].content.info.prev,
                        next: oldFromItem.uuid // 指向即将被移动元素的uuid
                    }
                    section === 0 ? this.kernel.storage.updatePin(toPrevItem) : this.kernel.storage.update(toPrevItem)
                    this.savedClipboard[section].rows[to - 1] = this.lineData(toPrevItem)
                }
                const toItem = { // 原来 to 位置的元素
                    uuid: oldToItem.uuid,
                    text: oldToItem.text,
                    prev: oldFromItem.uuid, // 指向即将被移动的元素
                    next: this.savedClipboard[section].rows[to].content.info.next // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                }
                section === 0 ? this.kernel.storage.updatePin(toItem) : this.kernel.storage.update(toItem)
                const fromItem = { // 被移动元素
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
            { // 移动位置
                this.savedClipboard[section].rows.splice(to, 0, this.savedClipboard[section].rows[from])
                this.savedClipboard[section].rows.splice(from > to ? from + 1 : from, 1)
                this.kernel.storage.commit() // 提交事务
                // 去掉补位元素
                if (this.savedClipboard[section].rows[to].content.info.uuid === null) {
                    this.savedClipboard[section].rows.splice(to, 1)
                }
            }
            { // 操作 UI
                // 去除偏移
                const _to = from < to ? to - 1 : to
                const listView = $(this.listId)
                // 移动列表
                if (from < _to) { // 从上往下移动
                    listView.insert({
                        indexPath: $indexPath(section, to),
                        value: this.savedClipboard[section].rows[_to]
                    })
                    listView.delete($indexPath(section, from))
                } else { // 从下往上移动
                    listView.delete($indexPath(section, from))
                    listView.insert({
                        indexPath: $indexPath(section, to),
                        value: this.savedClipboard[section].rows[to]
                    })
                }
                // 修正指示器
                if (this.copied?.indexPath !== undefined) {
                    const copiedIndex = this.copied.indexPath
                    const copiedUUID = this.copied.uuid
                    if (copiedIndex === from) { // 被移动的行是被复制的行
                        this.setCopied(copiedUUID, $indexPath(section, _to))
                    } else if (
                        copiedIndex > from && copiedIndex < _to
                        || copiedIndex < from && copiedIndex > _to
                        || copiedIndex === _to
                    ) { // 被复制的行介于 from 和 _to 之间或等于 _to
                        // 从上往下移动则 -1 否则 +1
                        this.setCopied(copiedUUID, $indexPath(section, from < _to ? copiedIndex - 1 : copiedIndex + 1))
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
    copy(text, uuid, indexPath, isMoveToTop = true) {
        // 复制到剪切板
        $clipboard.text = text
        // 将被复制的行移动到最前端
        if (isMoveToTop) this.move(indexPath.row, 0, indexPath.section)
        // 写入缓存并更新数据
        this.setCopied(uuid, isMoveToTop ? $indexPath(indexPath.section, 0) : indexPath)
    }

    delete(uuid, indexPath) {
        const section = indexPath.section
        const index = indexPath.row
        // 删除数据库中的值
        this.kernel.storage.beginTransaction()
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
        // 删除内存中的值
        this.savedClipboard[section].rows.splice(index, 1)
        // 删除列表中的行
        // 删除剪切板信息
        if (this.copied?.uuid === uuid) {
            this.setCopied(null)
        }
    }

    update(uuid, text, indexPath) {
        const info = $(this.listId).cell(indexPath).get("content").info
        const lineData = this.lineData(Object.assign(info, { text, text }), info.uuid === this.copied?.uuid)
        this.savedClipboard[indexPath.section].rows[indexPath.row] = lineData
        $(this.listId).data = this.savedClipboard
        if (uuid === this.copied?.uuid) {
            $clipboard.text = text
        }
        return indexPath.section === 0 ? this.kernel.storage.updateTextPin(uuid, text) : this.kernel.storage.updateText(uuid, text)
    }

    add(text) {
        if (text.trim() === "") return
        // 元数据
        const data = {
            uuid: this.kernel.uuid(),
            text: text,
            prev: null,
            next: this.savedClipboard[1].rows[0] ? this.savedClipboard[1].rows[0].content.info.uuid : null
        }
        // 写入数据库
        this.kernel.storage.beginTransaction()
        this.kernel.storage.insert(data)
        if (data.next) {
            // 更改指针
            this.kernel.storage.update({
                uuid: this.savedClipboard[1].rows[0].content.info.uuid,
                text: this.savedClipboard[1].rows[0].content.info.text,
                prev: data.uuid,
                next: this.savedClipboard[1].rows[0].content.info.next
            })
            this.savedClipboard[1].rows[0].content.info.prev = data.uuid
        }
        this.kernel.storage.commit()
        // 格式化数据
        const lineData = this.lineData(data)
        lineData.copied.hidden = false // 强制显示指示器
        this.savedClipboard[1].rows.unshift(lineData) // 保存到内存中
        // 在列表中插入行
        $(this.listId).insert({
            indexPath: $indexPath(1, 0),
            value: lineData
        })
        // 只更新数据，不更新指示器
        if (this.copied?.indexPath !== undefined)
            this.setCopied(this.copied.uuid, $indexPath(this.copied.indexPath.section, this.copied.indexPath.row + 1), false)
        // 复制新添加的元素
        this.copy(text, data.uuid, $indexPath(1, 0), false)
    }

    edit(text, callback) {
        this.kernel.editor.push(text, text => {
            callback(text)
        }, "", [
            {
                symbol: "square.and.arrow.up",
                tapped: () => {
                    if (this.kernel.editor.text) {
                        $share.sheet(this.kernel.editor.text)
                    } else {
                        $ui.warning($l10n("NONE"))
                    }
                }
            }
        ])
    }

    getAddTextView() {
        this.edit("", text => {
            if (text !== "") this.add(text)
        })
    }

    lineData(data, indicator = false) {
        const sliceText = text => {
            // 显示最大长度
            const textMaxLength = this.kernel.setting.get("clipboard.textMaxLength")
            return text.length > textMaxLength ? text.slice(0, textMaxLength) + "..." : text
        }

        const text = sliceText(data.text)
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
                    section: data.section,
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
        const initData = (data, section) => {
            const dataObj = {}
            let length = 0
            let header = null
            data.forEach(item => {
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
                let maxLoop = this.kernel.setting.get("clipboard.maxItemLength") // 控制显示行数
                while (p.next !== null && maxLoop > 0) {
                    maxLoop--
                    sorted.push(p)
                    p = dataObj[p.next]
                }
                sorted.push(p) // 将最后一个元素推入
            }
            return sorted.map((data, index) => {
                if (data.uuid === this.copied?.uuid) { // 初始化索引
                    this.setCopied(data.uuid, $indexPath(section, index), false)
                }
                return this.lineData(data, this.copied?.uuid === data.uuid)
            })
        }
        const data = [
            {
                rows: initData(this.kernel.storage.allPin(), 0) ?? []
            },
            {
                rows: initData(this.kernel.storage.all(), 1) ?? []
            }
        ]
        return data
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
        const actions = this.kernel.actionManager.getActions("clipboard").map(action => {
            const actionHandler = this.kernel.actionManager.getActionHandler(action.type, action.dir)
            action.handler = handlerRewrite(actionHandler)
            action.title = action.name
            action.symbol = action.icon
            return action
        })
        return actions.concat([
            {
                inline: true,
                items: [
                    {
                        title: $l10n("SHARE"),
                        symbol: "square.and.arrow.up",
                        handler: (sender, indexPath) => {
                            const data = sender.object(indexPath)
                            $share.sheet(data.content.info.text)
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
                            this.kernel.deleteConfirm(
                                $l10n("CONFIRM_DELETE_MSG"),
                                () => {
                                    const data = sender.object(indexPath)
                                    this.delete(data.content.info.uuid, indexPath)
                                    sender.delete(indexPath)
                                }
                            )
                        }
                    }
                ]
            }
        ])
    }

    getListView() {
        return { // 剪切板列表
            type: "list",
            props: {
                id: this.listId,
                menu: {
                    items: this.menuItems(this.kernel)
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
                actions: [
                    { // 复制
                        title: $l10n("COPY"),
                        color: $color("systemLink"),
                        handler: (sender, indexPath) => {
                            const data = sender.object(indexPath)
                            this.copy(data.content.info.text, data.content.info.uuid, indexPath)
                        }
                    },
                    { // 置顶
                        title: $l10n("PIN"),
                        color: $color("orange"),
                        handler: (sender, indexPath) => {
                            const content = sender.object(indexPath).content.info
                            delete content.height
                            this.pin(content, indexPath)
                        }
                    },
                    { // 删除
                        title: " " + $l10n("DELETE") + " ", // 防止JSBox自动更改成默认的删除操作
                        color: $color("red"),
                        handler: (sender, indexPath) => {
                            this.kernel.deleteConfirm(
                                $l10n("CONFIRM_DELETE_MSG"),
                                () => {
                                    const data = sender.object(indexPath)
                                    this.delete(data.content.info.uuid, indexPath)
                                    sender.delete(indexPath)
                                }
                            )
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
                            this.update(content.info.uuid, text, indexPath)
                    })
                }
            }
        }
    }

    getPageView() {
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
                                                    this.delete(data.content.info.uuid, indexPath)
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
                                            this.reorder.content = this.savedClipboard[indexPath.section].rows[indexPath.row].content
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
        pageController
            .navigationController
            .navigationBar
            .setBackgroundColor($color("primarySurface"))
            .withoutStatusBarHeight()
        pageController.setView(this.getListView())
        return pageController.getPage()
    }
}

module.exports = Clipboard