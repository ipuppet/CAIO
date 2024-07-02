/**
 * @typedef {import("../dao/storage")} Storage
 * @typedef {import("../libs/easy-jsbox").Setting} Setting
 */
class ListWidget {
    /**
     * @param {Setting} setting
     * @param {Storage} storage
     */
    constructor({ setting, storage, source, label } = {}) {
        this.setting = setting
        this.storage = storage
        this.baseUrlScheme = `jsbox://run?name=${$addin.current.name}`
        this.urlScheme = {
            clips: this.baseUrlScheme,
            add: `${this.baseUrlScheme}&add=1`,
            actions: `${this.baseUrlScheme}&actions=1`,
            copy: uuid => `${this.baseUrlScheme}&copy=${uuid}`
        }

        this.viewStyle = {
            topItemSize: 32, // 2x2加号和计数大小
            tipTextColor: "orange" // 2x2加号和计数大小
        }
        this.padding = 15
        this.label = label

        this.rawData = this.storage.sort(this.storage.all(source))
        this.rawDataLength = this.rawData.length
    }

    get maxLength() {
        // require this.ctx, this.render()
        switch (this.ctx.family) {
            case 0:
                return 1
            case 1:
                return 5
            case 2:
                return 10
        }
    }

    get data() {
        // require this.maxLength
        return this.rawData.slice(0, this.maxLength)
    }

    view2x2() {
        return {
            type: "vstack",
            props: {
                background: $color("primarySurface"),
                alignment: $widget.horizontalAlignment.leading,
                spacing: 0,
                padding: this.padding,
                widgetURL: (() => {
                    switch (this.setting.get("widget.2x2.widgetURL")) {
                        case 0:
                            return this.urlScheme.add
                        case 1:
                            return this.urlScheme.actions
                        case 2:
                            return this.urlScheme.clips
                    }
                })()
            },
            views: [
                {
                    // 顶部
                    type: "vgrid",
                    props: {
                        columns: [
                            {
                                flexible: {
                                    minimum: 10,
                                    maximum: this.viewStyle.topItemSize
                                },
                                alignment: $widget.alignment.leading
                            },
                            {
                                flexible: {
                                    minimum: 10,
                                    maximum: Infinity
                                },
                                alignment: $widget.alignment.trailing
                            }
                        ]
                    },
                    views: [
                        {
                            type: "image",
                            props: {
                                offset: $point(-2, 0), // 图标圆边与文字对齐
                                symbol: {
                                    glyph: "plus.circle.fill",
                                    size: this.viewStyle.topItemSize
                                },
                                color: $color("systemLink")
                            }
                        },
                        {
                            type: "text",
                            props: {
                                font: $font("bold", this.viewStyle.topItemSize),
                                text: String(this.rawDataLength)
                            }
                        }
                    ]
                },
                { type: "spacer" },
                {
                    // 底部
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
                                text: this.data[0] ? this.data[0].text : "",
                                font: $font(12)
                            }
                        }
                    ]
                }
            ]
        }
    }

    view2x4() {
        return {
            type: "hstack",
            props: {
                background: $color("primarySurface"),
                spacing: 0,
                padding: this.padding,
                widgetURL: this.urlScheme.clips
            },
            views: [
                {
                    // 左侧
                    type: "vstack",
                    props: {
                        alignment: $widget.horizontalAlignment.leading
                    },
                    views: [
                        {
                            type: "image",
                            props: {
                                offset: $point(-2, 0), // 图标圆边与文字对齐
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
                                text: String(this.rawDataLength)
                            }
                        },
                        {
                            // 提示文字
                            type: "text",
                            props: {
                                color: $color(this.viewStyle.tipTextColor),
                                text: this.label,
                                font: $font("bold", 16)
                            }
                        }
                    ]
                },
                {
                    type: "spacer",
                    props: { frame: { maxWidth: this.data.length > 0 ? 25 : Infinity } }
                },
                {
                    // 右侧
                    type: "vstack",
                    props: {
                        spacing: 0,
                        frame: {
                            maxHeight: Infinity,
                            maxWidth: Infinity,
                            alignment: $widget.alignment.topLeading
                        }
                    },
                    views: (() => {
                        const result = []
                        const height = (this.ctx.displaySize.height - this.padding) / this.maxLength
                        this.data.map((item, i) => {
                            if (i !== 0 && i !== this.maxLength) {
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
                                        maxHeight: height,
                                        maxWidth: Infinity,
                                        alignment: $widget.alignment.leading
                                    }
                                }
                            })
                        })
                        return result
                    })()
                }
            ]
        }
    }

    view4x4() {
        return this.view2x4()
    }

    render() {
        const nowDate = Date.now()
        const expireDate = new Date(nowDate + 1000 * 60 * 10) // 每十分钟切换
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
                this.ctx = ctx
                let view
                switch (this.ctx.family) {
                    case 0:
                        view = this.view2x2()
                        break
                    case 1:
                        view = this.view2x4()
                        break
                    case 2:
                        view = this.view4x4()
                        break
                    default:
                        view = this.view2x2()
                }
                return view
            }
        })
    }
}

module.exports = ListWidget
