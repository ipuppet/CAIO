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
            this.actions = $cache.get(this.kernel.actions.allActionsCacheKey)
            if (!Array.isArray(this.actions)) {
                $cache.set(this.kernel.actions.allActionsCacheKey, this.kernel.actions.allActions)
                this.actions = this.kernel.actions.allActions
            }
            this.actions = Object.values(this.actions)
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

    getIcon(action, size) {
        const view = {
            type: "image",
            props: {
                color: $color("#ffffff"),
                frame: {
                    width: size,
                    height: size
                },
                resizable: true
            }
        }
        if (action.icon.startsWith("icon_")) {
            view.props.image = $icon(
                action.icon?.slice(5, action.icon.indexOf(".")),
                $color("#ffffff"),
                $size(size, size)
            )
                .ocValue()
                .$image()
                .jsValue()
        } else if (action.icon.indexOf("/") > -1) {
            view.props.image = $image(action.icon)
        } else {
            view.props.symbol = {
                glyph: action.icon,
                size: size
            }
        }

        return view
    }

    view2x2() {
        const action = this.data[0]
        return {
            type: "vstack",
            props: {
                background: $color("primarySurface"),
                alignment: $widget.horizontalAlignment.leading,
                spacing: 0,
                padding: 20,
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
                                    background: this.kernel.actions.views.getColor(action.color),
                                    frame: {
                                        width: 50,
                                        height: 50
                                    }
                                },
                                {
                                    cornerRadius: {
                                        value: 15,
                                        style: 1
                                    }
                                }
                            ],
                            views: [this.getIcon(action, 50 * 0.6)]
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
        const padding = 15
        const innerPadding = 10
        const itemHeight = (height - padding * (this.maxLength / 2 + 1)) / (this.maxLength / 2) - innerPadding * 2
        const itemWidth = (width - padding * 3) / 2 - innerPadding * 2
        const r_outer = 15
        const r_inner = r_outer * ((itemHeight - innerPadding) / itemHeight)
        for (let i = 0; i < length; i += 2) {
            const row = []
            for (let j = 0; j < 2; j++) {
                const action = actions[i + j]
                row.push({
                    type: "hstack",
                    props: { spacing: 0 },
                    modifiers: [
                        {
                            link: this.getUrlScheme(action),
                            background: $color({
                                light: $rgb(245, 245, 245),
                                dark: $rgba(80, 80, 80, 0.3),
                                black: $rgba(70, 70, 70, 0.3)
                            }),
                            padding: innerPadding,
                            frame: {
                                maxWidth: itemWidth,
                                maxHeight: itemHeight,
                                alignment: $widget.alignment.leading
                            }
                        },
                        {
                            cornerRadius: {
                                value: r_outer,
                                style: 1
                            }
                        }
                    ],
                    views: [
                        {
                            type: "hstack",
                            modifiers: [
                                {
                                    background: this.kernel.actions.views.getColor(action.color),
                                    frame: {
                                        width: itemHeight,
                                        height: itemHeight
                                    }
                                },
                                {
                                    cornerRadius: {
                                        value: r_inner,
                                        style: 1
                                    }
                                }
                            ],
                            views: [this.getIcon(action, itemHeight * 0.6)]
                        },
                        {
                            type: "spacer",
                            props: { frame: { maxWidth: innerPadding * 1.5 } }
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
                background: $color("primarySurface"),
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
