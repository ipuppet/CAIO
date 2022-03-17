const {
    UIKit,
    BarButtonItem,
    NavigationItem,
    NavigationBar
} = require("../lib/easy-jsbox")
const Clipboard = require("./clipboard")
const MiniScripts = require("./components/mini-scripts")

class Mini extends Clipboard {
    constructor(kernel) {
        super(kernel)
        this.listId = "mini-clipboard-list"
        // 剪贴板列个性化设置
        this.left_right = 20 // 列表边距
        this.top_bottom = 10 // 列表边距
        this.fontSize = 14 // 字体大小
        this.navHeight = 50
        this.keyboardSetting()
        this.deleteTimer = undefined
        this.continuousDeleteTimer = undefined
        this.deleteDelay = this.kernel.setting.get("mini.deleteDelay")
        this.continuousDeleteDelay = 0.5
    }

    keyboardSetting() {
        if (!this.kernel.setting.get("mini.showJSBoxToolbar")) {
            $keyboard.barHidden = true
        }
    }

    keyboardTapped(tapped) {
        return (...args) => {
            if (this.kernel.setting.get("mini.tapticEngine")) {
                $device.taptic(1)
            }
            tapped(...args)
        }
    }

    navButtons() {
        const buttons = [
            { // 关闭键盘
                symbol: "keyboard.chevron.compact.down",
                tapped: this.keyboardTapped(() => $keyboard.dismiss())
            },
            { // 手动读取剪切板
                symbol: "square.and.arrow.down.on.square",
                tapped: this.keyboardTapped(animate => {
                    animate.start()
                    this.readClipboard(true)
                    animate.done()
                })
            },
            {
                symbol: "bolt.circle",
                tapped: this.keyboardTapped((animate, sender) => {
                    const popover = $ui.popover({
                        sourceView: sender,
                        directions: $popoverDirection.up,
                        size: $size(200, 300),
                        views: [this.kernel.actionManager.getActionListView({}, {
                            didSelect: (sender, indexPath, data) => {
                                popover.dismiss()
                                const action = this.kernel.actionManager.getActionHandler(data.info.info.type, data.info.info.dir)
                                setTimeout(() => action({
                                    text: $clipboard.text
                                }), 500)
                            }
                        })]
                    })
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

    bottomBarButtons() {
        const navigationBar = new NavigationBar()
        const navigationItem = new NavigationItem()

        navigationItem.setLeftButtons([
            {
                symbol: "paperplane",
                menu: {
                    pullDown: true,
                    asPrimary: true,
                    items: MiniScripts.getAddins().map(addin => {
                        return {
                            title: addin,
                            handler: this.keyboardTapped(() => $addin.run(addin))
                        }
                    })
                }
            }
        ])
        if (!$device.isIphoneX) {
            // TODO 切换键盘
            navigationItem.addLeftButton({
                symbol: "globe",
                tapped: this.keyboardTapped(() => $keyboard.next()),
                menu: {
                    pullDown: true,
                    items: [
                        {
                            title: "Next Keyboard",
                            handler: this.keyboardTapped(() => $keyboard.next())
                        }
                    ]
                }
            })
        }
        navigationItem.setRightButtons([
            { // send
                title: "Send",
                tapped: this.keyboardTapped(() => $keyboard.send())
            },
            { // delete
                symbol: "delete.left",
                events: {
                    touchesBegan: () => {
                        $keyboard.delete()
                        this.continuousDeleteTimer = $delay(this.continuousDeleteDelay, () => {
                            this.deleteTimer = $timer.schedule({
                                interval: this.deleteDelay,
                                handler: () => $keyboard.delete()
                            })
                        })
                    },
                    touchesEnded: () => {
                        this.deleteTimer?.invalidate()
                        this.continuousDeleteTimer?.cancel()
                    }
                }
            }
        ])

        navigationBar.setNavigationItem(navigationItem)

        return navigationBar.getNavigationBarView()
    }

    getNavBarView() {
        return { // 顶部按钮栏
            type: "view",
            views: [{
                type: "view",
                layout: $layout.fill,
                views: [
                    {
                        type: "label",
                        props: {
                            text: $l10n("CLIPBOARD"),
                            font: $font("bold", 20)
                        },
                        layout: (make, view) => {
                            make.centerY.equalTo(view.super)
                            make.left.equalTo(view.super).offset(this.left_right)
                        }
                    }
                ].concat(this.navButtons())
            }],
            layout: (make, view) => {
                make.top.width.equalTo(view.super)
                make.height.equalTo(this.navHeight)
            }
        }
    }

    getListView() {
        return { // 剪切板列表
            type: "list",
            props: Object.assign({
                id: this.listId,
                bgcolor: $color("clear"),
                menu: {
                    items: this.menuItems()
                },
                indicatorInsets: $insets(0, 0, 0, 0),
                separatorInset: $insets(0, this.left_right, 0, this.left_right),
                data: this.savedClipboard,
                template: this.listTemplate()
            }, {}),
            events: {
                ready: () => this.ready(),
                rowHeight: (sender, indexPath) => {
                    const content = sender.object(indexPath).content
                    return content.info.height + this.top_bottom * 2 + 1
                },
                didSelect: this.keyboardTapped((sender, indexPath, data) => {
                    const content = data.content
                    const text = content.info.text
                    const path = this.kernel.storage.ketToPath(text)
                    if (path && $file.exists(path.original)) {
                        $clipboard.image = $file.read(path.original).image
                        $ui.toast($l10n("COPIED"))
                    } else {
                        $keyboard.insert(data.content.info.text)
                    }
                })
            },
            layout: (make, view) => {
                make.top.equalTo(this.navHeight)
                make.width.equalTo(view.super)
                make.bottom.equalTo(view.super).offset(-this.navHeight)
            }
        }
    }

    getBottomBarView() {
        return {
            type: "view",
            views: [this.bottomBarButtons()],
            layout: (make, view) => {
                make.bottom.width.equalTo(view.super)
                make.height.equalTo(this.navHeight - 3)
            }
        }
    }

    getView() {
        return {
            type: "view",
            props: { bgcolor: $color("clear") },
            views: [
                this.getNavBarView(),
                UIKit.separatorLine(),
                this.getListView(),
                UIKit.separatorLine(),
                this.getBottomBarView()
            ],
            layout: $layout.fill
        }
    }
}

module.exports = Mini