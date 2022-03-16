const {
    UIKit,
    BarButtonItem,
    NavigationItem,
    NavigationBar
} = require("../lib/easy-jsbox")
const Clipboard = require("./clipboard")

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
    }

    keyboardSetting() {
        $keyboard.barHidden = true
    }

    navButtons() {
        const buttons = [
            { // 关闭键盘
                symbol: "keyboard.chevron.compact.down",
                tapped: () => $keyboard.dismiss()
            },
            { // 手动读取剪切板
                symbol: "square.and.arrow.down.on.square",
                tapped: animate => {
                    animate.start()
                    this.readClipboard(true)
                    animate.done()
                }
            },
            {
                symbol: "bolt.circle",
                tapped: (animate, sender) => {
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
                }
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
            { // TODO 切换键盘
                symbol: "globe",
                tapped: () => $keyboard.next(),
                menu: {
                    pullDown: true,
                    items: [
                        {
                            title: "Next Keyboard",
                            handler: (sender, indexPath) => {
                                $keyboard.next()
                            }
                        }
                    ]
                }
            }
        ])
        navigationItem.setRightButtons([
            {
                symbol: "delete.left",
                tapped: () => $keyboard.delete()
            }
        ])

        navigationBar.setNavigationItem(navigationItem)

        return { // 底部按钮栏
            type: "view",
            views: [navigationBar.getNavigationBarView()],
            layout: (make, view) => {
                make.width.equalTo(view.super)
                make.height.equalTo(view.super)
                make.top.equalTo(view.super.safeArea).offset(3)
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
                menu: {
                    items: this.menuItems()
                },
                indicatorInsets: $insets(0, 0, 50, 0),
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
                didSelect: (sender, indexPath, data) => {
                    const content = data.content
                    const text = content.info.text
                    const path = this.kernel.storage.ketToPath(text)
                    if (path && $file.exists(path.original)) {
                        $clipboard.image = $file.read(path.original).image
                        $ui.toast($l10n("COPIED"))
                    } else {
                        $keyboard.insert(data.content.info.text)
                    }
                }
            },
            layout: (make, view) => {
                make.top.equalTo(this.navHeight)
                make.width.bottom.equalTo(view.super)
            }
        }
    }

    getBottomBarView() {
        return UIKit.blurBox(
            {
                clipsToBounds: true
            },
            [{
                type: "view",
                layout: $layout.fill,
                views: [this.bottomBarButtons()]
            }],
            (make, view) => {
                make.bottom.width.equalTo(view.super)
                make.height.equalTo(this.navHeight)
            }
        )
    }

    getViews() {
        const views = [
            this.getNavBarView(),
            this.getListView(),
            this.getBottomBarView()
        ]
        return views
    }

    render() {
        $ui.render({
            views: this.getViews()
        })
    }
}

module.exports = Mini