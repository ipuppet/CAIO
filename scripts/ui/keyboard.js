const { ActionData, ActionEnv } = require("../action/action")
const { UIKit, Sheet, BarButtonItem } = require("../libs/easy-jsbox")
const Clips = require("./clips/clips")
const { KeyboardAddins, KeyboardPinActions } = require("./components/keyboard-scripts")

/**
 * @typedef {import("../app-lite").AppKernel} AppKernel
 */

class Keyboard extends Clips {
    static ReturnKeyType = {
        UIReturnKeyDefault: 0,
        UIReturnKeyGo: 1,
        UIReturnKeyGoogle: 2,
        UIReturnKeyJoin: 3,
        UIReturnKeyNext: 4,
        UIReturnKeyRoute: 5,
        UIReturnKeySearch: 6,
        UIReturnKeySend: 7,
        UIReturnKeyYahoo: 8,
        UIReturnKeyDone: 9,
        UIReturnKeyEmergencyCall: 10,
        UIReturnKeyContinue: 11,
        UIReturnKeyJoining: 12,
        UIReturnKeyRouteContinue: 13
    }

    #readClipboardTimer

    keyboardId = "keyboard.main"
    actionsId = "keyboard-list-actions"
    keyboardSwitchLockId = "keyboard-switch-lock"
    keyboardSwitchLockKey = "caio.keyboard.switch.lock"
    keyboardReturnButton = "keyboard-return-button"

    deleteTimer = undefined
    continuousDeleteTimer = undefined
    continuousDeleteTapticTimer = undefined
    continuousDeleteDelay = 0.5

    navHeight = 50

    keyboardFrameHeight = this.keyboardHeight

    get isFullScreenIpad() {
        if (!$device.isIpad) return false

        this.isFullScreenIpadCacheTimer?.cancel()
        this.isFullScreenIpadCacheTimer = $delay(0.1, () => {
            if ($cache.get("keyboard.isFullScreenIpad") !== !UIKit.isSplitScreenMode) {
                this.kernel.KeyboardRenderWithViewFunc(() => this.getView())
            }
            $cache.set("keyboard.isFullScreenIpad", !UIKit.isSplitScreenMode)
        })
        return $cache.get("keyboard.isFullScreenIpad") ?? !UIKit.isSplitScreenMode
    }

    get bottomBarHeight() {
        return this.isFullScreenIpad ? 90 : 50
    }

    get bottomButtonSize() {
        if (!$device.isIpad) return { width: 46, height: 40 }
        return this.isFullScreenIpad ? { width: 69, height: 66 } : { width: 32, height: 40 }
    }

    get bottomButtonFontSize() {
        return this.isFullScreenIpad ? 20 : 16
    }

    get bottomButtonIconSize() {
        return this.isFullScreenIpad ? 26 : 16
    }

    get bottomButtonEdges() {
        return this.isFullScreenIpad ? 8 : 4
    }

