const { ActionData, ActionEnv } = require("../action/action")
const { View, Kernel, UIKit, BarButtonItem } = require("../libs/easy-jsbox")
const Clips = require("./clips")
const KeyboardScripts = require("./components/keyboard-scripts")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Keyboard extends Clips {
    static jsboxToolBarHeight = 48
    static jsboxToolBarSpace = 5
    #readClipboardTimer

    listId = "keyboard-clips-list"
    actionsId = "keyboard-list-actions"
    keyboardSwitchLockId = "keyboard-switch-lock"
    keyboardSwitchLockKey = "caio.keyboard.switch.lock"

    deleteTimer = undefined
    continuousDeleteTimer = undefined
    continuousDeleteTapticTimer = undefined
    continuousDeleteDelay = 0.5

    // 剪贴板列个性化设置
    horizontalMargin = 15 // 列表边距
    verticalMargin = 12 // 列表边距
    copiedIndicatorSize = 5 // 已复制指示器（小绿点）大小
    containerMargin = 5 // 容器边距
    fontSize = 14 // 字体大小
    tagHeight = this.verticalMargin + 3
    navHeight = 50

    matrixBoxMargin = 15

    menuItemActionMaxCount = 3

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)

        this.jsboxToolBar = this.kernel.setting.get("keyboard.showJSBoxToolbar")
        this.keyboardDisplayMode = this.kernel.setting.get("keyboard.displayMode")

        this.backgroundImage = this.kernel.setting.get("keyboard.background.image")?.image
        this.backgroundColor = this.kernel.setting.get("keyboard.background.color")
        this.backgroundColorDark = this.kernel.setting.get("keyboard.background.color.dark")

        this.deleteDelay = this.kernel.setting.get("keyboard.deleteDelay")

        if (typeof $cache.get(this.keyboardSwitchLockKey) !== "boolean") {
            $cache.set(this.keyboardSwitchLockKey, false)
        }

        if (!this.jsboxToolBar) {
            // 这是一个属性，应该尽早设置。
            $keyboard.barHidden = true
        }
    }

    get keyboardHeight() {
        return this.kernel.setting.get("keyboard.previewAndHeight")
    }

    get fixedKeyboardHeight() {
        return this.keyboardHeight + Keyboard.jsboxToolBarHeight
    }

    setKeyboardHeight(height) {
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

        $keyboard.height = this.fixedKeyboardHeight
    }

    keyboardTapped(tapped, tapticEngine = true, level = 1) {
        return async (...args) => {
            if (tapticEngine && this.kernel.setting.get("keyboard.tapticEngine")) {
                $device.taptic(level)
            }
            if (typeof tapped === "function") {
                try {
                    await tapped(...args)
                } catch (error) {
                    this.kernel.error(error)
                }
            }
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
                tapped: this.keyboardTapped(async animate => {
                    animate.start()
                    try {
                        await this.readClipboard(true)
                        animate.done()
                    } catch (error) {
                        animate.cancel()
                        throw error
                    }
                })
            },
            {
                // Action
                symbol: "bolt.circle",
                tapped: this.keyboardTapped(() => {
                    let flag = $(this.actionsId).hidden === true
                    $(this.listId + "-container").hidden = flag
                    $(this.actionsId).hidden = !flag
                })
            }
        ]

        return {
            type: "view",
            views: buttons.map((button, i) => {
                const barButtonItem = new BarButtonItem()
                barButtonItem.buttonEdges = 0
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

    /**
     * 底部按钮
     * @param {*} button
     * @param {*} align
     * @returns
     */
    getBottomButtonView(button, align) {
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
        if (!this.kernel.setting.get("keyboard.showJSBoxToolbar") && (!$device.hasFaceID || $device.isIpadPro)) {
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
                    touchesBegan: this.keyboardTapped(async () => {
                        $keyboard.delete()
                        this.continuousDeleteTapticTimer = $delay(this.continuousDeleteDelay, () =>
                            this.keyboardTapped()()
                        )
                        this.continuousDeleteTimer = $delay(this.continuousDeleteDelay, () => {
                            this.deleteTimer = $timer.schedule({
                                interval: this.deleteDelay,
                                handler: () => $keyboard.delete()
                            })
                        })
                    }),
                    touchesEnded: () => {
                        this.deleteTimer?.invalidate()
                        this.continuousDeleteTimer?.cancel()
                        this.continuousDeleteTapticTimer?.cancel()
                        this.deleteTimer = undefined
                        this.continuousDeleteTimer = undefined
                    }
                }
            }
        )

        return {
            type: "view",
            views: [
                ...leftButtons.map(btn => this.getBottomButtonView(btn, UIKit.align.left)),
                ...rightButtons.map(btn => this.getBottomButtonView(btn, UIKit.align.right))
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

    get matrixTemplate() {
        return {
            props: {
                smoothCorners: true,
                cornerRadius: this.containerMargin * 2
            },
            views: [
                UIKit.blurBox(
                    { style: $blurStyle.ultraThinMaterial },
                    [
                        {
                            type: "view",
                            props: {
                                id: "copied",
                                circular: this.copiedIndicatorSize,
                                hidden: true,
                                bgcolor: $color("green")
                            },
                            layout: (make, view) => {
                                make.size.equalTo(this.copiedIndicatorSize)
                                // 放在前面小缝隙的中间 `this.copyedIndicatorSize / 2` 指大小的一半
                                make.left.top.inset(this.matrixBoxMargin / 2)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "content",
                                lines: 0,
                                font: $font(20)
                            },
                            layout: (make, view) => {
                                make.top.left.right.equalTo(view.super).inset(this.matrixBoxMargin)
                                make.height
                                    .lessThanOrEqualTo(view.super)
                                    .offset(-this.matrixBoxMargin * 2 - this.tagHeight)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "tag",
                                lines: 1,
                                color: this.tagColor,
                                autoFontSize: true,
                                align: $align.leading
                            },
                            layout: (make, view) => {
                                make.left.right.equalTo(view.prev)
                                make.height.equalTo(this.tagHeight)
                                make.bottom.equalTo(view.super).inset(this.matrixBoxMargin)
                            }
                        }
                    ],
                    $layout.fill
                ),
                {
                    type: "image",
                    props: {
                        id: "image",
                        hidden: true
                    },
                    layout: $layout.fill
                }
            ]
        }
    }

    get itemSelect() {
        return (sender, indexPath) => {
            const clip = this.clips[indexPath.row]
            if (clip.image) {
                Kernel.quickLookImage(clip.imageOriginal)
            } else {
                $keyboard.insert(clip.text)
                if (this.kernel.setting.get("keyboard.switchAfterInsert") && !this.getKeyboardSwitchLock()) {
                    $keyboard.next()
                }
            }
        }
    }

    getMatrixView() {
        const matrix = {
            type: "matrix",
            props: {
                id: this.listId,
                bgcolor: $color("clear"),
                menu: { items: this.menuItems() },
                direction: $scrollDirection.horizontal,
                square: true,
                alwaysBounceVertical: false,
                showsHorizontalIndicator: false,
                columns: 1,
                spacing: this.matrixBoxMargin,
                template: this.matrixTemplate
            },
            layout: $layout.fill,
            events: {
                ready: () => this.listReady(),
                didSelect: this.itemSelect,
                itemSize: (sender, indexPath) => {
                    // 在键盘刚启动时从 sender.size.height 取值是错误的
                    let size = this.fixedKeyboardHeight - this.navHeight * 2
                    if (this.jsboxToolBar) {
                        size -= Keyboard.jsboxToolBarHeight + Keyboard.jsboxToolBarSpace
                    }
                    return $size(size, size)
                }
            }
        }
        const view = View.createFromViews([matrix, this.getEmptyBackground(this.listId)])
        view.setProp("id", this.listId + "-container")
        view.layout = (make, view) => {
            make.top.equalTo(this.navHeight)
            make.width.equalTo(view.super)
            make.bottom.equalTo(view.super.safeAreaBottom).offset(-this.navHeight)
        }
        return view
    }

    getListView() {
        const superListView = super.getListView()
        superListView.setProp("id", this.listId + "-container")
        superListView.layout = (make, view) => {
            make.top.equalTo(this.navHeight)
            make.width.equalTo(view.super)
            make.bottom.equalTo(view.super.safeAreaBottom).offset(-this.navHeight)
        }

        const listView = superListView.views[0]
        listView.events.didSelect = this.itemSelect
        listView.props.separatorColor = $color("lightGray")
        listView.props.separatorInset = $insets(0, this.horizontalMargin, 0, this.horizontalMargin)
        delete listView.events.pulled

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

    getDataView() {
        if (this.keyboardDisplayMode === 0) {
            return this.getListView()
        }
        return this.getMatrixView()
    }

    getActionView() {
        return {
            type: "view",
            props: { id: this.actionsId, hidden: true },
            views: [
                this.kernel.actionManager.getActionMiniView(async () => {
                    return new ActionData({
                        env: ActionEnv.keyboard,
                        textBeforeInput: $keyboard.textBeforeInput,
                        textAfterInput: $keyboard.textAfterInput,
                        text: $keyboard.selectedText ?? (await $keyboard.getAllText())
                    })
                })
            ],
            layout: (make, view) => {
                make.top.equalTo(this.navHeight)
                make.left.equalTo(this.containerMargin)
                make.right.equalTo(-this.containerMargin)
                make.bottom.equalTo(-this.navHeight)
            }
        }
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
                    type: "view",
                    props: { hidden: this.backgroundImage === null },
                    views: [
                        {
                            type: "image",
                            props: {
                                image: this.backgroundImage,
                                hidden: this.backgroundImage === null
                            },
                            layout: $layout.fill
                        },
                        {
                            // 深色模式降低亮度
                            type: "view",
                            props: { bgcolor: $color("clear", $rgba(0, 0, 0, 0.3)) },
                            layout: $layout.fill
                        }
                    ],
                    layout: $layout.fill
                },
                this.getTopBarView(),
                this.getDataView(),
                this.getBottomBarView(),
                this.getActionView()
            ],
            layout: $layout.fill,
            events: {
                appeared: () => {
                    this.keyboardSetting()
                }
            }
        }
    }
}

module.exports = Keyboard
