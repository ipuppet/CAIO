const { View, UIKit, BarButtonItem, NavigationBarItems, NavigationBar } = require("../libs/easy-jsbox")
const Clipboard = require("./clipboard")
const TodayActions = require("./components/today-actions")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Today extends Clipboard {
    tabItems = [$l10n("PIN"), $l10n("CLIPBOARD"), $l10n("ACTIONS")]

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)
        this.actionsId = "today-list-actions"
        this.listContainerId = "today-list-container"
        this.readClipboardButtonId = "today-nav-readClipboard"
        this.listId = "today-list"

        this.navigationBarItems = new NavigationBarItems()
        this.bottomBar = new NavigationBar()
        this.bottomBar.navigationBarItems = this.navigationBarItems
        this.todayActions = new TodayActions(this.kernel)

        // 剪贴板列个性化设置
        this.left_right = 20 // 列表边距
        this.top_bottom = 10 // 列表边距
        this.fontSize = 14 // 字体大小
        this.navHeight = 38
        this.taptic = 1

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

        this.loadSavedClipboard()
        this.updateList()
        this.appListen()

        $delay(0.5, () => this.readClipboard())
    }

    readClipboard(manual = false) {
        if (!this.isActionPage) {
            super.readClipboard(manual)
            this.updateList()
            return true
        }
        return false
    }

    setClipboarPageSize(mode) {
        if (mode === 0) {
            this.listPageSize = 1
        } else {
            const viewHeight = $app.env === $env.app ? UIKit.windowSize.height : $widget.height
            const height = viewHeight - this.navHeight * 2
            const f_line = height / (this.getSingleLineHeight() + this.top_bottom * 2)
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

    navButtons() {
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
        ]
        return buttons.map(button => {
            const barButtonItem = new BarButtonItem()
            barButtonItem
                .setAlign(UIKit.align.right)
                .setSymbol(button.symbol)
                .setEvent("tapped", button.tapped)
                .setProps(button.props ?? {})
            return barButtonItem.definition
        })
    }

    tabView() {
        const switchTab = index => {
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

        return {
            type: "tab",
            props: {
                items: this.tabItems,
                index: this.tabIndex,
                dynamicWidth: true
            },
            events: {
                changed: sender => {
                    switchTab(sender.index)
                }
            },
            layout: (make, view) => {
                make.centerY.equalTo(view.super)
                make.left.equalTo(view.super.saveArea).offset(10)
            }
        }
    }

    getNavBarView() {
        return {
            // 顶部按钮栏
            type: "view",
            views: [
                {
                    type: "view",
                    layout: $layout.fill,
                    views: [this.tabView(), { type: "label" }, ...this.navButtons()]
                }
            ],
            layout: (make, view) => {
                make.top.width.equalTo(view.super)
                make.height.equalTo(this.navHeight)
            }
        }
    }

    getBottomBarView() {
        this.navigationBarItems
            .setLeftButtons([
                {
                    symbol: "chevron.backward.circle",
                    tapped: this.buttonTapped(() => {
                        this.clipboardPrevPage()
                    })
                }
            ])
            .setRightButtons([
                {
                    symbol: "chevron.forward.circle",
                    tapped: this.buttonTapped(() => {
                        this.clipboardNextPage()
                    })
                }
            ])
        this.bottomBar
            .setTitle(this.listPageNow[this.listSection] + 1)
            .setLargeTitleDisplayMode(NavigationBar.largeTitleDisplayModeNever)

        const view = this.bottomBar.getNavigationBarView()

        view.layout = (make, view) => {
            make.bottom.left.right.equalTo(view.super.safeArea)
            make.top.equalTo(view.prev.bottom)
        }

        return view
    }

    updateList() {
        const start = this.listPageNow[this.listSection] * this.listPageSize
        const end = start + this.listPageSize
        $(this.listId).data = this.savedClipboard[this.listSection].slice(start, end)
        // page index
        $(this.bottomBar.id + "-small-title").text = this.listPageNow[this.listSection] + 1
    }

    clipboardPrevPage() {
        if (this.listPageNow[this.listSection] > 0) {
            this.listPageNow[this.listSection]--
            this.updateList()
        }
    }

    clipboardNextPage() {
        const maxPage = Math.ceil(this.savedClipboard[this.listSection].length / this.listPageSize)
        if (this.listPageNow[this.listSection] < maxPage - 1) {
            this.listPageNow[this.listSection]++
            this.updateList()
        }
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
                        menu: {
                            items: this.menuItems(false)
                        },
                        separatorInset: $insets(0, this.left_right, 0, this.left_right),
                        rowHeight: this.getSingleLineHeight() + this.top_bottom * 2,
                        data: [],
                        template: this.listTemplate(1)
                    },
                    events: {
                        ready: () => this.listReady(),
                        didSelect: this.buttonTapped((sender, indexPath, data) => {
                            const content = data.content
                            const text = content.info.text
                            const path = this.kernel.storage.keyToPath(text)
                            if (path && $file.exists(path.original)) {
                                $clipboard.image = $file.read(path.original).image
                            } else {
                                this.setCopied(data.content.info.uuid, $indexPath(this.listSection, indexPath.row))
                                this.setClipboardText(data.content.info.text)
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
                id: this.matrixId,
                bgcolor: $color("clear"),
                columns: 2,
                itemHeight: 50,
                spacing: 8,
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
                                make.top.left.inset(10)
                                make.size.equalTo($size(30, 30))
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: "icon",
                                tintColor: $color("#ffffff")
                            },
                            layout: make => {
                                make.top.left.inset(15)
                                make.size.equalTo($size(20, 20))
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
                    this.kernel.actionManager.getActionHandler(
                        info.type,
                        info.dir
                    )({
                        text: info.type === "clipboard" || info.type === "uncategorized" ? $clipboard.text : null,
                        uuid: null
                    })
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
        // 直接放最外层 ready 事件不生效
        return View.create({
            props: {
                titleColor: UIKit.textColor,
                barColor: UIKit.primaryViewBackgroundColor
            },
            views: [
                {
                    type: "view",
                    views: [this.getNavBarView(), this.getListView(), this.getActionView()],
                    layout: $layout.fill,
                    events: {
                        ready: async () => {
                            if ($app.env !== $env.today) return

                            const timer = $timer.schedule({
                                interval: 0.6,
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
                }
            ]
        })
    }
}

module.exports = Today
