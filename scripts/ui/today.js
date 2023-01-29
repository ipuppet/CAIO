const { ActionData, ActionEnv } = require("../action/action")
const { View, UIKit, BarButtonItem } = require("../libs/easy-jsbox")
const Clips = require("./clips")
const TodayActions = require("./components/today-actions")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Today extends Clips {
    // 剪贴板列个性化设置
    tabLeftMargin = 8
    horizontalMargin = 15 // 列表边距
    verticalMargin = 10 // 列表边距
    copiedIndicatorSize = 5 // 已复制指示器（小绿点）大小
    fontSize = 14 // 字体大小
    tagFontSize = 12
    navHeight = 34
    taptic = 1
    matrixItemHeight = 50

    inLauncher = $app.env === $env.today && $app.widgetIndex === -1
    launcherNavHeight = 44

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)
        this.actionsId = "today-list-actions"
        this.listContainerId = "today-list-container"
        this.readClipboardButtonId = "today-nav-readClipboard"
        this.listId = "today-list"
        this.pageIndexId = "today-list-page-index"

        this.tabItems.push($l10n("ACTIONS"))

        this.todayActions = new TodayActions(this.kernel)

        // 剪切板分页显示
        this.setClipboarPageSize($widget.mode)
        this.listPageNow = [0, 0] // 剪切板当前页
        this.listSection = Math.min(this.tabIndex, 1) // 当前选中列表，只取 0 或 1，默认 1

        this.setSingleLine()
    }

    get isActionPage() {
        return this.tabIndex === 2
    }

    set tabIndex(index) {
        $cache.set("caio.today.tab.index", index)
    }

    get tabIndex() {
        return $cache.get("caio.today.tab.index") ?? 0
    }

    listReady() {
        // 监听展开状态
        $widget.modeChanged = mode => {
            this.setClipboarPageSize(mode)
            this.updateList()
        }

        this.setClipboarPageSize($widget.mode)

        this.updateList(true)
        this.appListen()

        $delay(0.5, () => this.readClipboard())
    }

    readClipboard(manual = false) {
        if (!this.isActionPage && $app.env === $env.today) {
            super.readClipboard(manual)
            return true
        }
        return false
    }

    setClipboarPageSize(mode) {
        if (mode === 0) {
            this.listPageSize = 1
        } else {
            const viewHeight = $app.env === $env.app ? UIKit.windowSize.height : $widget.height
            const height = viewHeight - this.navHeight * 2 - (this.inLauncher ? this.launcherNavHeight : 0)
            const f_line = height / (this.singleLineContentHeight + this.verticalMargin + this.tagHeight)
            const floor = Math.floor(f_line)
            this.listPageSize = floor
            if (f_line - floor >= 0.6) {
                this.listPageSize++
            }
        }
    }

    buttonTapped(tapped, tapticEngine = true) {
        return (...args) => {
            if (tapticEngine && this.kernel.setting.get("keyboard.tapticEngine")) {
                $device.taptic(this.taptic)
            }
            tapped(...args)
        }
    }

    switchTab(index) {
        this.tabIndex = index
        if (index === 2) {
            $(this.listContainerId).hidden = true
            $(this.actionsId).hidden = false
            $(this.readClipboardButtonId).hidden = true
        } else {
            this.listSection = index
            $(this.actionsId).hidden = true
            $(this.listContainerId).hidden = false
            $(this.readClipboardButtonId).hidden = false
            this.updateList()
        }
    }

    getNavBarView() {
        const buttons = [
            {
                // 手动读取剪切板
                symbol: "square.and.arrow.down.on.square",
                props: {
                    id: this.readClipboardButtonId,
                    hidden: this.isActionPage
                },
                tapped: this.buttonTapped(animate => {
                    animate.start()
                    if (this.readClipboard(true)) {
                        animate.done()
                    } else {
                        animate.cancel()
                    }
                })
            }
        ].map(button => {
            const barButtonItem = new BarButtonItem()
            barButtonItem
                .setAlign(UIKit.align.right)
                .setSymbol(button.symbol)
                .setEvent("tapped", button.tapped)
                .setProps(button.props ?? {})
            return barButtonItem.definition
        })

        return {
            // 顶部按钮栏
            type: "view",
            views: [
                {
                    type: "view",
                    layout: $layout.fill,
                    views: [this.tabView(), ...buttons]
                }
            ],
            layout: (make, view) => {
                make.top.width.equalTo(view.super)
                make.height.equalTo(this.navHeight)
            }
        }
    }

    getBottomBarView() {
        const getButton = align => {
            const symbol = align === UIKit.align.left ? "chevron.backward.circle" : "chevron.forward.circle"
            return {
                type: "button",
                props: {
                    symbol,
                    bgcolor: $color("clear"),
                    tintColor: UIKit.textColor
                },
                layout: make => {
                    if (align === UIKit.align.left) {
                        make.left.inset(this.horizontalMargin)
                    } else {
                        make.right.inset(this.horizontalMargin)
                    }
                    make.centerY.equalTo(view.super)
                },
                events: {
                    tapped: this.buttonTapped(() => {
                        if (align === UIKit.align.left) {
                            this.clipboardPrevPage()
                        } else {
                            this.clipboardNextPage()
                        }
                    })
                }
            }
        }

        const view = {
            type: "view",
            views: [
                getButton(UIKit.align.left),
                getButton(UIKit.align.right),
                {
                    type: "label",
                    props: {
                        id: this.pageIndexId,
                        align: $align.center,
                        text: this.listPageNow[this.listSection] + 1
                    },
                    layout: (make, view) => {
                        make.bottom.left.right.equalTo(view.super.safeArea)
                        make.center.equalTo(view.super)
                    }
                }
            ],
            layout: (make, view) => {
                make.bottom.left.right.equalTo(view.super.safeArea)
                make.height.equalTo(this.navHeight)
            }
        }

        return view
    }

    delete(...arge){
        super.delete(...arge)
        this.updateList()
    }

    updateList() {
        const start = this.listPageNow[this.listSection] * this.listPageSize
        const end = start + this.listPageSize
        $(this.listId).data = this.allClips[this.listSection]
            .slice(start, end)
            .map(data => this.lineData(data, this.copied.uuid === data.uuid))
        // page index
        $(this.pageIndexId).text = this.listPageNow[this.listSection] + 1
    }

    clipboardPrevPage() {
        if (this.listPageNow[this.listSection] > 0) {
            this.listPageNow[this.listSection]--
            this.updateList()
        }
    }

    clipboardNextPage() {
        const maxPage = Math.ceil(this.allClips[this.listSection].length / this.listPageSize)
        if (this.listPageNow[this.listSection] < maxPage - 1) {
            this.listPageNow[this.listSection]++
            this.updateList()
        }
    }

    menuItems() {
        const items = super.menuItems(true).reverse()
        items[0].items = items[0].items.reverse()
        return items
    }

    getListView() {
        return {
            type: "view",
            props: {
                id: this.listContainerId,
                hidden: this.isActionPage
            },
            views: [
                {
                    // 剪切板列表
                    type: "list",
                    props: {
                        id: this.listId,
                        scrollEnabled: false,
                        bgcolor: $color("clear"),
                        menu: { items: this.menuItems() },
                        separatorInset: $insets(0, this.horizontalMargin, 0, this.horizontalMargin),
                        data: [],
                        template: this.listTemplate()
                    },
                    events: {
                        ready: () => this.listReady(),
                        rowHeight: () => this.verticalMargin + this.singleLineContentHeight + this.tagHeight,
                        didSelect: this.buttonTapped((sender, indexPath) => {
                            const item = this.clips[indexPath.row]
                            const path = this.kernel.storage.keyToPath(item.text)
                            if (path && this.kernel.fileStorage.exists(path.original)) {
                                $clipboard.image = this.kernel.fileStorage.readSync(path.original).image
                            } else {
                                this.setClipboardText(item.text)
                                this.setCopied(indexPath.row)
                            }
                            $ui.toast($l10n("COPIED"))
                        })
                    },
                    layout: (make, view) => {
                        make.top.width.equalTo(view.super)
                        make.bottom.equalTo(view.super).offset(-this.navHeight)
                    }
                },
                this.getBottomBarView()
            ],
            layout: (make, view) => {
                make.top.equalTo(this.navHeight)
                make.bottom.left.right.equalTo(view.super.safeArea)
            }
        }
    }

    getActionView() {
        let data = this.todayActions.getActions()
        if (data.length === 0) {
            data = this.todayActions.getAllActions()
        }

        const matrixView = {
            type: "matrix",
            props: {
                bgcolor: $color("clear"),
                columns: 2,
                itemHeight: this.matrixItemHeight,
                spacing: this.tabLeftMargin,
                data: data.map(action => {
                    return this.kernel.actionManager.actionToData(action)
                }),
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
                                const size = this.matrixItemHeight - 20
                                make.top.left.inset((this.matrixItemHeight - size) / 2)
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
                didSelect: (sender, indexPath, data) => {
                    const info = data.info.info
                    const actionData = new ActionData({
                        env: ActionEnv.today,
                        text: info.type === "clipboard" || info.type === "uncategorized" ? $clipboard.text : null
                    })
                    this.kernel.actionManager.getActionHandler(info.type, info.dir)(actionData)
                }
            }
        }

        return {
            type: "view",
            props: {
                id: this.actionsId,
                hidden: this.tabIndex !== 2
            },
            views: [matrixView],
            layout: (make, view) => {
                make.top.equalTo(this.navHeight)
                make.bottom.left.right.equalTo(view.super.safeArea)
            }
        }
    }

    getView() {
        return View.create({
            props: {
                titleColor: UIKit.textColor,
                barColor: UIKit.primaryViewBackgroundColor
            },
            views: [
                {
                    type: "view",
                    views: [this.getNavBarView(), this.getListView(), this.getActionView()],
                    layout: $layout.fill
                }
            ],
            events: {
                appeared: async () => {
                    if ($app.env !== $env.today) return

                    const timer = $timer.schedule({
                        interval: 0,
                        handler: () => {
                            $ui.animate({
                                duration: 0.3,
                                animation: () => {
                                    $ui.vc.ocValue().$view().$setBackgroundColor($color("clear"))
                                },
                                completion: () => {
                                    timer.invalidate()
                                }
                            })
                        }
                    })
                }
            }
        })
    }
}

module.exports = Today
