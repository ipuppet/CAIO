const { ActionData, ActionEnv } = require("../action/action")
const { UIKit, BarButtonItem } = require("../libs/easy-jsbox")
const Clips = require("./clips")
const KeyboardScripts = require("./components/keyboard-scripts")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Keyboard extends Clips {
    #readClipboardTimer

    listId = "keyboard-clips-list"
    keyboardSwitchLockId = "keyboard-switch-lock"
    keyboardSwitchLockKey = "caio.keyboard.switch.lock"

    deleteTimer = undefined
    continuousDeleteTimer = undefined
    continuousDeleteDelay = 0.5

    // 剪贴板列个性化设置
    horizontalMargin = 15 // 列表边距
    verticalMargin = 10 // 列表边距
    copiedIndicatorSize = 5 // 已复制指示器（小绿点）大小
    containerMargin = 5 // 容器边距
    fontSize = 14 // 字体大小
    navHeight = 50

    menuItemActionMaxCount = 3

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)

        this.backgroundImage = this.kernel.setting.getImage("keyboard.background.image")
        this.backgroundColor = this.kernel.setting.getColor(this.kernel.setting.get("keyboard.background.color"))
        this.backgroundColorDark = this.kernel.setting.getColor(
            this.kernel.setting.get("keyboard.background.color.dark")
        )

        this.deleteDelay = this.kernel.setting.get("keyboard.deleteDelay")

        this.keyboardSetting()

        if (typeof $cache.get(this.keyboardSwitchLockKey) !== "boolean") {
            $cache.set(this.keyboardSwitchLockKey, false)
        }
    }

    get keyboardHeight() {
        return this.kernel.setting.get("keyboard.previewAndHeight")
    }

    set keyboardHeight(height) {
        this.kernel.setting.set("keyboard.previewAndHeight", height)
    }

    /**
     *
     * @returns {boolean} true: lock, false: unlock
     */
    getKeyboardSwitchLock() {
        const lock = $cache.get(this.keyboardSwitchLockKey)
        if (typeof lock !== "boolean") {
            $cache.set(this.keyboardSwitchLockKey, true)
        }
        return lock
    }

    switchKeyboardSwitchLock() {
        const lock = $cache.get(this.keyboardSwitchLockKey)
        $cache.set(this.keyboardSwitchLockKey, !lock)
        $(this.keyboardSwitchLockId).symbol = !lock ? "lock" : "lock.open"
    }

    listReady() {
        this.updateList()
        // readClipboard
        if (this.kernel.setting.get("clipboard.autoSave") && $app.env === $env.keyboard) {
            this.#readClipboardTimer = $timer.schedule({
                interval: 1,
                handler: () => {
                    if (!this.kernel.setting.get("clipboard.autoSave")) {
                        this.#readClipboardTimer.invalidate()
                        return
                    }
                    this.readClipboard()
                }
            })
        }
    }

    keyboardSetting() {
        if ($app.env !== $env.keyboard) return

        const timer = $timer.schedule({
            interval: 0,
            handler: () => {
                if ($keyboard.height !== this.keyboardHeight) {
                    $keyboard.height = this.keyboardHeight
                } else {
                    timer.invalidate()
                }
            }
        })
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

    getTopButtons() {
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
                            this.kernel.actionManager.getActionListView(action => {
                                popover.dismiss()
                                $delay(0.5, async () => {
                                    const actionData = new ActionData({
                                        env: ActionEnv.keyboard,
                                        textBeforeInput: $keyboard.textBeforeInput,
                                        textAfterInput: $keyboard.textAfterInput,
                                        text: $keyboard.selectedText ?? (await $keyboard.getAllText())
                                    })

                                    action(actionData)
                                })
                            })
                        ]
                    })
                })
            }
        ]

        return {
            type: "view",
            views: buttons.map((button, i) => {
                const barButtonItem = new BarButtonItem()
                return barButtonItem
                    .setAlign(UIKit.align.right)
                    .setSymbol(button.symbol)
                    .setEvent("tapped", button.tapped).definition
            }),
            layout: (make, view) => {
                const barButtonItem = new BarButtonItem()
                make.height.equalTo(view.super)
                make.right.inset(this.containerMargin - barButtonItem.edges)
                make.width.equalTo(barButtonItem.width * buttons.length + barButtonItem.edges)
            }
        }
    }

    getTopBarView() {
        return {
            // 顶部按钮栏
            type: "view",
            views: [
                {
                    type: "view",
                    layout: $layout.fill,
                    views: [
                        {
                            type: "label",
                            props: {
                                text: $l10n("CAIO"),
                                font: $font("bold", 20)
                            },
                            events: {
                                tapped: () => this.kernel.openInJsbox(),
                                ready: sender => {
                                    const cache = $cache.get("tips.keyboard.title")
                                    if (cache) return
                                    $cache.set("tips.keyboard.title", true)
                                    $ui.popover({
                                        sourceView: sender,
                                        size: $size(200, 60),
                                        directions: $popoverDirection.up,
                                        views: [
                                            {
                                                type: "label",
                                                props: {
                                                    lines: 0,
                                                    text: $l10n("CLICK_TO_OPEN_JSBOX"),
                                                    align: $align.center
                                                },
                                                layout: $layout.fillSafeArea
                                            }
                                        ]
                                    })
                                }
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.left.equalTo(view.super).offset(this.containerMargin)
                            }
                        }
                    ].concat(this.tabView(), this.getTopButtons())
                }
            ],
            layout: (make, view) => {
                make.top.width.equalTo(view.super)
                make.height.equalTo(this.navHeight)
            }
        }
    }

    getButtonView(button, align) {
        const size = $size(38, 38)
        const edges = this.containerMargin

        const blurBox = UIKit.blurBox(
            {
                info: { align },
                smoothCorners: true,
                cornerRadius: 5
            },
            [
                {
                    type: "button",
                    props: Object.assign(
                        {
                            symbol: button.symbol,
                            title: button.title,
                            id: button.id ?? $text.uuid,
                            font: $font(16),
                            bgcolor: this.backgroundImage
                                ? $color($rgba(172, 176, 184, 0.3), $rgba(71, 71, 73, 0.3))
                                : $color("#ACB0B8", "#474749"),
                            tintColor: UIKit.textColor,
                            titleColor: UIKit.textColor,
                            info: { align }
                        },
                        button.menu ? { menu: button.menu } : {}
                    ),
                    events: Object.assign({}, button.tapped ? { tapped: button.tapped } : {}, button.events),
                    layout: $layout.fill
                }
            ],
            (make, view) => {
                if (button.title) {
                    const fontSize = $text.sizeThatFits({
                        text: button.title,
                        width: UIKit.windowSize.width,
                        font: $font(16)
                    })
                    const width = Math.ceil(fontSize.width) + edges * 2 // 文本按钮增加内边距
                    make.size.equalTo($size(width, size.height))
                } else {
                    make.size.equalTo(size)
                }
                make.centerY.equalTo(view.super)
                if (view.prev && view.prev.info.align === align) {
                    if (align === UIKit.align.right) make.right.equalTo(view.prev.left).offset(-edges)
                    else make.left.equalTo(view.prev.right).offset(edges)
                } else {
                    if (align === UIKit.align.right) make.right.inset(edges)
                    else make.left.inset(edges)
                }
            }
        )
        return blurBox
    }

    getBottomBarView() {
        const leftButtons = []
        const rightButtons = []

        // 切换键盘
        if (!$device.hasFaceID || $device.isIpadPro) {
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

        if (this.kernel.setting.get("keyboard.switchAfterInsert")) {
            leftButtons.push({
                symbol: this.getKeyboardSwitchLock() ? "lock" : "lock.open",
                id: this.keyboardSwitchLockId,
                tapped: this.keyboardTapped(() => this.switchKeyboardSwitchLock())
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

        return {
            type: "view",
            views: [
                ...leftButtons.map(btn => this.getButtonView(btn, UIKit.align.left)),
                ...rightButtons.map(btn => this.getButtonView(btn, UIKit.align.right))
            ],
            layout: (make, view) => {
                make.bottom.left.right.equalTo(view.super.safeArea)
                make.top.equalTo(view.prev.bottom)
            }
        }
    }

    menuItems() {
        const items = super.menuItems()
        return [items[0], items[2]]
    }

    getListView() {
        const superListView = super.getListView()
        superListView.layout = (make, view) => {
            make.top.equalTo(this.navHeight)
            make.width.equalTo(view.super)
            make.bottom.equalTo(view.super.safeAreaBottom).offset(-this.navHeight)
        }

        const listView = superListView.views[0]
        listView.events.didSelect = (sender, indexPath) => {
            const item = this.clips[indexPath.row]
            const path = this.kernel.storage.keyToPath(item.text)
            if (path && this.kernel.fileStorage.exists(path.original)) {
                $quicklook.open({
                    image: this.kernel.fileStorage.readSync(path.original)?.image
                })
            } else {
                $keyboard.insert(item.text)
                if (this.kernel.setting.get("keyboard.switchAfterInsert") && !this.getKeyboardSwitchLock()) {
                    $keyboard.next()
                }
            }
        }
        listView.props.separatorInset = $insets(0, this.horizontalMargin, 0, this.horizontalMargin)

        const blurBox = UIKit.blurBox(
            {
                style: $blurStyle.ultraThinMaterial,
                smoothCorners: true,
                cornerRadius: this.containerMargin * 2
            },
            [listView],
            (make, view) => {
                make.bottom.top.equalTo(view.super)
                make.left.right.inset(this.containerMargin)
            }
        )
        superListView.views[0] = blurBox
        return superListView
    }

    getView() {
        return {
            type: "view",
            props: {
                id: "keyboard.main",
                bgcolor: $color(this.backgroundColor, this.backgroundColorDark)
            },
            views: [
                {
                    type: "image",
                    props: {
                        image: this.backgroundImage,
                        hidden: this.backgroundImage === null
                    },
                    layout: $layout.fill
                },
                this.getTopBarView(),
                this.getListView(),
                this.getBottomBarView()
            ],
            layout: $layout.fill
        }
    }
}

module.exports = Keyboard
