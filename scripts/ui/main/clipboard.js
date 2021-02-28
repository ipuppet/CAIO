class ClipboardUI {
    constructor(kernel) {
        this.kernel = kernel
        this.screenWidth = $device.info.screen.width
        // 剪贴板列个性化设置
        this.edges = 15 // 表边距
        this.fontSize = 16 // 字体大小
        this.maxLength = 100 // 显示最大长度
        this.copiedIndicatorSize = 7 // 已复制指示器（小绿点）大小
        this.maxItemLength = 100 // 最大显示行数
        // 数据
        this.savedClipboard = this.getSavedClipboard()
    }

    updateCopied() {
        const searchRes = this.kernel.storage.getByText($clipboard.text)
        this.copied = $cache.get("copied") ?? {}
        console.log(this.copied)
        if (this.copied.uuid === searchRes?.uuid) {
            setTimeout(() => {
                $("clipboard-list").cell($indexPath(0, this.copied.index)).get("copied").hidden = false
            }, 500)
        } else {
            this.add($clipboard.text)
        }
    }

    /**
     * 将from位置的元素移动到to位置的元素前面
     * @param {Number} from 
     * @param {Number} to 
     */
    move(from, to) {
        if (from === to) return
        this.kernel.storage.beginTransaction()
        try {
            const oldFromItem = {
                uuid: this.savedClipboard[from].content.info.uuid,
                text: this.savedClipboard[from].content.text,
                prev: this.savedClipboard[from].content.info.prev,
                next: this.savedClipboard[from].content.info.next,
                copied: this.savedClipboard[from].copied.hidden
            }
            const oldToItem = {
                uuid: this.savedClipboard[to].content.info.uuid,
                text: this.savedClipboard[to].content.text,
                prev: this.savedClipboard[to].content.info.prev,
                next: this.savedClipboard[to].content.info.next,
                copied: this.savedClipboard[to].copied.hidden
            }
            // 修改被移动元素移动前受影响元素的指针
            if (this.savedClipboard[from - 1]) {
                const fromPrevItem = { // from 位置的上一个元素
                    uuid: this.savedClipboard[from - 1].content.info.uuid,
                    text: this.savedClipboard[from - 1].content.text,
                    prev: this.savedClipboard[from - 1].content.info.prev,
                    next: this.savedClipboard[from].content.info.next
                }
                this.kernel.storage.update(fromPrevItem)
                this.savedClipboard[from - 1] = this.lineData(fromPrevItem, this.savedClipboard[from - 1].copied.hidden)
            }
            if (this.savedClipboard[from + 1]) {
                const fromNextItem = { // from 位置的下一个元素
                    uuid: this.savedClipboard[from + 1].content.info.uuid,
                    text: this.savedClipboard[from + 1].content.text,
                    prev: this.savedClipboard[from].content.info.prev,
                    next: this.savedClipboard[from + 1].content.info.next
                }
                this.kernel.storage.update(fromNextItem)
                this.savedClipboard[from + 1] = this.lineData(fromNextItem, this.savedClipboard[from + 1].copied.hidden)
            }
            // 修改移动后将受影响元素的指针
            if (this.savedClipboard[to - 1]) {
                const toPrevItem = { // 原来 to 位置的上一个元素
                    uuid: this.savedClipboard[to - 1].content.info.uuid,
                    text: this.savedClipboard[to - 1].content.text,
                    prev: this.savedClipboard[to - 1].content.info.prev,
                    next: this.savedClipboard[from].content.info.uuid // 指向即将被移动元素的uuid
                }
                this.kernel.storage.update(toPrevItem)
                this.savedClipboard[to - 1] = this.lineData(toPrevItem, this.savedClipboard[to - 1].copied.hidden)
            }
            const toItem = { // 原来 to 位置的元素
                uuid: oldToItem.uuid,
                text: oldToItem.text,
                prev: oldFromItem.uuid, // 指向即将被移动的元素
                next: this.savedClipboard[to].content.info.next // 前面的代码可能更改此值，因为 from 左右的元素可能就是 to
            }
            this.kernel.storage.update(toItem)
            const fromItem = { // 被移动元素
                uuid: oldFromItem.uuid,
                text: oldFromItem.text,
                prev: this.savedClipboard[to].content.info.prev, // 前面的代码可能更改此值，因为 from 左右的元素可能就是 to
                next: oldToItem.uuid
            }
            this.kernel.storage.update(fromItem)
            // 修改内存中的值
            this.savedClipboard[to] = this.lineData(toItem, oldToItem.copied)
            this.savedClipboard[from] = this.lineData(fromItem, oldFromItem.copied)
            // 移动位置
            this.savedClipboard.splice(to, 0, this.savedClipboard[from])
            if (from > to) from++
            this.savedClipboard.splice(from, 1)
            // 判断 copied 是否变化
            if (this.copied.index === from) {
                this.copied.index = to
                $cache.set("copied", this.copied)
            }
        } catch (error) {
            this.kernel.storage.rollback()
        }
        this.kernel.storage.commit()
    }

    copy(text, uuid, sender, index) {
        // 复制到剪切板
        $clipboard.text = text
        if (sender) {
            // 更新指示器 此时的this.copied是之前被复制的信息
            this.savedClipboard[index].copied.hidden = false
            if (this.copied.index !== undefined) {
                this.savedClipboard[this.copied.index].copied.hidden = true
                // 修改列表中的指示器
                sender.cell($indexPath(0, this.copied.index)).get("copied").hidden = true
            }
            if (index !== 0) {
                // 移动行
                sender.delete(index)
                sender.insert({
                    indexPath: $indexPath(0, 0),
                    value: this.savedClipboard[index]
                })
            } else {
                // 显示指示器
                sender.cell($indexPath(0, index)).get("copied").hidden = false
            }
            // 将被复制的行移动到最前端
            this.move(index, 0)
        }
        // 写入缓存
        this.copied = {
            uuid: uuid,
            index: 0 // 手动排序后此值更改
        }
        $cache.set("copied", this.copied)
    }

    add(text) {
        // 元数据
        const data = {
            uuid: this.kernel.uuid(),
            text: text,
            prev: null,
            next: this.savedClipboard[0]?.content.info.uuid
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
        }
        this.kernel.storage.commit()
        // 格式化数据
        const lineData = this.lineData(data, data.uuid)
        // 保存到内存中
        this.savedClipboard.unshift(lineData)
        // 在列表中插入行
        const sender = $("clipboard-list")
        sender.insert({
            indexPath: $indexPath(0, 0),
            value: lineData
        })
        // 修改列表中的指示器
        const next = sender.cell($indexPath(0, 1))
        if (next) next.get("copied").hidden = true
        // 复制新添加的元素
        this.copy(text, data.uuid)
    }

    delete(uuid, sender, index) {
        // 删除数据库中的值
        this.kernel.storage.beginTransaction()
        this.kernel.storage.delete(uuid)
        if (this.copied.uuid === uuid) $clipboard.clear()
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
    }

    lineData(data, copied) {
        const text = data.text.length > this.maxLength ? data.text.slice(0, this.maxLength) + "..." : data.text
        const size = $text.sizeThatFits({
            text: text,
            width: this.screenWidth,
            font: $font(this.fontSize)
        })
        return {
            content: {
                text: text,
                info: {
                    uuid: data.uuid,
                    height: size.height,
                    prev: data.prev,
                    next: data.next
                }
            },
            copied: { hidden: copied !== data.uuid }
        }
    }

    getSavedClipboard(copied) {
        const dataObj = {}
        let length = 0
        let header = null
        this.kernel.storage.all().forEach(data => {
            // 构建结构
            dataObj[data.uuid] = data
            // 寻找头节点
            if (data.prev === null) {
                header = data.uuid
            }
            // 统计长度
            length++
        })
        // 排序
        const sorted = []
        if (length > 0) {
            let p = dataObj[header]
            let maxLoop = this.maxItemLength // 控制显示行数
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
        return sorted.map(data => this.lineData(data, copied))
    }

    getActions() {
        // TODO Actions
        const actions = [
            {
                title: "Action 1",
                handler: (data) => {
                    console.log(data.text)
                    console.log(data.uuid)
                }
            }
        ]
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
        return actions.map(action => {
            action.handler = handlerRewrite(action.handler)
            return action
        })
    }

    getViews() {
        return [
            { // 顶部按钮栏
                type: "view",
                views: [
                    this.kernel.UIKit.navButton("add", "plus.circle.fill", () => {
                        $input.text({
                            placeholder: "Input",
                            handler: data => this.add(data)
                        })
                    })
                ],
                layout: (make, view) => {
                    make.top.width.equalTo(view.super)
                    make.height.equalTo(40)
                }
            },
            { // 剪切板列表
                type: "list",
                props: {
                    id: "clipboard-list",
                    reorder: true, // 拖动排序
                    bgcolor: $color("clear"),
                    indicatorInsets: $insets(30, 0, 50, 0),
                    separatorInset: $insets(0, 15, 0, 0),
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
                    // TODO 长按菜单和拖动排序共存
                    /* menu: {
                        title: $l10n("ACTION"),
                        items: this.getActions()
                    }, */
                    header: {
                        type: "view",
                        props: {
                            height: 85,
                            clipsToBounds: true
                        },
                        views: [
                            {
                                type: "label",
                                props: {
                                    text: $l10n("CLIPBOARD"),
                                    font: $font("bold", 30)
                                },
                                layout: make => make.left.inset(15)
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
                                    make.left.right.inset(15)
                                    make.height.equalTo(35)
                                },
                                events: {
                                    changed: sender => {
                                        // TODO 搜索
                                    }
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
                                this.copy(data.content.text, data.content.info.uuid, sender, indexPath.row)
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
                        this.updateCopied()
                    },
                    rowHeight: (sender, indexPath) => {
                        const content = sender.object(indexPath).content ?? this.reorder
                        return content.info.height + this.edges * 2 + 1
                    },
                    reorderBegan: indexPath => {
                        this.reorder = this.savedClipboard[indexPath.row].content
                    },
                    reorderMoved: (fromIndexPath, toIndexPath) => {
                        this.move(fromIndexPath.row, toIndexPath.row)
                    }
                },
                layout: (make, view) => {
                    make.bottom.width.equalTo(view.super)
                    make.top.equalTo(view.prev.bottom)
                }
            }
        ]
    }
}

module.exports = ClipboardUI