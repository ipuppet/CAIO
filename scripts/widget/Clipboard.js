class ClipboardWidget {
    constructor(kernel) {
        this.kernel = kernel
        this.baseUrlScheme = `jsbox://run?name=${this.kernel.name}&widget=${this.widget}`
        this.urlScheme = {
            add: `${this.baseUrlScheme}&add=1`,
            copy: uuid => `${this.baseUrlScheme}&copy=${uuid}`
        }
        this.length = 0 // 统计剪切板总数
        this.viewStyle = {
            topItemSize: 32, // 2x2加号和计数大小
            tipTextColor: "orange", // 2x2加号和计数大小
        }
    }

    getSavedClipboard(family) {
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
        this.length = length
        // 排序
        const sorted = []
        if (length > 0) {
            let p = dataObj[header]
            let maxLoop = (() => {
                switch (family) {
                    case 0: return 1
                    case 1: return 5
                    case 1: return 10
                }
            })() // 控制显示行数
            while (p.next !== null && maxLoop > 1) {
                maxLoop--
                sorted.push(p)
                p = dataObj[p.next]
                if (p === undefined) {
                    throw $l10n("CLIPBOARD_STRUCTURE_ERROR")
                }
            }
            sorted.push(p) // 将最后一个元素推入
        }
        return sorted.map((data, index) => {
            return {
                text: data.text,
                uuid: data.uuid
            }
        })
    }

    view2x2(clipboardList) {
        return {
            type: "vstack",
            props: {
                alignment: $widget.horizontalAlignment.leading,
                spacing: 0,
                padding: 15,
                widgetURL: this.urlScheme.add
            },
            views: [
                { // 顶部
                    type: "hstack",
                    views: [
                        {
                            type: "image",
                            props: {
                                symbol: {
                                    glyph: "plus.circle.fill",
                                    size: this.viewStyle.topItemSize
                                },
                                color: $color("systemLink")
                            }
                        },
                        { type: "spacer" },
                        {
                            type: "text",
                            props: {
                                font: $font("bold", this.viewStyle.topItemSize),
                                text: String(this.length)
                            }
                        }
                    ]
                },
                { type: "spacer" },
                { // 底部
                    type: "vstack",
                    props: {
                        alignment: $widget.horizontalAlignment.leading,
                        spacing: 0
                    },
                    views: [
                        {
                            type: "text",
                            props: {
                                color: $color(this.viewStyle.tipTextColor),
                                text: $l10n("RECENT"),
                                font: $font("bold", 16)
                            }
                        },
                        {
                            type: "text",
                            props: {
                                text: clipboardList[0] ? clipboardList[0].text : "",
                                font: $font(12)
                            }
                        }
                    ]
                }
            ]
        }
    }

    view2x4(clipboardList) {
        return {
            type: "hstack",
            props: {
                alignment: $widget.horizontalAlignment.leading,
                spacing: 0,
                padding: 15
            },
            views: [
                { // 左侧
                    type: "vstack",
                    props: {
                        alignment: $widget.horizontalAlignment.leading,
                        spacing: 0
                    },
                    views: [
                        {
                            type: "image",
                            props: {
                                symbol: {
                                    glyph: "plus.circle.fill",
                                    size: this.viewStyle.topItemSize
                                },
                                link: this.urlScheme.add,
                                color: $color("systemLink")
                            }
                        },
                        { type: "spacer" },
                        {
                            type: "text",
                            props: {
                                font: $font("bold", this.viewStyle.topItemSize),
                                text: String(this.length)
                            }
                        },
                        { // 提示文字
                            type: "text",
                            props: {
                                color: $color(this.viewStyle.tipTextColor),
                                text: $l10n("CLIPBOARD"),
                                font: $font("bold", 16)
                            }
                        }
                    ]
                },
                {
                    type: "spacer",
                    props: { frame: { maxWidth: 50 } }
                },
                { // 右侧
                    type: "vstack",
                    props: {
                        alignment: $widget.horizontalAlignment.leading,
                        spacing: 0
                    },
                    views: (() => {
                        const result = []
                        let i = 0
                        clipboardList.map(item => {
                            if (i !== 0 && i !== 5) {
                                result.push({ type: "divider" })
                            }
                            result.push({
                                type: "text",
                                props: {
                                    text: item.text,
                                    lineLimit: 1,
                                    font: $font(14),
                                    link: `${this.urlScheme.copy(item.uuid)}`,
                                    frame: {
                                        maxHeight: Infinity,
                                        maxWidth: Infinity,
                                        alignment: $widget.alignment.leading
                                    }
                                }
                            })
                            i++
                        })
                        return result
                    })()
                }
            ]
        }
    }

    view4x4(clipboardList) {
        return this.view2x2(clipboardList)
    }

    render() {
        const nowDate = Date.now()
        const expireDate = new Date(nowDate + 1000 * 60 * 10)// 每十分钟切换
        $widget.setTimeline({
            entries: [
                {
                    date: nowDate,
                    info: {}
                }
            ],
            policy: {
                afterDate: expireDate
            },
            render: ctx => {
                const clipboardList = this.getSavedClipboard(ctx.family)
                let view
                switch (ctx.family) {
                    case 0:
                        view = this.view2x2(clipboardList)
                        break
                    case 1:
                        view = this.view2x4(clipboardList)
                        break
                    case 2:
                        view = this.view4x4(clipboardList)
                        break
                    default:
                        view = this.view2x2()
                }
                return view
            }
        })
    }
}

module.exports = { Widget: ClipboardWidget }