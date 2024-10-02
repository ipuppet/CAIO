const { BarButtonItem, UIKit } = require("../../libs/easy-jsbox")

/**
 * @typedef {import("../../app-main").AppKernel} AppKernel
 * @typedef {import("./actions").Actions} Actions
 * @typedef {ActionViews} ActionViews
 */

class ActionViews {
    addActionButtonId = "action-manager-button-add"
    sortActionButtonId = "action-manager-button-sort"
    syncButtonId = "action-manager-button-sync"
    syncLabelId = "action-manager-sync-label"

    editingToolBarId = "action-editingToolBarId"

    horizontalMargin = 20
    verticalMargin = 14
    editModeToolBarHeight = 44
    columns = 2
    spacing = 15
    itemHeight = 100
    headerHeight = 35

    /**
     * @param {AppKernel} kernel
     * @param {Actions} data
     */
    constructor(kernel, data) {
        this.kernel = kernel
        this.data = data
    }

    getActionListView(didSelect = undefined, props = {}, events = {}, layout = undefined) {
        if (didSelect) {
            events.didSelect = (sender, indexPath, data) => {
                const info = data.info.info
                const actionHandler = this.data.getActionHandler(info.category, info.dir)
                didSelect(actionHandler, info)
            }
        }

        return {
            type: "list",
            layout: (make, view) => {
                if (typeof layout === "function") {
                    layout(make, view)
                } else {
                    make.top.width.equalTo(view.super.safeArea)
                    make.bottom.inset(0)
                }
            },
            events: events,
            props: Object.assign(
                {
                    reorder: false,
                    bgcolor: $color("clear"),
                    rowHeight: 60,
                    sectionTitleHeight: 30,
                    stickyHeader: true,
                    data: (() => {
                        const data = this.data.actionList
                        return data.map(category => {
                            category.rows = category.items
                            return category
                        })
                    })(),
                    template: {
                        props: { bgcolor: $color("clear") },
                        views: [
                            {
                                type: "image",
                                props: {
                                    id: "color",
                                    cornerRadius: 8,
                                    smoothCorners: true
                                },
                                layout: (make, view) => {
                                    make.centerY.equalTo(view.super)
                                    make.left.inset(15)
                                    make.size.equalTo($size(30, 30))
                                }
                            },
                            {
                                type: "image",
                                props: {
                                    id: "icon",
                                    tintColor: $color("#ffffff")
                                },
                                layout: (make, view) => {
                                    make.centerY.equalTo(view.super)
                                    make.left.inset(20)
                                    make.size.equalTo($size(20, 20))
                                }
                            },
                            {
                                type: "label",
                                props: {
                                    id: "name",
                                    lines: 1,
                                    font: $font(16)
                                },
                                layout: (make, view) => {
                                    make.height.equalTo(30)
                                    make.centerY.equalTo(view.super)
                                    make.left.equalTo(view.prev.right).offset(15)
                                }
                            },
                            { type: "label", props: { id: "info" } }
                        ]
                    }
                },
                props
            )
        }
    }

    getActionMiniView(getActionData, actions) {
        if (!actions) {
            actions = []
            this.data.actions.forEach(dir => {
                actions = actions.concat(dir.items)
            })
        }

        const matrixItemHeight = 50
        return {
            type: "matrix",
            props: {
                bgcolor: $color("clear"),
                columns: 2,
                itemHeight: matrixItemHeight,
                spacing: 8,
                data: actions.map(action => this.actionToData(action)),
                template: {
                    props: {
                        smoothCorners: true,
                        cornerRadius: 10,
                        bgcolor: $color($rgba(255, 255, 255, 0.3), $rgba(0, 0, 0, 0.3))
                    },
                    views: [
                        {
                            type: "image",
                            props: {
                                id: "color",
                                cornerRadius: 8,
                                smoothCorners: true
                            },
                            layout: make => {
                                const size = matrixItemHeight - 20
                                make.top.left.inset((matrixItemHeight - size) / 2)
                                make.size.equalTo($size(size, size))
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: "icon",
                                tintColor: $color("#ffffff")
                            },
                            layout: (make, view) => {
                                make.edges.equalTo(view.prev).insets(5)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "name",
                                font: $font(14)
                            },
                            layout: (make, view) => {
                                make.bottom.top.inset(10)
                                make.left.equalTo(view.prev.prev.right).offset(10)
                                make.right.inset(10)
                            }
                        },
                        {
                            // 用来保存信息
                            type: "view",
                            props: {
                                id: "info",
                                hidden: true
                            }
                        }
                    ]
                }
            },
            layout: $layout.fill,
            events: {
                didSelect: async (sender, indexPath, data) => {
                    const info = data.info.info
                    const actionData = await getActionData()
                    this.data.getActionHandler(info.category, info.dir)(actionData)
                }
            }
        }
    }

    getMatrixEditModeToolBarView({ selectButtonEvents, deleteButtonEvents } = {}) {
        const blurBox = UIKit.blurBox({ id: this.editingToolBarId }, [
            UIKit.separatorLine(),
            {
                type: "view",
                views: [
                    {
                        type: "button",
                        props: {
                            id: this.editingToolBarId + "-select-button",
                            title: $l10n("SELECT_ALL"),
                            titleColor: $color("tint"),
                            bgcolor: $color("clear")
                        },
                        layout: (make, view) => {
                            make.left.inset(this.horizontalMargin)
                            make.centerY.equalTo(view.super)
                        },
                        events: selectButtonEvents
                    },
                    {
                        type: "button",
                        props: {
                            id: this.editingToolBarId + "-delete-button",
                            symbol: "trash",
                            hidden: true,
                            tintColor: $color("red"),
                            bgcolor: $color("clear")
                        },
                        layout: (make, view) => {
                            make.height.equalTo(view.super)
                            make.width.equalTo(this.horizontalMargin * 2)
                            make.right.inset(this.horizontalMargin / 2)
                            make.centerY.equalTo(view.super)
                        },
                        events: deleteButtonEvents
                    }
                ],
                layout: (make, view) => {
                    make.left.right.top.equalTo(view.super)
                    make.bottom.equalTo(view.super.safeAreaBottom)
                }
            }
        ])
        return blurBox
    }

