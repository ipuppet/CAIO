const { TodayPinActions } = require("../ui/components/today-actions")

/**
 * @typedef {import("../app-main").AppKernel} AppKernel
 */
class ActionsWidget {
    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel = {}) {
        this.kernel = kernel
        this.baseUrlScheme = `jsbox://run?name=${$addin.current.name}`

        this.todayPinActions = new TodayPinActions(this.kernel)
        this.actions = this.todayPinActions.getActions()
        if (this.actions.length === 0) {
            this.actions = Object.values(this.kernel.actions.allActions)
        }
    }

    get maxLength() {
        // require this.ctx, this.render()
        switch (this.ctx.family) {
            case 0:
                return 1
            case 1:
                return 4
            case 2:
                return 8
        }
    }

    get data() {
        // require this.maxLength
        return this.actions.slice(0, this.maxLength)
    }

    getUrlScheme(action) {
        return this.baseUrlScheme + `&runAction=${$text.base64Encode(JSON.stringify(action))}`
    }

    view2x2() {
        const action = this.data[0]
        return {
            type: "vstack",
            props: {
                alignment: $widget.horizontalAlignment.leading,
                spacing: 0,
                padding: 10,
                widgetURL: this.getUrlScheme(action)
            },
            views: [
                {
                    type: "hstack",
                    props: {
                        frame: {
                            maxWidth: Infinity,
                            alignment: $widget.alignment.leading
                        }
                    },
                    views: [
                        {
                            type: "hstack",
                            modifiers: [
                                {
                                    background: $color(action.color),
                                    frame: {
                                        width: 50,
                                        height: 50
                                    }
                                },
                                {
                                    cornerRadius: {
                                        value: 10,
                                        style: 1 // 0: circular, 1: continuous
                                    }
                                }
                            ],
                            views: [
                                {
                                    type: "image",
                                    props: {
                                        symbol: {
                                            glyph: action.icon,
                                            size: 32
                                        },
                                        color: $color("#ffffff")
                                    }
                                }
                            ]
                        }
                    ]
                },
                { type: "spacer" },
                {
                    // 底部
                    type: "vstack",
                    props: {
                        frame: {
                            maxWidth: Infinity,
                            alignment: $widget.alignment.trailing
                        },
                        spacing: 0
                    },
                    views: [
                        {
                            type: "text",
                            props: {
                                text: action.name,
                                font: $font(18),
                                bold: true,
                                color: $color("primaryText")
                            }
                        }
                    ]
                }
            ]
        }
    }

    view2x4() {
        const actions = this.data
        const length = actions.length
        const views = []

        const height = this.ctx.displaySize.height
        const width = this.ctx.displaySize.width
        const padding = 28
        const itemHeight = (height - padding * (this.maxLength / 2 + 1)) / (this.maxLength / 2)
        const itemWidth = (width - padding * 3) / 2
        for (let i = 0; i < length; i += 2) {
            const row = []
            for (let j = 0; j < 2; j++) {
                const action = actions[i + j]
                row.push({
                    type: "hstack",
                    props: {
                        spacing: 0,
                        padding: 0,
                        link: this.getUrlScheme(action),
                        frame: {
                            maxWidth: itemWidth,
                            maxHeight: itemHeight,
                            alignment: $widget.alignment.leading
                        }
                    },
                    views: [
                        {
                            type: "hstack",
                            modifiers: [
                                {
                                    background: $color(action.color),
                                    frame: {
                                        width: itemHeight - 5,
                                        height: itemHeight - 5
                                    }
                                },
                                {
                                    cornerRadius: {
                                        value: 10,
                                        style: 1 // 0: circular, 1: continuous
                                    }
                                }
                            ],
                            views: [
                                {
                                    type: "image",
                                    props: {
                                        symbol: {
                                            glyph: action.icon,
                                            size: (itemHeight - 5) * 0.6
                                        },
                                        color: $color("#ffffff")
                                    }
                                }
                            ]
                        },
                        {
                            type: "spacer",
                            props: { frame: { maxWidth: 15 } }
                        },
                        {
                            type: "text",
                            props: {
                                text: action.name,
                                font: $font(15),
                                bold: true,
                                color: $color("primaryText")
                            }
                        }
                    ]
                })
            }
            views.push({
                type: "hstack",
                props: {
                    spacing: padding,
                    padding: 0
                },
                views: row
            })
        }
        return {
            type: "vstack",
            props: {
                spacing: padding,
                padding: padding
            },
            views: views
        }
    }

    view4x4() {
        return this.view2x4()
    }

    render() {
        $widget.setTimeline({
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

module.exports = { Widget: ActionsWidget }
