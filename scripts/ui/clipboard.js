class Clipboard {
    constructor(kernel) {
        this.kernel = kernel
        // 剪贴板列个性化设置
        this.edges = 20 // 列表边距
        this.fontSize = 16 // 字体大小
        this.copiedIndicatorSize = 7 // 已复制指示器（小绿点）大小
        // 数据
        this.setCopied()
        this.savedClipboard = this.getSavedClipboard()
        this.reorder = {}
    }

    setCopied(uuid, index) {
        if (uuid === undefined) {
            const res = this.kernel.storage.getByMD5($text.MD5($clipboard.text))
            if (res) this.setCopied(res.uuid)
        } else {
            this.copied = {
                uuid: uuid,
                index: index
            }
            $cache.set("clipboard.copied", this.copied)
        }
    }

    readClipboard() {
        if ($cache.get("clipboard.copied"))
            this.copied = $cache.get("clipboard.copied")
        $("clipboard-list").data = this.getSavedClipboard()
        const md5 = $text.MD5($clipboard.text)
        const res = this.kernel.storage.getByMD5(md5)
        if (this.copied?.uuid === res?.uuid && res?.uuid !== undefined) {
            $("clipboard-list").cell($indexPath(0, this.copied?.index)).get("copied").hidden = false
        } else if ($clipboard.text) {
            if (res.md5 !== md5)
                this.add($clipboard.text)
        }
    }

    update(uuid, text, index) {
        const sender = $("clipboard-list")
        sender.cell($indexPath(0, index)).get("content").text = text
        this.savedClipboard[index].content.text = text
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
        this.kernel.storage.beginTransaction()
        try {
            const oldFromItem = {
                uuid: this.savedClipboard[from].content.info.uuid,
                text: this.savedClipboard[from].content.text
            }
            const oldToItem = {
                uuid: this.savedClipboard[to].content.info.uuid,
                text: this.savedClipboard[to].content.text
            }
            { // 删除元素
                if (this.savedClipboard[from - 1]) {
                    const fromPrevItem = { // from 位置的上一个元素
                        uuid: this.savedClipboard[from - 1].content.info.uuid,
                        text: this.savedClipboard[from - 1].content.text,
                        prev: this.savedClipboard[from - 1].content.info.prev,
                        next: this.savedClipboard[from].content.info.next
                    }
                    this.kernel.storage.update(fromPrevItem)
                    this.savedClipboard[from - 1] = this.lineData(fromPrevItem)
                }
                if (this.savedClipboard[from + 1]) {
                    const fromNextItem = { // from 位置的下一个元素
                        uuid: this.savedClipboard[from + 1].content.info.uuid,
                        text: this.savedClipboard[from + 1].content.text,
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
                        text: this.savedClipboard[to - 1].content.text,
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
                this.kernel.storage.commit()
                // 去掉补位元素
                if (this.savedClipboard[to].content.info.uuid === null) {
                    this.savedClipboard.splice(to, 1)
                }
            }
            { // 操作 UI
                // 去除偏移
                const _to = from < to ? to - 1 : to
                const sender = $("clipboard-list")
                if (this.copied.index === from) { // 被移动的行是被复制的行
                    // 显示 _to 指示器
                    this.savedClipboard[_to].copied.hidden = false
                    // 更新 this.copied
                    this.setCopied(this.copied.uuid, _to)
                } else if (
                    this.copied.index > from && this.copied.index < _to
                    || this.copied.index < from && this.copied.index > _to
                    || this.copied.index === _to
                ) { // 被复制的行介于 from 和 _to 之间或等于 _to
                    // 从上往下移动则 -1 否则 +1
                    this.setCopied(this.copied.uuid, from < _to ? this.copied.index - 1 : this.copied.index + 1)
                }
                // 移动列表
                if (from < _to) { // 从上往下移动
                    sender.insert({
                        indexPath: $indexPath(0, to),
                        value: this.savedClipboard[_to]
                    })
                    sender.delete(from)
                } else { // 从下往上移动
                    sender.delete(from)
                    sender.insert({
                        indexPath: $indexPath(0, to),
                        value: this.savedClipboard[to]
                    })
                }
            }
        } catch (error) {
            this.kernel.storage.rollback()
            throw error
        }
    }

    copy(text, uuid, index) {
        // 复制到剪切板
        $clipboard.text = text
        const sender = $("clipboard-list")
        // 隐藏旧指示器
        const copied = sender.cell($indexPath(0, this.copied?.index))
        if (copied) copied.get("copied").hidden = true
        // 将被复制的行移动到最前端
        if (index !== undefined) {
            this.move(index, 0)
            // 显示新指示器
            sender.scrollToOffset($point(0, 0))
            setTimeout(() => {
                sender.cell($indexPath(0, 0)).get("copied").hidden = false
            }, 350)
        }
        // 写入缓存，将忽略 this.move 对 this.copied 产生的影响
        this.setCopied(uuid, 0) // 手动排序后索引更改
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
                text: this.savedClipboard[0].content.text,
                prev: data.uuid,
                next: this.savedClipboard[0].content.info.next
            })
            this.savedClipboard[0].content.info.prev = data.uuid
        }
        this.kernel.storage.commit()
        /**
         * 格式化数据
         */
        const lineData = this.lineData(data)
        lineData.copied.hidden = false // 强制显示指示器
        this.savedClipboard.unshift(lineData) // 保存到内存中
        // 复制新添加的元素
        this.copy(text, data.uuid)
        // 在列表中插入行
        $("clipboard-list").insert({
            indexPath: $indexPath(0, 0),
            value: lineData
        })
    }

    delete(uuid, sender, index) {
        // 删除数据库中的值
        this.kernel.storage.beginTransaction()
        this.kernel.storage.delete(uuid)
        // 更改指针
        if (this.savedClipboard[index - 1]) {
            const prevItem = {
                uuid: this.savedClipboard[index - 1].content.info.uuid,
                text: this.savedClipboard[index - 1].content.text,
                prev: this.savedClipboard[index - 1].content.info.prev,
                next: this.savedClipboard[index].content.info.next // next 指向被删除元素的 next
            }
            this.kernel.storage.update(prevItem)
            this.savedClipboard[index - 1] = this.lineData(prevItem)
        }
        if (this.savedClipboard[index + 1]) {
            const nextItem = {
                uuid: this.savedClipboard[index + 1].content.info.uuid,
                text: this.savedClipboard[index + 1].content.text,
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
        sender.delete(index)
        // 删除剪切板信息
        if (this.copied.uuid === uuid) {
            this.setCopied(null)
            $clipboard.clear()
        }
    }

    lineData(data) {
        // 显示最大长度
        const textMaxLength = this.kernel.setting.get("clipboard.textMaxLength")
        const text = data.text.length > textMaxLength ? data.text.slice(0, textMaxLength) + "..." : data.text
        const size = $text.sizeThatFits({
            text: text,
            width: $device.info.screen.width,
            font: $font(this.fontSize)
        })
        return {
            content: {
                text: text,
                info: {
                    uuid: data.uuid,
                    md5: data.md5,
                    height: size.height,
                    prev: data.prev,
                    next: data.next
                }
            },
            copied: { hidden: this.copied?.uuid !== data.uuid }
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
            if (data.uuid === this.copied?.uuid) {
                this.setCopied(data.uuid, index)
            }
            return this.lineData(data)
        })
    }

    searchAction(text) {
        try {
            if (text === "") {
                $("clipboard-list").data = this.savedClipboard
            } else {
                const res = this.kernel.storage.search(text)
                if (res && res.length > 0)
                    $("clipboard-list").data = res.map(data => this.lineData(data))
            }
        } catch (error) {
            $("clipboard-list").data = this.savedClipboard
            throw error
        }
    }

    navButtons() {
        return [
            this.kernel.UIKit.navButton("add", "plus.circle", () => {
                this.kernel.editor.push("", text => {
                    if (text !== "") this.add(text)
                }, $l10n("CLIPBOARD"))
            }),
            this.kernel.getActionButton({
                text: () => this.copied === undefined ? null : this.kernel.storage.getByUUID(this.copied.uuid).text
            }, "clipboard"),
            this.kernel.UIKit.navButton("reorder", "arrow.up.arrow.down.circle", (animate, sender) => {
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
                        { // canvas
                            type: "canvas",
                            layout: (make, view) => {
                                make.top.equalTo(view.prev.bottom)
                                make.height.equalTo(1 / $device.info.screen.scale)
                                make.left.right.inset(0)
                            },
                            events: {
                                draw: (view, ctx) => {
                                    ctx.strokeColor = $color("separatorColor")
                                    ctx.setLineWidth(1)
                                    ctx.moveToPoint(0, 0)
                                    ctx.addLineToPoint(view.frame.width, 0)
                                    ctx.strokePath()
                                }
                            }
                        },
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
                                                make.left.inset(this.edges / 2 - this.copiedIndicatorSize / 2)
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
                                }
                            },
                            events: {
                                rowHeight: (sender, indexPath) => {
                                    const content = sender.object(indexPath).content ?? this.reorder.content
                                    return content.info.height + this.edges * 2 + 1
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
            })
        ]
    }

    menuItems() {
        const handlerRewrite = handler => {
            return (sender, indexPath) => {
                const item = sender.object(indexPath)
                const data = {
                    text: item.content.text,
                    uuid: item.content.info.uuid
                }
                handler(data)
            }
        }
        return this.kernel.getActions("clipboard").map(action => {
            action.handler = handlerRewrite(action.handler)
            action.title = action.name
            return action
        })
    }

    getViews() {
        return [ // 水平安全距离由 EasyJsBox 提供
            { // 顶部按钮栏
                type: "view",
                props: { bgcolor: $color("primarySurface") },
                views: [{
                    type: "view",
                    views: this.navButtons(),
                    layout: (make, view) => {
                        make.top.equalTo(view.super.safeAreaTop)
                        make.size.equalTo(view.super.safeArea)
                    }
                }],
                layout: (make, view) => {
                    make.top.equalTo(view.super)
                    make.bottom.equalTo(view.super.safeAreaTop).offset(50)
                    make.left.right.equalTo(view.super.safeArea)
                }
            },
            { // 剪切板列表
                type: "list",
                props: {
                    id: "clipboard-list",
                    menu: {
                        title: $l10n("ACTION"),
                        items: this.menuItems()
                    },
                    indicatorInsets: $insets(0, 0, 50, 0),
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
                    header: {
                        type: "view",
                        props: {
                            height: 90,
                            clipsToBounds: true
                        },
                        views: [
                            {
                                type: "label",
                                props: {
                                    text: $l10n("CLIPBOARD"),
                                    font: $font("bold", 35)
                                },
                                layout: (make, view) => {
                                    make.left.equalTo(view.super).offset(20)
                                    make.top.equalTo(view.super)
                                }
                            },
                            {
                                type: "input",
                                props: {
                                    type: $kbType.search,
                                    placeholder: $l10n("SEARCH")
                                },
                                layout: (make, view) => {
                                    make.centerX.equalTo(view.super)
                                    make.top.equalTo(view.prev.bottom).offset(10)
                                    make.left.right.inset(20)
                                    make.height.equalTo(35)
                                },
                                events: {
                                    changed: sender => this.searchAction(sender.text)
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
                                this.copy(data.content.text, data.content.info.uuid, indexPath.row)
                            }
                        },
                        { // 删除
                            title: $l10n("DELETE"),
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
                                                this.delete(data.content.info.uuid, sender, indexPath.row)
                                            }
                                        },
                                        { title: $l10n("CANCEL") }
                                    ]
                                })
                            }
                        }
                    ]
                },
                events: {
                    ready: () => {
                        setTimeout(() => this.readClipboard(), 500)
                        $app.listen({
                            // 在应用恢复响应后调用
                            resume: () => {
                                setTimeout(() => this.readClipboard(), 500)
                            }
                        })
                    },
                    rowHeight: (sender, indexPath) => {
                        const content = sender.object(indexPath).content
                        return content.info.height + this.edges * 2 + 1
                    },
                    didSelect: (sender, indexPath, data) => {
                        const content = this.savedClipboard[indexPath.row].content
                        this.kernel.editor.push(content.text, text => {
                            if (content.info.md5 !== $text.MD5(text)) this.update(content.info.uuid, text, indexPath.row)
                        }, $l10n("CLIPBOARD"))
                    }
                },
                layout: (make, view) => {
                    make.bottom.equalTo(view.super)
                    make.top.equalTo(view.prev.bottom)
                    make.left.right.equalTo(view.super.safeArea)
                }
            }
        ]
    }
}

module.exports = Clipboard