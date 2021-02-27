class ClipboardUI {
    constructor(kernel) {
        this.kernel = kernel
        this.copied = $cache.get("copied") ?? {}
        this.screenWidth = $device.info.screen.width
        // 内存中的剪切板数据
        this.savedClipboard = []
        // 剪贴板列个性化设置
        this.edges = 15 // 表边距
        this.fontSize = 16 // 字体大小
        this.maxLength = 100 // 显示最大长度
        this.copiedIndicatorSize = 7 // 已复制指示器（小绿点）大小
    }

    copy(text, uuid, sender, indexPath) {
        // 复制到剪切板
        $clipboard.text = text
        // 写入缓存
        $cache.set("copied", uuid)
        this.copied = {
            uuid: uuid,
            indexPath: indexPath
        }
        // 更改内存中的值
        this.savedClipboard[indexPath.row].copied.hidden = false
        this.savedClipboard[this.copied.indexPath.row].copied.hidden = true
        // 更改列表中的行
        if (sender) {
            const data = this.savedClipboard[indexPath.row]
            sender.delete(indexPath)
            sender.insert({
                indexPath: $indexPath(0, 0),
                value: data
            })
        }
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
        this.kernel.storage.insert(data)
        // 格式化数据
        const lineData = this.lineData(data, true)
        // 保存到内存中
        this.savedClipboard.unshift(lineData)
        // 在列表中插入行
        $("clipboard-list").insert({
            indexPath: $indexPath(0, 0),
            value: lineData
        })
        // 复制新添加的元素
        this.copy(text, data.uuid)
    }

    delete(uuid, sender, indexPath) {
        // 删除数据库中的值
        const res = this.kernel.storage.delete(uuid)
        if (res && this.copied.uuid === uuid) {
            $clipboard.clear()
        }
        // 删除内存中的值
        this.savedClipboard.splice(this.savedClipboard.findIndex(item => item.uuid === uuid), 1)
        // 删除列表中的行
        if (sender)
            sender.delete(indexPath)
        return res
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
                    height: size.height
                }
            },
            copied: { hidden: copied !== data.uuid }
        }
    }

    getSavedClipboard(copied) {
        const data = this.kernel.storage.all()
        return this.savedClipboard = data.map(data => this.lineData(data, copied))
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
            {
                type: "view",
                views: [
                    this.kernel.UIKit.navButton("add", "plus.circle.fill", () => {
                        const text = "CAE Clipboard And Editor"
                        this.add(text)
                    })
                ],
                layout: (make, view) => {
                    make.top.width.equalTo(view.super)
                    make.height.equalTo(40)
                }
            },
            {
                type: "list",
                props: {
                    id: "clipboard-list",
                    reorder: true, // 拖动排序
                    bgcolor: $color("clear"),
                    indicatorInsets: $insets(30, 0, 50, 0),
                    separatorInset: $insets(0, 15, 0, 0),
                    data: this.getSavedClipboard(this.copied.uuid),
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
                                this.copy(data.content.text, data.content.info.uuid, sender, indexPath)
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
                                                if (this.delete(data.content.info.uuid, sender, indexPath)) {
                                                    $ui.success($l10n("DELETE_SUCCESS"))
                                                } else {
                                                    $ui.error($l10n("DELETE_ERROR"))
                                                }
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
                    rowHeight: (sender, indexPath) => {
                        const content = sender.object(indexPath).content ?? this.reorder
                        return content.info.height + this.edges * 2 + 1
                    },
                    reorderBegan: indexPath => {
                        this.reorder = this.savedClipboard[indexPath.row].content
                    },
                    reorderFinished: data => {
                        this.savedClipboard = data
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