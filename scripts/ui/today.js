const {
    UIKit,
    BarButtonItem,
    NavigationItem,
    NavigationBar
} = require("../libs/easy-jsbox")
const Clipboard = require("./clipboard")

class Today extends Clipboard {
    constructor(kernel) {
        super(kernel)
        this.actionsId = "today-list-actions"
        this.listContainerId = "today-list-container"
        this.listId = "today-list"
        this.bottomBar = new NavigationBar()

        // 剪贴板列个性化设置
        this.left_right = 20 // 列表边距
        this.top_bottom = 10 // 列表边距
        this.fontSize = 14 // 字体大小
        this.navHeight = 40
        this.taptic = 1

        // 剪切板分页显示
        this.setClipboarPageSize($widget.mode)
        this.listPageNow = [0, 0] // 剪切板当前页
        this.listSection = this.tabIndex === 0 ? 1 : 0 // 当前选中列表
        this.loadDataWithSingleLine()

        // 监听展开状态
        $widget.modeChanged = mode => {
            this.setClipboarPageSize(mode)
            this.updateList()
        }
    }

    ready() {
        // readClipboard
        $delay(0.5, () => {
            this.readClipboard()
        })
    }

    setClipboarPageSize(mode) {
        if ($app.env === $env.app) {
            const height = UIKit.windowSize.height - this.navHeight * 2 - 70
            const f_line = height / Clipboard.singleLineHeight
            const floor = Math.floor(f_line)
            this.listPageSize = floor
            if (f_line - floor >= 0.6) {
                this.listPageSize++
            }
            return
        }
        if (mode === 0) {
            this.listPageSize = 1
        } else {
            const height = $widget.height - this.navHeight * 2 - 70
            const f_line = height / Clipboard.singleLineHeight
            const floor = Math.floor(f_line)
            this.listPageSize = floor
            if (f_line - floor >= 0.6) {
                this.listPageSize++
            }
        }
    }

    add(item) {
        super.add(item, () => {
            // 初始化列表
            this.listPageNow[1] = 0
            this.listSection = 1
            this.updateList()
        })
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
            { // 手动读取剪切板
                symbol: "square.and.arrow.down.on.square",
                tapped: this.buttonTapped(animate => {
                    animate.start()
                    this.readClipboard(true)
                    animate.done()
                })
            }
        ]
        return buttons.map(button => {
            const barButtonItem = new BarButtonItem()
            return barButtonItem
                .setAlign(UIKit.align.right)
                .setSymbol(button.symbol)
                .setEvent("tapped", button.tapped)
                .definition
        })
    }

    setTabIndex(index) {
        $cache.set("caio.today.tab.index", index)
    }

    get tabIndex() {
        return $cache.get("caio.today.tab.index") ?? 0
    }

    get tabItems() {
        return [$l10n("CLIPBOARD"), $l10n("PIN"), $l10n("ACTIONS")]
    }

    tabView() {
        const switchTab = index => {
            this.setTabIndex(index)
            if (index === 2) {
                $(this.listContainerId).hidden = true
                $(this.actionsId).hidden = false
            } else {
                if (index === 0) {
                    this.listSection = 1
                } else if (index === 1) {
                    this.listSection = 0
                }
                $(this.actionsId).hidden = true
                $(this.listContainerId).hidden = false
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
        return { // 顶部按钮栏
            type: "view",
            views: [{
                type: "view",
                layout: $layout.fill,
                views: [
                    this.tabView(),
                    { type: "label" },
                    ...this.navButtons()
                ]
            }],
            layout: (make, view) => {
                make.top.width.equalTo(view.super)
                make.height.equalTo(this.navHeight)
            }
        }
    }

    getBottomBarView() {
        const navigationItem = new NavigationItem()

        navigationItem
            .setLeftButtons([
                {
                    title: "Prev",
                    tapped: this.buttonTapped(() => {
                        this.clipboardPrevPage()
                    })
                }
            ])
            .setRightButtons([
                {
                    title: "Next",
                    tapped: this.buttonTapped(() => {
                        this.clipboardNextPage()
                    })
                }
            ])
            .setTitle(this.listPageNow[this.listSection] + 1)
            .setLargeTitleDisplayMode(NavigationItem.largeTitleDisplayModeNever)

        this.bottomBar.setNavigationItem(navigationItem)

        const view = this.bottomBar.getNavigationBarView()

        view.layout = (make, view) => {
            make.bottom.left.right.equalTo(view.super.safeArea)
            make.top.equalTo(view.prev.bottom).offset(3)
        }

        return view
    }

    updateList() {
        $(this.listId).data = this.getClipboardPage()
        $(this.bottomBar.id + "-small-title").text = this.listPageNow[this.listSection] + 1
    }

    clipboardPrevPage() {
        if (this.listPageNow[this.listSection] > 0) {
            this.listPageNow[this.listSection]--
            this.updateList()
        }
    }

    clipboardNextPage() {
        const maxPage = Math.ceil(this.savedClipboard[this.listSection].rows.length / this.listPageSize)
        if (this.listPageNow[this.listSection] < maxPage - 1) {
            this.listPageNow[this.listSection]++
            this.updateList()
        }
    }

    getClipboardPage() {
        const start = this.listPageNow[this.listSection] * this.listPageSize
        const end = start + this.listPageSize
        return this.savedClipboard[this.listSection].rows.slice(start, end)
    }

    getListView() {
        return {
            type: "view",
            props: {
                id: this.listContainerId,
                hidden: this.tabIndex === 2,
            },
            views: [
                { // 剪切板列表
                    type: "list",
                    props: Object.assign({
                        id: this.listId,
                        scrollEnabled: false,
                        bgcolor: $color("clear"),
                        menu: {
                            items: this.menuItems(false)
                        },
                        separatorInset: $insets(0, this.left_right, 0, this.left_right),
                        data: this.getClipboardPage(),
                        template: this.listTemplate(1)
                    }, {}),
                    events: {
                        ready: () => this.ready(),
                        rowHeight: (sender, indexPath) => {
                            const content = sender.object(indexPath).content
                            return content.info.height + this.top_bottom * 2 + 1
                        },
                        didSelect: this.buttonTapped((sender, indexPath, data) => {
                            const content = data.content
                            const text = content.info.text
                            const path = this.kernel.storage.keyToPath(text)
                            if (path && $file.exists(path.original)) {
                                $clipboard.image = $file.read(path.original).image
                            } else {
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
        return {
            type: "view",
            props: {
                id: this.actionsId,
                hidden: this.tabIndex !== 2
            },
            views: [this.kernel.actionManager.getActionListView({}, {
                didSelect: (sender, indexPath, data) => {
                    const action = this.kernel.actionManager.getActionHandler(data.info.info.type, data.info.info.dir)
                    setTimeout(() => action({
                        text: $clipboard.text
                    }), 500)
                }
            })],
            layout: (make, view) => {
                make.top.equalTo(this.navHeight)
                make.bottom.left.right.equalTo(view.super.safeArea)
            }
        }
    }

    getView() {
        return {
            type: "view",
            views: [
                this.getNavBarView(),
                this.getListView(),
                this.getActionView()
            ],
            layout: $layout.fill
        }
    }
}

module.exports = Today