    itemBackground = $color("#FFFFFF", $rgba(0x97, 0x97, 0x97, 0.4))
    buttonBackground = $color($rgba(0, 0, 0, 0.15), $rgba(0x75, 0x75, 0x75, 0.4)) // 系统键盘按钮配色

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)

        this.keyboardDisplayMode = this.kernel.setting.get("keyboard.displayMode")

        this.backgroundImage = this.kernel.setting.get("keyboard.background.image")?.image
        // 仅在有背景图时使用
        this.useBlur = this.backgroundImage && this.kernel.setting.get("keyboard.blur")

        this.deleteDelay = this.kernel.setting.get("keyboard.deleteDelay")

        if (typeof $cache.get(this.keyboardSwitchLockKey) !== "boolean") {
            $cache.set(this.keyboardSwitchLockKey, false)
        }

        this.views.listId += "keyboard"
        this.views.scrollToOffsetDirectionX = this.keyboardDisplayMode
        this.views.tabLeftMargin = 10
        this.views.horizontalMargin = 15 // 列表边距
        this.views.verticalMargin = 12 // 列表边距
        this.views.copiedIndicatorSize = 5 // 已复制指示器（小绿点）大小
        this.views.containerMargin = this.isFullScreenIpad ? 12 : 4
        this.views.fontSize = this.kernel.setting.get("keyboard.fontSize") // 字体大小
        this.views.tagHeight = this.views.verticalMargin + 3

        this.delegates.menuItemActionMaxCount = 3

        this.matrixBoxMargin = this.isFullScreenIpad ? 12 : 8
        this.cornerRadius = this.isFullScreenIpad ? 8 : 5
    }

    get returnKeyLabel() {
        let labelName
        const returnKeyType = $ui.controller.ocValue().$textDocumentProxy().$returnKeyType()
        switch (returnKeyType) {
            case Keyboard.ReturnKeyType.UIReturnKeyDefault:
                labelName = "Return"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyGo:
                labelName = "Go"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyGoogle:
                labelName = "Google"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyJoin:
                labelName = "Join"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyNext:
                labelName = "Next"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyRoute:
                labelName = "Route"
                break
            case Keyboard.ReturnKeyType.UIReturnKeySearch:
                labelName = "Search"
                break
            case Keyboard.ReturnKeyType.UIReturnKeySend:
                labelName = "Send"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyYahoo:
                labelName = "Yahoo"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyDone:
                labelName = "Done"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyEmergencyCall:
                labelName = "Emergency Call"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyContinue:
                labelName = "Continue"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyJoining:
                labelName = "Joining"
                break
            case Keyboard.ReturnKeyType.UIReturnKeyRouteContinue:
                labelName = "Route Continue"
                break
            default:
                labelName = "Return"
        }
        $cache.set("keyboard.returnKeyLabel", $l10n(labelName))
        return $l10n(labelName)
    }
    get returnKeyLabelCache() {
        return $cache.get("keyboard.returnKeyLabel") ?? this.returnKeyLabel
    }

    get keyboardHeight() {
        return this.kernel.setting.get("keyboard.previewAndHeight")
    }

    get menu() {
        const items = this.delegates.menu.items
        return { items: [items[0], items[2]] }
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
        $(this.keyboardSwitchLockId).get("image").symbol = !lock ? "lock" : "lock.open"
    }

    listReady() {
        if (this.keyboardDisplayMode === 0) {
            this.setDelegate()
        } else {
            const delegate = $delegate({
                type: "UICollectionViewDragDelegate",
                events: {
                    "collectionView:itemsForBeginningDragSession:atIndexPath:": (
                        collectionView,
                        session,
                        indexPath
                    ) => {
                        return this.delegates.itemsForBeginningDragSession(session, indexPath)
                    }
                }
            })
            const view = $(this.views.listId).ocValue()
            view.$setDragDelegate(delegate)
        }
        this.updateList()
        // readClipboard
        if (this.kernel.setting.get("clipboard.autoSave") && $app.env === $env.keyboard) {
            this.readClipboard() // 防止延时
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

    keyboardTapped(tapped, tapticEngine = true) {
        return async (...args) => {
            if (tapticEngine && this.kernel.setting.get("keyboard.tapticEngine")) {
                $device.taptic(this.kernel.setting.get("keyboard.tapticEngineLevel"))
            }
            if (typeof tapped === "function") {
                try {
                    await tapped(...args)
                } catch (error) {
                    this.kernel.logger.error(error)
                    throw error
                }
            }
        }
    }

    async getKeyboardActionData() {
        let selectedText = $keyboard.selectedText
        if (selectedText === "") selectedText = null
        const getallText = async () => {
            let t = await $keyboard.getAllText()
            if (t === "") t = null
            return t
        }

        return new ActionData({
            env: ActionEnv.keyboard,
            textBeforeInput: $keyboard.textBeforeInput,
            textAfterInput: $keyboard.textAfterInput,
            text: await getallText(),
            selectedText: selectedText
        })
    }

    getTopButtonsView() {
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
            }
        ]
        buttons.push({
            // Action
            symbol: "bolt.circle",
            tapped: this.keyboardTapped(() => {
                let flag = $(this.actionsId).hidden === true
                $(this.views.listId).hidden = flag
                $(this.actionsId).hidden = !flag
            })
        })

        KeyboardPinActions.shared
            .setKernel(this.kernel)
            .getActions()
            .forEach(action => {
                const icon =
                    action?.icon?.slice(0, 5) === "icon_"
                        ? $icon(action.icon.slice(5, action.icon.indexOf(".")), UIKit.textColor)
                              .ocValue()
                              .$image()
                              .jsValue()
                        : $image(action?.icon)
                buttons.push({
                    symbol: icon,
                    tapped: this.keyboardTapped(async () => {
                        const actionData = await this.getKeyboardActionData()

                        const handler = this.kernel.actions.getActionHandler(action.category, action.dir)
                        handler(actionData)
                    })
                })
            })

        return {
            type: "view",
            views: buttons.map(button => {
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
                make.right.inset(-barButtonItem.edges)
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
                            type: "image",
                            props: { image: $image("assets/icon.png", "assets/icon.white.png") },
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
                                make.left.inset(-2) // 图片自身的白边
                                make.size.equalTo($size(28, 28))
                            }
                        }
                    ].concat(super.getTabView(), this.getTopButtonsView())
                }
            ],
            layout: (make, view) => {
                make.top.equalTo(view.super)
                make.left.equalTo(view.super.safeArea).offset(this.views.containerMargin)
                make.right.equalTo(view.super.safeArea).offset(-this.views.containerMargin)
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
    #bottomBarButtonView(button, align) {
        const size = this.bottomButtonSize
        const edges = this.bottomButtonEdges
        const margin = this.isFullScreenIpad ? 8 : 5 // 按钮图标边距
        const layout = (make, view) => {
            if (button.title) {
                const fontSize = $text.sizeThatFits({
                    text: button.title,
                    width: UIKit.windowSize.width,
                    font: $font(this.bottomButtonFontSize)
                })
                let width = Math.ceil(fontSize.width) + (edges + 12) * 2 // 文本按钮增加内边距
                if (this.isFullScreenIpad) {
                    width = Math.max(size.height * 1.5, width)
                }
                make.size.equalTo($size(width, size.height))
            } else {
                make.size.equalTo(size)
            }
            make.centerY.equalTo(view.super)
            if (view.prev && view.prev.info.align === align) {
                // edges * 1.5 对齐系统键盘按钮
                if (align === UIKit.align.right) make.right.equalTo(view.prev.left).offset(-edges * 1.5)
                else make.left.equalTo(view.prev.right).offset(edges * 1.5)
            } else {
                if (align === UIKit.align.right) make.right.inset(0)
                else make.left.inset(0)
            }
        }
        const buttonView = {
            type: "button",
            props: Object.assign(
                {
                    smoothCorners: false,
                    cornerRadius: this.cornerRadius,
                    id: button.id ?? $text.uuid,
                    bgcolor: this.useBlur ? $color("clear") : this.buttonBackground,
                    info: { align }
                },
                button.menu ? { menu: button.menu } : {}
            ),
            views: [
                {
                    type: "image",
                    props: {
                        symbol: button.symbol,
                        tintColor: UIKit.textColor
                    },
                    layout: (make, view) => {
                        make.size.greaterThanOrEqualTo(this.bottomButtonIconSize)
                        if (this.isFullScreenIpad) {
                            make.bottom.inset(margin)
                            if (align === UIKit.align.right) {
                                make.right.inset(margin)
                            } else {
                                make.left.inset(margin)
                            }
                        } else {
                            make.center.equalTo(view.super)
                        }
                    }
                },
                {
                    type: "label",
                    props: {
                        text: button.title,
                        font: $font(this.bottomButtonFontSize),
                        color: UIKit.textColor
                    },
                    layout: (make, view) => {
                        if (this.isFullScreenIpad) {
                            make.bottom.inset(margin)
                            if (align === UIKit.align.right) {
                                make.right.inset(margin)
                            } else {
                                make.left.inset(margin)
                            }
                        } else {
                            make.center.equalTo(view.super)
                        }
                    }
                }
            ],
            events: Object.assign({}, button.tapped ? { tapped: button.tapped } : {}, button.events),
            layout: $layout.fill
        }

        if (this.useBlur) {
            return UIKit.blurBox(
                {
                    info: { align },
                    style: $blurStyle.ultraThinMaterial,
                    smoothCorners: false,
                    cornerRadius: this.cornerRadius
                },
                [buttonView],
                layout
            )
        } else {
            return {
                type: "view",
                props: { info: { align } },
                views: [buttonView],
                layout
            }
        }
    }

    getBottomButtonsView() {
        const leftButtons = []
        const rightButtons = []
        // 切换键盘
        const needsInputModeSwitchKey = $ui.controller.ocValue().$needsInputModeSwitchKey()
        if (needsInputModeSwitchKey) {
            leftButtons.push({
                symbol: "globe",
                events: {
                    ready: sender => {
                        const button = sender.ocValue()
                        button.$addTarget_action_forControlEvents(
                            $ui.controller.ocValue(),
                            "handleInputModeListFromView:withEvent:",
                            $UIEvent.allTouchEvents
                        )
                    }
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
                items: KeyboardAddins.getAddins()
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
                title: this.returnKeyLabelCache,
                id: this.keyboardReturnButton,
                tapped: this.keyboardTapped(() => $keyboard.send()),
                events: {
                    ready: async () => {
                        await $wait(0.2)
                        const label = this.returnKeyLabel
                        const layout = this.#bottomBarButtonView({ title: label }, UIKit.align.right).layout

                        $ui.animate({
                            duration: 0.2,
                            animation: () => {
                                $(this.keyboardReturnButton).super.updateLayout(layout)
                                $(this.keyboardReturnButton).super.relayout()
                            },
                            completion: () => {
                                $(this.keyboardReturnButton).get("label").text = label
                            }
                        })
                    }
                }
            },
            {
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

        const spaceButton = {
            type: "button",
            props: {
                smoothCorners: false,
                cornerRadius: 5,
                title: $l10n("SPACE"),
                font: $font(16),
                bgcolor: this.itemBackground,
                titleColor: UIKit.textColor
            },
            events: {
                tapped: this.keyboardTapped(() => {
                    $keyboard.insert(" ")
                })
            },
            layout: (make, view) => {
                let lastLeft = view.prev
                for (let i = 0; i < rightButtons.length; i++) {
                    lastLeft = lastLeft.prev
                }
                make.height.top.equalTo(view.prev)
                make.left.equalTo(lastLeft.right).offset(this.bottomButtonEdges * 1.5)
                make.right.equalTo(view.prev.left).offset(-this.bottomButtonEdges * 1.5) // 右侧按钮是倒序的
            }
        }
        return [
            ...leftButtons.map(btn => this.#bottomBarButtonView(btn, UIKit.align.left)),
            ...rightButtons.map(btn => this.#bottomBarButtonView(btn, UIKit.align.right)),
            spaceButton
        ]
    }

    getBottomBarView() {
        return {
            type: "view",
            views: this.getBottomButtonsView(),
            layout: (make, view) => {
                make.bottom.equalTo(view.super.safeArea)
                make.left.equalTo(view.super.safeArea).offset(this.views.containerMargin)
                make.right.equalTo(view.super.safeArea).offset(-this.views.containerMargin)
                make.height.equalTo(this.bottomBarHeight)
            }
        }
    }

    itemContainer(views) {
        if (this.useBlur) {
            return UIKit.blurBox({ style: $blurStyle.ultraThinMaterial }, views, $layout.fill)
        } else {
            return {
                type: "view",
                props: { bgcolor: this.itemBackground },
                views,
                layout: $layout.fill
            }
        }
    }

    get matrixTemplate() {
        return {
            props: {
                smoothCorners: true,
                cornerRadius: 10
            },
            views: [
                this.itemContainer([
                    {
                        type: "view",
                        props: {
                            id: "copied",
                            circular: this.views.copiedIndicatorSize,
                            hidden: true,
                            bgcolor: $color("green")
                        },
                        layout: (make, view) => {
                            make.size.equalTo(this.views.copiedIndicatorSize)
                            // 放在前面小缝隙的中间 `this.copyedIndicatorSize / 2` 指大小的一半
                            make.left.top.inset(this.matrixBoxMargin / 2)
                        }
                    },
                    {
                        type: "label",
                        props: {
                            id: "content",
                            lines: 0,
                            font: $font(this.views.fontSize)
                        },
                        layout: (make, view) => {
                            make.top.left.right.equalTo(view.super).inset(this.matrixBoxMargin)
                            make.height
                                .lessThanOrEqualTo(view.super)
                                .offset(-this.matrixBoxMargin * 2 - this.views.tagHeight)
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
                            make.height.equalTo(this.views.tagHeight)
                            make.bottom.equalTo(view.super).inset(this.matrixBoxMargin)
                        }
                    }
                ]),
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
                Sheet.quickLookImage(clip.imageOriginal)
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
                id: this.views.listId,
                bgcolor: $color("clear"),
                menu: this.delegates.menu,
                direction: $scrollDirection.horizontal,
                alwaysBounceVertical: false,
                alwaysBounceHorizontal: true,
                showsHorizontalIndicator: false,
                columns: 1,
                spacing: this.matrixBoxMargin,
                template: this.matrixTemplate,
                backgroundView: $ui.create(this.views.getEmptyBackground())
            },
            layout: (make, view) => {
                make.top.inset(0)
                make.width.equalTo(view.super)
                make.bottom.equalTo(view.super.safeAreaBottom).offset(-1 * (this.bottomBarHeight - this.navHeight))
            },
            events: {
                ready: () => this.listReady(),
                didSelect: this.itemSelect,
                itemSize: (sender, indexPath) => {
                    let size = this.keyboardFrameHeight - this.navHeight - this.bottomBarHeight
                    size -= this.matrixBoxMargin * 2
                    this.itemSize[indexPath.item] = size
                    return $size(size, size)
                },
                layoutSubviews: view => {
                    const staticHeight = this.navHeight + this.bottomBarHeight + this.matrixBoxMargin
                    const minHeight = staticHeight * 2 - this.matrixBoxMargin + 1
                    const height = Math.max(view.frame.height, minHeight)
                    if (this.keyboardFrameHeight !== height) {
                        this.keyboardFrameHeight = height
                        view.reload()
                    }
                }
            }
        }
        return matrix
    }

    getListView() {
        const listView = super.getListView()
        listView.layout = (make, view) => {
            make.top.equalTo(this.navHeight - 1) // list height 高度为 1
            make.width.equalTo(view.super)
            make.bottom.equalTo(view.super.safeAreaBottom).offset(-this.bottomBarHeight - this.views.containerMargin)
        }

        this.delegates.didSelectRowAtIndexPath = (sender, indexPath) => {
            sender = sender.jsValue()
            indexPath = indexPath.jsValue()
            this.itemSelect(sender, indexPath)
        }
        this.delegates.shouldBeginMultipleSelectionInteractionAtIndexPath = () => {
            return false
        }
        listView.props.separatorColor = $color("lightGray")
        listView.props.separatorInset = $insets(0, this.views.horizontalMargin, 0, this.views.horizontalMargin)
        delete listView.events.pulled
        listView.props.header = { props: { height: 1 } }
        listView.props.style = 2

        const itemView = listView.props.template.views[0].views
        listView.props.template.views[0] = this.itemContainer(itemView)

        return listView
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
                this.kernel.actions.views.getActionMiniView(async () => {
                    return await this.getKeyboardActionData()
                })
            ],
            layout: (make, view) => {
                make.top.equalTo(this.navHeight)
                make.left.equalTo(this.views.containerMargin)
                make.right.equalTo(-this.views.containerMargin)
                make.bottom.equalTo(-this.bottomBarHeight)
            }
        }
    }

    getView() {
        const bgView = {
            type: "view",
            views: [
                {
                    type: "image",
                    props: { image: this.backgroundImage },
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
        }
        return {
            type: "view",
            props: { id: this.keyboardId },
            views: [
                this.backgroundImage ? bgView : {},
                this.getDataView(),
                this.getTopBarView(),
                this.getBottomBarView(),
                this.getActionView()
            ],
            layout: (make, view) => {
                make.width.bottom.equalTo(view.super)
                make.height.equalTo(this.keyboardHeight)
            }
        }
    }
}

module.exports = Keyboard