    getColor(color, _default = null) {
        if (!color) return _default
        return typeof color === "string" ? $color(color) : $rgba(color.red, color.green, color.blue, color.alpha)
    }

    actionToData(action) {
        return {
            name: { text: action.name },
            icon:
                action?.icon?.slice(0, 5) === "icon_"
                    ? { icon: $icon(action.icon.slice(5, action.icon.indexOf(".")), $color("#ffffff")) }
                    : { image: $image(action?.icon) },
            color: { bgcolor: this.getColor(action.color) },
            info: { info: action } // 此处实际上是 info 模板的 props，所以需要 { info: action }
        }
    }

    matrixCell(action) {
        return {
            props: { bgcolor: $color("#ffffff", "#242424") },
            views: [
                {
                    type: "image",
                    props: {
                        bgcolor: this.getColor(action.color),
                        cornerRadius: 8,
                        smoothCorners: true
                    },
                    layout: make => {
                        make.top.left.inset(10)
                        make.size.equalTo($size(30, 30))
                    }
                },
                {
                    type: "image",
                    props: Object.assign(
                        {
                            tintColor: $color("#ffffff")
                        },
                        action?.icon?.slice(0, 5) === "icon_"
                            ? { icon: $icon(action.icon.slice(5, action.icon.indexOf(".")), $color("#ffffff")) }
                            : { image: $image(action?.icon) }
                    ),
                    layout: make => {
                        make.top.left.inset(15)
                        make.size.equalTo($size(20, 20))
                    }
                },
                {
                    // button
                    type: "button",
                    props: {
                        bgcolor: $color("clear"),
                        tintColor: UIKit.textColor,
                        titleColor: UIKit.textColor,
                        contentEdgeInsets: $insets(0, 0, 0, 0),
                        titleEdgeInsets: $insets(0, 0, 0, 0),
                        imageEdgeInsets: $insets(0, 0, 0, 0)
                    },
                    views: [
                        {
                            type: "image",
                            props: { symbol: "ellipsis.circle" },
                            layout: (make, view) => {
                                make.center.equalTo(view.super)
                                make.size.equalTo(BarButtonItem.style.iconSize)
                            }
                        }
                    ],
                    events: {
                        tapped: sender => {
                            const main = this.data.getActionMainJs(action.category, action.dir)
                            this.data.editActionMainJs(main, action)
                        }
                    },
                    layout: make => {
                        make.top.right.inset(0)
                        make.size.equalTo(BarButtonItem.style.width)
                    }
                },
                {
                    type: "label",
                    props: {
                        text: action.name,
                        font: $font(16)
                    },
                    layout: (make, view) => {
                        make.bottom.left.inset(10)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    actionViewCustomHeader() {
        $define({
            type: "ActionViewCustomHeader: UICollectionReusableView",
            props: ["titleLabel"],
            events: {
                "initWithFrame:": frame => {
                    self = self.$super().$initWithFrame(frame)
                    const labelFrame = self.$bounds()
                    labelFrame.x = this.spacing
                    labelFrame.y = this.headerHeight - 21
                    const label = $objc("UILabel").$alloc().$initWithFrame(labelFrame)
                    label.$setFont($font("bold", 21).ocValue())
                    label.$setTextAlignment($align.left)
                    label.$setNumberOfLines(1)
                    self.$setTitleLabel(label)
                    self.$addSubview(self.$titleLabel())
                    return self
                }
            }
        })
    }
    actionViewCustomFooter() {
        $define({
            type: "ActionViewCustomFooter: UICollectionReusableView",
            props: ["titleLabel"],
            events: {
                "initWithFrame:": frame => {
                    self = self.$super().$initWithFrame(frame)
                    const labelFrame = self.$bounds()
                    labelFrame.x = this.spacing
                    const label = $objc("UILabel").$alloc().$initWithFrame(labelFrame)
                    label.$setFont($font(16).ocValue())
                    label.$setTextAlignment($align.left)
                    self.$setTitleLabel(label)
                    self.$addSubview(self.$titleLabel())
                    return self
                }
            }
        })
    }

    collectionViewFlowLayout() {
        const layout = $objc("UICollectionViewFlowLayout").$alloc().$init()
        layout.$setScrollDirection($scrollDirection.vertical)
        layout.$setMinimumLineSpacing(this.spacing)
        layout.$setMinimumInteritemSpacing(this.spacing)
        const concreteValue = $insets(this.spacing, this.spacing, 0, this.spacing).ocValue()
        layout.$setSectionInset(concreteValue.$UIEdgeInsetsValue())
        // layout.$setSectionHeadersPinToVisibleBounds(true)
        return layout
    }

    getMatrixView(events) {
        const matrix = {
            type: "matrix",
            props: {
                bgcolor: UIKit.scrollViewBackgroundColor
            },
            layout: $layout.fill,
            events
        }
        return matrix
    }
}

module.exports = ActionViews
