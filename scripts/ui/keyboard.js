const { UIKit, BarButtonItem, NavigationBarItems, NavigationBar } = require("../libs/easy-jsbox")
const Clipboard = require("./clipboard")
const KeyboardScripts = require("./components/keyboard-scripts")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Keyboard extends Clipboard {
    #readClipboardTimer

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)
        this.listId = "keyboard-clipboard-list"
        // 剪贴板列个性化设置
        this.left_right = 20 // 列表边距
        this.top_bottom = 10 // 列表边距
        this.fontSize = 14 // 字体大小
        this.navHeight = 50
        this.navBarSeparatorId = "navBarSeparator"
        this.deleteTimer = undefined
        this.continuousDeleteTimer = undefined
        this.deleteDelay = this.kernel.setting.get("keyboard.deleteDelay")
        this.continuousDeleteDelay = 0.5

        this.keyboardSetting()
        this.setSingleLine()
    }

    listReady() {
        this.loadSavedClipboard()
        this.updateList()
        this.appListen()
        // readClipboard
        if (this.kernel.setting.get("clipboard.autoSave") && $app.env === $env.keyboard) {
            this.#readClipboardTimer = $timer.schedule({
                interval: 1,
                handler: () => {
                    this.readClipboard()
                }
            })
        }
    }

    keyboardSetting() {
        if (!this.kernel.setting.get("keyboard.showJSBoxToolbar")) {
            $keyboard.barHidden = true
        }
    }

    keyboardTapped(tapped, tapticEngine = true, level = 1) {
        return (...args) => {
            if (tapticEngine && this.kernel.setting.get("keyboard.tapticEngine")) {
                $device.taptic(level)
            }
            tapped(...args)
        }
    }

    navButtons() {
        const buttons = [
            {
                // 关闭键盘
                symbol: "keyboard.chevron.compact.down",
                tapped: this.keyboardTapped(() => $keyboard.dismiss())
            },
            {
                // 手动读取剪切板
                symbol: "square.and.arrow.down.on.square",
                tapped: this.keyboardTapped(animate => {
                    animate.start()
                    this.readClipboard(true)
                    animate.done()
                })
            },
            {
                // Action
                symbol: "bolt.circle",
                tapped: this.keyboardTapped((animate, sender) => {
                    const popover = $ui.popover({
                        sourceView: sender,
                        directions: $popoverDirection.up,
                        size: $size(200, 300),
                        views: [
                            this.kernel.actionManager.getActionListView(
                                {},
                                {
                                    didSelect: (sender, indexPath, data) => {
                                        popover.dismiss()
                                        const action = this.kernel.actionManager.getActionHandler(
                                            data.info.info.type,
                                            data.info.info.dir
                                        )
                                        $delay(0.5, () => action({ text: $clipboard.text }))
                                    }
                                }
                            )
                        ]
                    })
                })
            }
        ]
        return buttons.map(button => {
            const barButtonItem = new BarButtonItem()
            return barButtonItem.setAlign(UIKit.align.right).setSymbol(button.symbol).setEvent("tapped", button.tapped)
                .definition
        })
    }

    getNavBarView() {
        return {
            // 顶部按钮栏
            type: "view",
            props: {
                bgcolor: $color("backgroundColor")
            },
            views: [
                {
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
                }
            ],
            layout: (make, view) => {
                make.top.width.equalTo(view.super)
                make.height.equalTo(this.navHeight)
            }
        }
    }

    getBottomBarView() {
        const leftButtons = []
        const rightButtons = []

        // 切换键盘
        if (!$device.isIphoneX) {
            leftButtons.push({
                symbol: "globe",
                tapped: this.keyboardTapped(() => $keyboard.next()),
                menu: {
                    pullDown: true,
                    items: [
                        {
                            title: $l10n("SWITCH_KEYBOARD"),
                            handler: this.keyboardTapped(() => $keyboard.next())
                        },
                        {
                            title: $l10n("OPEN_IN_JSBOX"),
                            handler: () => this.kernel.openInJsbox()
                        }
                    ]
                }
            })
        }
        leftButtons.push({
            symbol: "paperplane",
            menu: {
                pullDown: true,
                asPrimary: true,
                items: KeyboardScripts.getAddins()
                    .reverse()
                    .map(addin => {
                        return {
                            title: addin,
                            handler: this.keyboardTapped(() => $addin.run(addin))
                        }
                    })
            }
        })
        rightButtons.push(
            {
                // send
                title: $l10n("SEND"),
                tapped: this.keyboardTapped(() => $keyboard.send())
            },
            {
                // delete
                symbol: "delete.left",
                events: {
                    touchesBegan: this.keyboardTapped(() => {
                        $keyboard.delete()
                        this.continuousDeleteTimer = $delay(this.continuousDeleteDelay, () => {
                            this.deleteTimer = $timer.schedule({
                                interval: this.deleteDelay,
                                handler: this.keyboardTapped(
                                    () => $keyboard.delete(),
                                    this.kernel.setting.get("keyboard.tapticEngineForDelete"),
                                    0
                                )
                            })
                        })
                    }),
                    touchesEnded: () => {
                        this.deleteTimer?.invalidate()
                        this.continuousDeleteTimer?.cancel()
                        this.deleteTimer = undefined
                        this.continuousDeleteTimer = undefined
                    }
                }
            }
        )

        const getButtonView = (button, align) => {
            const size = $size(38, 38)
            const edges = 15
            return {
                type: "button",
                props: Object.assign(
                    {
                        symbol: button.symbol,
                        title: button.title,
                        font: $font(16),
                        bgcolor: $color("clear"),
                        tintColor: UIKit.textColor,
                        titleColor: UIKit.textColor,
                        info: { align }
                    },
                    button.menu ? { menu: button.menu } : {}
                ),
                events: Object.assign({}, button.tapped ? { tapped: button.tapped } : {}, button.events),
                layout: (make, view) => {
                    if (button.title) {
                        const fontSize = $text.sizeThatFits({
                            text: button.title,
                            width: UIKit.windowSize.width,
                            font: $font(16)
                        })
                        const width = Math.ceil(fontSize.width) + edges // 文本按钮增加内边距
                        make.size.equalTo($size(width, size.height))
                    } else {
                        make.size.equalTo(size)
                    }
                    make.centerY.equalTo(view.super)
                    if (view.prev && view.prev.info.align === align) {
                        if (align === UIKit.align.right) make.right.equalTo(view.prev.left)
                        else make.left.equalTo(view.prev.right)
                    } else {
                        // 留一半边距，按钮内边距是另一半
                        const thisEdges = edges / 2
                        if (align === UIKit.align.right) make.right.inset(thisEdges)
                        else make.left.inset(thisEdges)
                    }
                }
            }
        }

        return {
            type: "view",
            props: {
                bgcolor: $color("clear")
            },
            views: [
                ...leftButtons.map(btn => getButtonView(btn, UIKit.align.left)),
                ...rightButtons.map(btn => getButtonView(btn, UIKit.align.right))
            ],
            layout: (make, view) => {
                make.bottom.left.right.equalTo(view.super.safeArea)
                make.top.equalTo(view.prev.bottom)
            }
        }
    }

    getListView() {
        const superListView = super.getListView()
        superListView.props.bgcolor = $color("clear")
        superListView.layout = (make, view) => {
            make.top.equalTo(this.navHeight)
            make.width.equalTo(view.super)
            make.bottom.equalTo(view.super.safeAreaBottom).offset(-this.navHeight)
        }
        superListView.views[1].events.didSelect = (sender, indexPath, data) => {
            const content = data.content
            const text = content.info.text
            const path = this.kernel.storage.keyToPath(text)
            if (path && $file.exists(path.original)) {
                $quicklook.open({
                    image: $file.read(path.original)?.image
                })
            } else {
                $keyboard.insert(content.info.text)
            }
        }
        return superListView
    }

    getView() {
        let backgroundImage = this.kernel.setting.getImage("keyboard.background.image")
        const backgroundColor = this.kernel.setting.getColor(this.kernel.setting.get("keyboard.background.color"))
        const backgroundColorDark = this.kernel.setting.getColor(
            this.kernel.setting.get("keyboard.background.color.dark")
        )
        return {
            type: "view",
            props: {
                id: "keyboard.main",
                bgcolor: $color(backgroundColor, backgroundColorDark)
            },
            views: [
                backgroundImage !== null
                    ? {
                          type: "image",
                          props: {
                              image: backgroundImage
                          },
                          layout: $layout.fill
                      }
                    : {},
                this.getNavBarView(),
                UIKit.separatorLine({
                    id: this.navBarSeparatorId,
                    hidden: true,
                    bgcolor: $color("lightGray")
                }),
                this.getListView(),
                UIKit.separatorLine({ bgcolor: $color("lightGray") }),
                this.getBottomBarView()
            ],
            layout: $layout.fill
        }
    }
}

module.exports = Keyboard
