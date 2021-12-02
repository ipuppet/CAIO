const VERSION = "1.0.0"
const ROOT_PATH = "/script/easy-jsbox.js" // JSBox path, not nodejs
const SHARED_PATH = "shared://EasyJsBox"

function l10n(language, content) {
    if (typeof content === "string") {
        const strings = {}
        const strArr = content.split(";")
        strArr.forEach(line => {
            line = line.trim()
            if (line !== "") {
                const kv = line.split("=")
                strings[kv[0].trim().slice(1, -1)] = kv[1].trim().slice(1, -1)
            }
        })
        content = strings
    }
    const strings = $app.strings
    strings[language] = Object.assign(content, $app.strings[language])
    $app.strings = strings
}

function uuid() {
    const s = []
    const hexDigits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    for (let i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
    }
    s[14] = "4" // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-"
    return s.join("")
}

class Controller {
    constructor() {
        this.events = {}
    }

    setEvents(events) {
        Object.keys(events).forEach(event => this.setEvent(event, events[event]))
        return this
    }

    setEvent(event, callback) {
        this.events[event] = callback
        return this
    }

    callEvent(event, ...args) {
        if (typeof this.events[event] === "function") {
            this.events[event](...args)
        }
    }
}

class View {
    constructor(args = {}) {
        // 属性
        this.id = uuid()
        this.props = args.props ?? {}
        this.props.id = this.id
        this.views = args.views ?? []
        this.events = args.events ?? {}
        this.layout = args.layout ?? $layout.fill
    }

    setProps(props) {
        Object.keys(props).forEach(key => this.setProp(key, props[key]))
        return this
    }

    setProp(key, prop) {
        this.props[key] = prop
        return this
    }

    setViews(views) {
        this.views = views
        return this
    }

    setEvents(events) {
        Object.keys(events).forEach(event => this.setEvent(event, events[event]))
        return this
    }

    setEvent(event, action) {
        this.events[event] = action
        return this
    }

    setLayout(layout) {
        this.layout = layout
        return this
    }

    getView() { }

    get definition() {
        const view = this.getView()
        return (view instanceof ContainerView) ? view.getView() : view
    }
}

class UIKit {
    constructor() {
        // 隐藏 jsbox 默认 nav 栏
        this.jsboxNavHidden = true
    }

    static get statusBarHeight() {
        return $device.isIphoneX ? 44 : 20
    }

    static get align() {
        return { left: 0, right: 1, top: 2, bottom: 3 }
    }

    static get textColor() {
        return $color("primaryText", "secondaryText")
    }

    static get linkColor() {
        return $color("systemLink")
    }

    static separatorLine(props = {}, align = UIKit.align.bottom) {
        return { // canvas
            type: "canvas",
            props: props,
            layout: (make, view) => {
                if (view.prev === undefined) return false
                if (align === UIKit.align.bottom) {
                    make.top.equalTo(view.prev.bottom)
                } else {
                    make.top.equalTo(view.prev.top)
                }
                make.height.equalTo(1 / $device.info.screen.scale)
                make.left.right.inset(0)
            },
            events: {
                draw: (view, ctx) => {
                    ctx.strokeColor = $color("separatorColor")
                    ctx.setLineWidth(1)
                    ctx.moveToPoint(0, 0)
                    ctx.addLineToPoint(view.frame.width, 0)
                    ctx.strokePath()
                }
            }
        }
    }

    static blurBox(props = {}, views = []) {
        return {
            type: "blur",
            props: Object.assign({
                style: $blurStyle.thinMaterial
            }, props),
            views: views,
            layout: $layout.fill
        }
    }

    /**
     * 获取Window大小
     * @returns 
     */
    static getWindowSize() {
        return $objc("UIWindow").$keyWindow().jsValue().size
    }

    /**
     * 是否属于大屏设备
     */
    static isLargeScreen() {
        return $device.isIpad || $device.isIpadPro
    }

    /**
     * 判断是否是分屏模式
     * @returns {Boolean}
     */
    static isSplitScreenMode() {
        return $device.info.screen.width !== UIKit.getWindowSize().width
    }

    useJsboxNav() {
        this.jsboxNavHidden = false
    }

    setTitle(title) {
        $ui.title = title
        this.title = title
    }

    setNavButtons(buttons) {
        this.navButtons = buttons
    }

    UIRender(view) {
        view.props = Object.assign({
            title: this.title,
            navBarHidden: this.jsboxNavHidden,
            navButtons: this.navButtons ?? [],
            statusBarStyle: 0
        }, view.props)
        $ui.render(view)
    }
}

class ViewController extends Controller {
    constructor() {
        super()
        this.title = ""
        this.pageControllers = []
    }

    /**
     * @param {PageController} pageController 
     */
    onPop(pageController) {
        this.callEvent("onPop", pageController) // 被弹出的对象
        this.pageControllers.pop()
    }

    /**
     * push 新页面
     * @param {PageController} pageController 
     */
    push(pageController) {
        const parent = this.pageControllers[this.pageControllers.length - 1]
        pageController.navigationItem.addPopButton(parent?.navigationItem.title)
        this.pageControllers.push(pageController)
        $ui.push({
            props: {
                statusBarStyle: 0,
                navBarHidden: true
            },
            events: {
                disappeared: () => {
                    this.onPop(pageController)
                }
            },
            views: [pageController.getPage().definition],
            layout: $layout.fill
        })
    }

    /**
     * 
     * @param {PageView} pageView 
     * @returns 
     */
    setRootPageController(pageView) {
        this.pageControllers = []
        this.pageControllers.push(pageView)
        return this
    }

    hasRootPageController() {
        return this.pageControllers[0] instanceof PageView
    }

    getRootPageController() {
        return this.pageControllers[0]
    }
}

class ContainerView extends View {
    static createByViews(views) {
        return new this({ views })
    }

    static createByContainers(containers) {
        const views = containers.map(container => container.definition)
        return this.createByViews(views)
    }

    getView() {
        return {
            type: "view",
            props: this.props,
            views: this.views,
            events: this.events,
            layout: this.layout
        }
    }
}

class Sheet extends View {
    init() {
        const UIModalPresentationStyle = { pageSheet: 1 } // TODO: sheet style
        const { width, height } = $device.info.screen
        const UIView = $objc("UIView").invoke("initWithFrame", $rect(0, 0, width, height))
        const PSViewController = $objc("UIViewController").invoke("alloc.init")
        const PSViewControllerView = PSViewController.$view()
        PSViewControllerView.$setBackgroundColor($color("primarySurface"))
        PSViewControllerView.$addSubview(UIView)
        PSViewController.$setModalPresentationStyle(UIModalPresentationStyle.pageSheet)
        this._present = () => {
            PSViewControllerView.jsValue().add(this.view)
            $ui.vc.ocValue().invoke("presentModalViewController:animated", PSViewController, true)
        }
        this._dismiss = () => PSViewController.invoke("dismissModalViewControllerAnimated", true)
        return this
    }

    /**
     * 设置 view
     * @param {Object} view 视图对象
     * @returns this
     */
    setView(view = {}) {
        if (typeof view !== "object") throw "The type of the parameter `view` must be object."
        this.view = view
        return this
    }

    /**
     * 为 view 添加一个 navBar
     * @param {String} title 标题
     * @param {Function} callback 按钮回调函数，若未定义则调用 this.dismiss()
     * @param {String} btnText 按钮显示的文字，默认为 "Done"
     * @returns this
     */
    addNavBar(title, callback, btnText = "Done") {
        if (this.view === undefined) throw "Please call setView(view) first."
        const pageController = new PageController()
        pageController.navigationItem
            .addPopButton("", { // 返回按钮
                type: "button",
                props: {
                    bgcolor: $color("clear"),
                    tintColor: UIKit.linkColor,
                    title: btnText,
                    titleColor: UIKit.linkColor,
                    font: $font("bold", 16)
                },
                layout: (make, view) => {
                    make.left.inset(15)
                    make.centerY.equalTo(view.super)
                },
                events: {
                    tapped: () => {
                        this.dismiss()
                        if (typeof callback === "function") callback()
                    }
                }
            })
            .setTitle(title)
            .setLargeTitleDisplayMode(NavigationItem.LargeTitleDisplayModeNever)
        pageController
            .setView(this.view)
            .navigationController.navigationBar
            .withoutStatusBarHeight()
        this.view = pageController.getPage().definition
        return this
    }

    /**
     * 弹出 Sheet
     */
    present() {
        this._present()
    }

    /**
     * 关闭 Sheet
     */
    dismiss() {
        this._dismiss()
    }
}

class NavigationBar extends View {
    constructor(args) {
        super(args)
        this.prefersLargeTitles = true
        this.navigationBarNormalHeight = 44
        this.navigationBarLargeTitleHeight = 96
        this.largeTitleFontSize = 34
        this.largeTitleTopOffset = this.navigationBarNormalHeight
        this.isAddStatusBarHeight = true
    }

    withoutStatusBarHeight() {
        this.isAddStatusBarHeight = false
    }

    setNavigationItem(navigationItem) {
        this.navigationItem = navigationItem
    }

    setBackgroundColor(backgroundColor) {
        this.backgroundColor = backgroundColor
        return this
    }

    setPrefersLargeTitles(bool) {
        this.prefersLargeTitles = bool
        return this
    }

    /**
     * 页面大标题
     */
    getLargeTitleView() {
        return this.prefersLargeTitles
            && this.navigationItem.largeTitleDisplayMode !== NavigationItem.LargeTitleDisplayModeNever
            ? {
                type: "label",
                props: {
                    id: this.id + "-large-title",
                    text: this.navigationItem.title,
                    textColor: UIKit.textColor,
                    align: $align.left,
                    font: $font("bold", this.largeTitleFontSize),
                    line: 1
                },
                layout: (make, view) => {
                    make.left.equalTo(view.super.safeArea).offset(15)
                    make.height.equalTo(this.largeTitleFontSize + 5)
                    make.top.equalTo(view.super).offset(this.largeTitleTopOffset)
                }
            } : {}
    }

    getNavigationBarView() {
        const getButtonView = (buttons, align) => {
            return buttons.length > 0 ? {
                type: "view",
                views: [{
                    type: "view",
                    views: buttons,
                    layout: $layout.fill
                }],
                layout: (make, view) => {
                    make.top.equalTo(view.super.safeAreaTop)
                    make.bottom.equalTo(view.super.safeAreaTop).offset(this.largeTitleTopOffset)
                    if (align === UIKit.align.left) make.left.inset(5)
                    else make.right.inset(5)
                    make.width.equalTo(buttons.length * BarButtonItem.width)
                }
            } : {}
        }
        const rightButtonView = getButtonView(this.navigationItem.rightButtons, UIKit.align.right)
        const leftButtonView = this.navigationItem.popButtonView ?? getButtonView(this.navigationItem.leftButtons, UIKit.align.left)
        const isHideBackground = this.prefersLargeTitles && this.navigationItem.largeTitleDisplayMode !== NavigationItem.LargeTitleDisplayModeNever
        const isHideTitle = !this.prefersLargeTitles || this.navigationItem.largeTitleDisplayMode === NavigationItem.LargeTitleDisplayModeNever
        return { // 顶部bar
            type: "view",
            props: {
                id: this.id + "-navigation",
                bgcolor: $color("clear")
            },
            layout: make => {
                make.left.top.right.inset(0)
                make.height.equalTo(
                    this.isAddStatusBarHeight
                        ? this.navigationBarNormalHeight + UIKit.statusBarHeight
                        : this.navigationBarNormalHeight
                )
            },
            views: [
                this.backgroundColor ? {
                    type: "view",
                    props: {
                        hidden: isHideBackground,
                        bgcolor: this.backgroundColor,
                        id: this.id + "-background"
                    },
                    layout: $layout.fill
                } : UIKit.blurBox({
                    hidden: isHideBackground,
                    id: this.id + "-background"
                }),
                UIKit.separatorLine({
                    id: this.id + "-underline",
                    alpha: isHideBackground ? 0 : 1
                }),
                { // titleView
                    type: "view",
                    views: [
                        this.navigationItem.titleView ? this.navigationItem.titleView : { // 标题
                            type: "label",
                            props: {
                                id: this.id + "-small-title",
                                alpha: isHideTitle ? 1 : 0,  // 不显示大标题则显示小标题
                                text: this.navigationItem.title,
                                font: $font("bold", 17),
                                align: $align.center,
                                bgcolor: $color("clear"),
                                textColor: UIKit.textColor
                            },
                            layout: (make, view) => {
                                make.left.right.inset(0)
                                make.height.equalTo(17)
                                make.centerY.equalTo(view.super.safeArea)
                            }
                        }
                    ],
                    layout: (make, view) => {
                        make.left.right.inset(0)
                        make.top.equalTo(view.super.safeAreaTop)
                        make.bottom.equalTo(view.super)
                    }
                }
            ].concat(rightButtonView, leftButtonView)
        }
    }
}

/**
 * 用于创建一个靠右侧按钮（自动布局）
 * this.events.tapped 按钮点击事件，会传入三个函数，start()、done()和cancel()
 *     调用 start() 表明按钮被点击，准备开始动画
 *     调用 done() 表明您的操作已经全部完成，默认操作成功完成，播放一个按钮变成对号的动画
 *                 若第一个参数传出false则表示运行出错
 *                 第二个参数为错误原因($ui.toast(message))
 *      调用 cancel() 表示取消操作
 *     示例：
 *      (start, done, cancel) => {
 *          start()
 *          const upload = (data) => { return false }
 *          if (upload(data)) { done() }
 *          else { done(false, "Upload Error!") }
 *      }
 * @param {String} this.align 对齐方式 View.align.right View.align.left
 */
class BarButtonItem extends View {
    constructor(args) {
        super(args)
        this.title = "Button"
        this.align = UIKit.align.right
    }

    static get width() {
        return 40
    }

    setTitle(title) {
        this.title = title
        return this
    }

    setSymbol(symbol) {
        this.symbol = symbol
        return this
    }

    setAlign(align) {
        this.align = align
        return this
    }

    actionStart() {
        // 隐藏button，显示spinner
        const button = $(this.id)
        button.alpha = 0
        button.hidden = true
        $("spinner-" + this.id).alpha = 1
    }

    actionDone(status = true, message = $l10n("ERROR")) {
        $("spinner-" + this.id).alpha = 0
        const button = $(this.id)
        button.hidden = false
        if (!status) { // 失败
            $ui.toast(message)
            button.alpha = 1
            return
        }
        // 成功动画
        button.symbol = "checkmark"
        $ui.animate({
            duration: 0.6,
            animation: () => {
                button.alpha = 1
            },
            completion: () => {
                setTimeout(() => {
                    $ui.animate({
                        duration: 0.4,
                        animation: () => {
                            button.alpha = 0
                        },
                        completion: () => {
                            button.symbol = this.symbol
                            $ui.animate({
                                duration: 0.4,
                                animation: () => {
                                    button.alpha = 1
                                },
                                completion: () => {
                                    button.alpha = 1
                                }
                            })
                        }
                    })
                }, 600)
            }
        })
    }

    actionCancel() {
        $("spinner-" + this.id).alpha = 0
        const button = $(this.id)
        button.alpha = 1
        button.hidden = false
    }

    getView() {
        return {
            type: "view",
            views: [
                {
                    type: "button",
                    props: {
                        id: this.id,
                        tintColor: UIKit.textColor,
                        symbol: this.symbol,
                        title: this.title,
                        titleColor: UIKit.textColor,
                        contentEdgeInsets: $insets(0, 0, 0, 0),
                        imageEdgeInsets: $insets(0, 0, 0, 0),
                        bgcolor: $color("clear")
                    },
                    events: {
                        tapped: sender => {
                            this.events.tapped({
                                start: () => this.actionStart(),
                                done: () => this.actionDone(),
                                cancel: () => this.actionCancel()
                            }, sender)
                        }
                    },
                    layout: $layout.fill
                },
                {
                    type: "spinner",
                    props: {
                        id: "spinner-" + this.id,
                        loading: true,
                        alpha: 0
                    },
                    layout: $layout.fill
                }
            ],
            layout: (make, view) => {
                make.height.equalTo(view.super)
                make.width.equalTo(BarButtonItem.width)
                if (view.prev && view.prev.id !== "label" && view.prev.id !== undefined) {
                    if (UIKit.align === UIKit.align.right) make.right.equalTo(view.prev.left)
                    else make.left.equalTo(view.prev.right)
                } else {
                    if (UIKit.align === UIKit.align.right) make.right.inset(0)
                    else make.left.inset(0)
                }
            }
        }
    }
}

class NavigationItem {
    constructor() {
        this.rightButtons = []
        this.leftButtons = []
        this.hasbutton = false
        this.largeTitleDisplayMode = NavigationItem.LargeTitleDisplayModeAutomatic
        this.largeTitleHeightOffset = 0
    }

    static get LargeTitleDisplayModeAutomatic() {
        return 0
    }

    static get LargeTitleDisplayModeAlways() {
        return 1
    }

    static get LargeTitleDisplayModeNever() {
        return 2
    }

    setTitle(title) {
        this.title = title
        return this
    }

    setTitleView(titleView) {
        this.titleView = titleView
        return this
    }

    setLargeTitleDisplayMode(mode) {
        this.largeTitleDisplayMode = mode
        return this
    }

    setLargeTitleHeightOffset(offset) {
        this.largeTitleHeightOffset = offset
        return this
    }

    setBackgroundColor(backgroundColor) {
        this.backgroundColor = backgroundColor
        return this
    }

    setRightButtons(buttons) {
        buttons.forEach(button => this.addRightButton(button.symbol, button.title, button.tapped))
        if (!this.hasbutton) this.hasbutton = true
        return this
    }

    setLeftButtons(buttons) {
        buttons.forEach(button => this.addLeftButton(button.symbol, button.title, button.tapped))
        if (!this.hasbutton) this.hasbutton = true
        return this
    }

    addRightButton(symbol, title, tapped) {
        const barButtonItem = new BarButtonItem()
        barButtonItem
            .setEvent("tapped", tapped)
            .setAlign(UIKit.align.right)
            .setSymbol(symbol)
            .setTitle(title)
        this.rightButtons.push(barButtonItem.definition)
        if (!this.hasbutton) this.hasbutton = true
        return this
    }

    addLeftButton(symbol, title, tapped) {
        const barButtonItem = new BarButtonItem()
        barButtonItem
            .setEvent("tapped", tapped)
            .setAlign(UIKit.align.left)
            .setSymbol(symbol)
            .setTitle(title)
        this.leftButtons.push(barButtonItem.definition)
        if (!this.hasbutton) this.hasbutton = true
        return this
    }

    /**
     * 覆盖左侧按钮
     * @param {String} parent 父页面标题，将会显示为文本按钮
     * @param {Object} view 自定义按钮视图
     * @returns 
     */
    addPopButton(parent, view) {
        if (!parent) {
            parent = $l10n("BACK")
        }
        this.popButtonView = view ?? { // 返回按钮
            type: "button",
            props: {
                bgcolor: $color("clear"),
                symbol: "chevron.left",
                tintColor: UIKit.linkColor,
                title: ` ${parent}`,
                titleColor: UIKit.linkColor,
                font: $font("bold", 16)
            },
            layout: (make, view) => {
                make.left.inset(10)
                make.centerY.equalTo(view.super.safeArea)
            },
            events: { tapped: () => { $ui.pop() } }
        }
        return this
    }

    removePopButton() {
        this.popButtonView = undefined
        return this
    }
}

/**
 * events:
 * - onPop(navigationView)
 */
class NavigationController extends Controller {
    constructor() {
        super()
        this.navigationBar = new NavigationBar()
    }

    updateSelector() {
        this.selector = {
            navigation: $(this.navigationBar.id + "-navigation"),
            largeTitleView: $(this.navigationBar.id + "-large-title"),
            smallTitleView: $(this.navigationBar.id + "-small-title"),
            underlineView: $(this.navigationBar.id + "-underline"),
            backgroundView: $(this.navigationBar.id + "-background")
        }
    }

    toNormal() {
        this.updateSelector()
        $ui.animate({
            duration: 0.2,
            animation: () => {
                // 显示下划线和背景
                this.selector.underlineView.alpha = 1
                this.selector.backgroundView.hidden = false
                // 隐藏大标题，显示小标题
                this.selector.smallTitleView.alpha = 1
                this.selector.largeTitleView.alpha = 0
            }
        })
        if (this.navigationBar?.navigationItem) {
            this.navigationBar.navigationItem.largeTitleDisplayMode = NavigationItem.LargeTitleDisplayModeNever
        }
    }

    toLargeTitle() {
        this.updateSelector()
        this.selector.underlineView.alpha = 0
        this.selector.backgroundView.hidden = true
        $ui.animate({
            duration: 0.2,
            animation: () => {
                this.selector.smallTitleView.alpha = 0
                this.selector.largeTitleView.alpha = 1
            }
        })
        if (this.navigationBar?.navigationItem) {
            this.navigationBar.navigationItem.largeTitleDisplayMode = NavigationItem.LargeTitleDisplayModeAlways
        }
    }

    scrollAction(sender) {
        if (!this.navigationBar.prefersLargeTitles) return
        if (this.navigationBar?.navigationItem.largeTitleDisplayMode !== NavigationItem.LargeTitleDisplayModeAutomatic) return
        this.updateSelector()
        // 样式
        const titleSizeMax = 40 // 下拉放大字体最大值
        // 标题跟随
        this.selector.largeTitleView.updateLayout((make, view) => {
            make.top.equalTo(view.super).offset(this.navigationBar.largeTitleTopOffset - sender.contentOffset.y)
        })
        if (sender.contentOffset.y > -1 * UIKit.statusBarHeight) {
            this.selector.backgroundView.hidden = false
            if (sender.contentOffset.y > 40 - UIKit.statusBarHeight) {
                $ui.animate({
                    duration: 0.2,
                    animation: () => {
                        // 显示下划线和背景
                        this.selector.underlineView.alpha = 1
                        this.selector.backgroundView.hidden = false
                        // 隐藏大标题，显示小标题
                        this.selector.smallTitleView.alpha = 1
                        this.selector.largeTitleView.alpha = 0
                    }
                })
            } else {
                this.selector.underlineView.alpha = 0
                $ui.animate({
                    duration: 0.2,
                    animation: () => {
                        this.selector.smallTitleView.alpha = 0
                        this.selector.largeTitleView.alpha = 1
                    }
                })
            }
        } else {
            // 下拉放大字体
            if (sender.contentOffset.y <= -10 - UIKit.statusBarHeight) {
                let size = this.navigationBar.largeTitleFontSize - sender.contentOffset.y * 0.04
                if (size > titleSizeMax) size = titleSizeMax
                this.selector.largeTitleView.font = $font("bold", size)
            } else {
                this.selector.backgroundView.hidden = true
            }
        }
    }
}

class PageView extends ContainerView {
    constructor(args = {}) {
        super(args)
        this.activeStatus = true
    }

    show() {
        $(this.props.id).hidden = false
        this.activeStatus = true
    }

    hide() {
        $(this.props.id).hidden = true
        this.activeStatus = false
    }

    setHorizontalSafeArea(bool) {
        this.horizontalSafeArea = bool
        return this
    }

    _layout(make, view) {
        make.top.bottom.equalTo(view.super)
        if (this.horizontalSafeArea) {
            make.left.right.equalTo(view.super.safeArea)
        } else {
            make.left.right.equalTo(view.super)
        }
    }

    getView() {
        this.layout = this._layout
        this.props.clipsToBounds = true
        this.props.hidden = !this.activeStatus
        return super.getView()
    }
}

/**
 * events:
 * - onChange(from, to)
 */
class PageController extends Controller {
    constructor() {
        super()
        this.navigationItem = new NavigationItem()
        this.navigationController = new NavigationController()
        this.navigationController.navigationBar.setNavigationItem(this.navigationItem)
    }

    /**
     * 
     * @param {Object} view 
     * @returns 
     */
    setView(view) {
        if (view.props === undefined) view.props = {}
        if (view.events === undefined) view.events = {}
        this.view = view
        return this
    }

    initPage() {
        if (this.navigationController.navigationBar.prefersLargeTitles) {
            if (typeof this.view !== "object") throw "The type of the parameter `view` must be object."
            const scrollView = [
                "list",
                "matrix"
            ]
            if (scrollView.indexOf(this.view.type) === -1) {
                this.view.layout = (make, view) => {
                    make.bottom.left.right.equalTo(view.super)
                    make.top.equalTo(
                        this.navigationController.navigationBar.isAddStatusBarHeight
                            ? this.navigationController.navigationBar.navigationBarNormalHeight + UIKit.statusBarHeight
                            : this.navigationController.navigationBar.navigationBarNormalHeight
                    )
                }
            } else {
                // 修饰视图
                this.view.layout = $layout.fill
                if (!this.view.events) this.view.events = {}
                const oldScrollAction = this.view.events.didScroll
                this.view.events.didScroll = sender => {
                    this.navigationController.scrollAction(sender)
                    if (typeof oldScrollAction === "function") oldScrollAction(sender)
                }
                if (!this.view.props.header) this.view.props.header = {}
                this.view.props.header.props = Object.assign(this.view.props.header.props ?? {}, {
                    height: (this.navigationItem.largeTitleDisplayMode !== NavigationItem.LargeTitleDisplayModeNever
                        ? this.navigationController.navigationBar.navigationBarLargeTitleHeight
                        : this.navigationController.navigationBar.navigationBarNormalHeight)
                        + this.navigationItem.largeTitleHeightOffset
                })
            }
            this.page = PageView.createByViews([
                this.view,
                this.navigationController.navigationBar.getLargeTitleView(),
                this.navigationController.navigationBar.getNavigationBarView()
            ])
        } else {
            this.page = PageView.createByViews([this.view])
        }
        return this
    }

    getPage() {
        if (!this.page) {
            this.initPage()
        }
        return this.page
    }
}

class TabBarCellView extends ContainerView {
    constructor(args = {}) {
        super(args)
        this.props.id = this.id
        this.setIcon(args.icon)
        this.setTitle(args.title)
        if (args.activeStatus !== undefined) {
            this.activeStatus = args.activeStatus
        }
    }

    setIcon(icon) {
        // 格式化单个icon和多个icon
        if (icon instanceof Array) {
            this.icon = icon
        } else {
            this.icon = [icon, icon]
        }
        return this
    }

    setTitle(title) {
        this.title = title
        return this
    }

    active() {
        $(`${this.props.id}-icon`).image = $image(this.icon[1])
        $(`${this.props.id}-icon`).tintColor = $color("systemLink")
        $(`${this.props.id}-title`).textColor = $color("systemLink")
        this.activeStatus = true
    }

    inactive() {
        $(`${this.props.id}-icon`).image = $image(this.icon[0])
        $(`${this.props.id}-icon`).tintColor = $color("lightGray")
        $(`${this.props.id}-title`).textColor = $color("lightGray")
        this.activeStatus = false
    }

    getView() {
        this.views = [
            {
                type: "image",
                props: {
                    id: `${this.props.id}-icon`,
                    image: $image(this.activeStatus ? this.icon[1] : this.icon[0]),
                    bgcolor: $color("clear"),
                    tintColor: $color(this.activeStatus ? "systemLink" : "lightGray")
                },
                layout: (make, view) => {
                    make.centerX.equalTo(view.super)
                    make.size.equalTo(25)
                    make.top.inset(7)
                }
            },
            {
                type: "label",
                props: {
                    id: `${this.props.id}-title`,
                    text: this.title,
                    font: $font(10),
                    textColor: $color(this.activeStatus ? "systemLink" : "lightGray")
                },
                layout: (make, view) => {
                    make.centerX.equalTo(view.prev)
                    make.bottom.inset(5)
                }
            }
        ]
        return super.getView()
    }
}

class TabBarController extends Controller {
    constructor() {
        super()
        this.selected = undefined
        this.pages = {}
        this.cells = {}
    }

    /**
     * 
     * @param {Object} pages 
     * @returns 
     */
    setPages(pages = {}) {
        Object.keys(pages).forEach(key => this.setPage(key, pages[key]))
        return this
    }

    setPage(key, page) {
        if (this.selected === undefined) this.selected = key
        if (page instanceof PageView) {
            this.pages[key] = page
        } else {
            this.pages[key] = PageView.createByViews(page)
        }
        if (this.selected !== key) this.pages[key].activeStatus = false
        return this
    }

    switchPageTo(key) {
        if (this.pages[key]) {
            this.pages[this.selected].hide()
            this.pages[key].show()
            this.callEvent("onChange", this.selected, key)
            this.selected = key
        }
    }

    /**
     * 
     * @param {Object} cells 
     * @returns 
     */
    setCells(cells = {}) {
        Object.keys(cells).forEach(key => this.setCell(key, cells[key]))
        return this
    }

    setCell(key, cell) {
        if (this.selected === undefined) this.selected = key
        if (!(cell instanceof TabBarCellView)) {
            cell = new TabBarCellView({
                props: { info: { key } },
                icon: cell.icon,
                title: cell.title,
                activeStatus: this.selected === key
            })
        }
        this.cells[key] = cell
        return this
    }

    cellViews() {
        const views = []
        Object.values(this.cells).forEach(cell => {
            cell.setEvent("tapped", sender => {
                const key = sender.info.key
                if (this.selected === key) return
                // menu动画
                $ui.animate({
                    duration: 0.4,
                    animation: () => {
                        // 点击的图标
                        cell.active()
                    }
                })
                // 之前的图标
                this.cells[this.selected].inactive()
                // 切换页面
                this.switchPageTo(key)
            })
            views.push(cell.getView())
        })
        return views
    }

    pageViews() {
        return Object.values(this.pages).map(page => page.definition)
    }

    generateView() {
        const tabBarView = {
            type: "view",
            layout: (make, view) => {
                make.centerX.equalTo(view.super)
                make.width.equalTo(view.super)
                make.top.equalTo(view.super.safeAreaBottom).offset(-50)
                make.bottom.equalTo(view.super)
            },
            views: [
                UIKit.blurBox({}, [{
                    type: "stack",
                    layout: $layout.fillSafeArea,
                    props: {
                        axis: $stackViewAxis.horizontal,
                        distribution: $stackViewDistribution.fillEqually,
                        spacing: 0,
                        stack: {
                            views: this.cellViews()
                        }
                    }
                }]),
                UIKit.separatorLine({}, UIKit.align.top)
            ]
        }
        return ContainerView.createByViews(this.pageViews().concat(tabBarView))
    }
}

class Kernel {
    constructor() {
        this.startTime = Date.now()
        this.path = {
            root: ROOT_PATH,
            shared: SHARED_PATH
        }
        this.version = VERSION
        this.name = $addin.current.name
        this.UIKit = new UIKit()
        this.UIKit.setTitle(this.name)
    }

    uuid() {
        return uuid()
    }

    l10n(language, content) {
        l10n(language, content)
    }

    debug(print) {
        this.debugMode = true
        if (typeof print === "function") {
            this.debugPrint = print
        }
        this.print("You are running EasyJsBox in debug mode.")
    }

    print(message) {
        if (!this.debugMode) return
        if (typeof this.debugPrint === "function") {
            this.debugPrint(message)
        } else {
            console.log(message)
        }
    }
}

/**
 * events:
 * - onSet(key, value)
 */
class Setting extends Controller {
    constructor(args = {}) {
        super()
        this.savePath = args.savePath ?? (() => {
            if (!$file.exists("/storage")) {
                $file.mkdir("/storage")
            }
            return "/storage/setting.json"
        })()
        if (args.structure) {
            this.setStructure(args.structure) // structure 优先级高于 structurePath
        } else {
            this.setStructurePath(args.structurePath ?? "/setting.json")
        }
        this.setName(args.name ?? uuid())
        // l10n
        this.loadL10n()
        // 用来控制 child 类型
        this.viewController = new ViewController()
        // 用于存放 script 类型用到的方法
        this.method = {}
    }

    /**
     * 从 this.structure 加载数据
     * @returns this
     */
    loadConfig() {
        this.setting = {}
        let userData = {}
        const exclude = [
            "script", // script 类型永远使用setting结构文件内的值
            "info"
        ]
        if ($file.exists(this.savePath)) {
            userData = JSON.parse($file.read(this.savePath).string)
        }
        function setValue(structure) {
            const setting = {}
            for (let section of structure) {
                for (let item of section.items) {
                    if (item.type === "child") {
                        const child = setValue(item.children)
                        Object.assign(setting, child)
                    } else if (exclude.indexOf(item.type) < 0) {
                        setting[item.key] = item.key in userData ? userData[item.key] : item.value
                    } else { // 被排除的项目直接赋值
                        setting[item.key] = item.value
                    }
                }
            }
            return setting
        }
        this.setting = setValue(this.structure)
        return this
    }

    hasSectionTitle(structure) {
        return structure[0]["title"] ? true : false
    }

    loadL10n() {
        l10n("zh-Hans", `
        "OK" = "好";
        "CANCEL" = "取消";
        "CLEAR" = "清除";
        "BACK" = "返回";
        "ERROR" = "发生错误";
        "SUCCESS" = "成功";
        "INVALID_VALUE" = "非法参数";
        
        "SETTING" = "设置";
        "GENERAL" = "一般";
        "ADVANCED" = "高级";
        "TIPS" = "小贴士";
        "COLOR" = "颜色";
        "COPY" = "复制";
        "COPIED" = "复制成功";
        
        "JSBOX_ICON" = "JSBox 内置图标";
        "SF_SYMBOLS" = "SF Symbols";
        "IMAGE_BASE64" = "图片/ base64";
        
        "ABOUT" = "关于";
        "VERSION" = "Version";
        "AUTHOR" = "作者";
        "AT_BOTTOM" = "已经到底啦~";
        `)
        l10n("en", `
        "OK" = "OK";
        "CANCEL" = "Cancel";
        "CLEAR" = "Clear";
        "BACK" = "Back";
        "ERROR" = "Error";
        "SUCCESS" = "Success";
        "INVALID_VALUE" = "Invalid value";

        "SETTING" = "Setting";
        "GENERAL" = "General";
        "ADVANCED" = "Advanced";
        "TIPS" = "Tips";
        "COLOR" = "Color";
        "COPY" = "Copy";
        "COPIED" = "Copide";

        "JSBOX_ICON" = "JSBox in app icon";
        "SF_SYMBOLS" = "SF Symbols";
        "IMAGE_BASE64" = "Image/base64";

        "ABOUT" = "About";
        "VERSION" = "Version";
        "AUTHOR" = "Author";
        "AT_BOTTOM" = "It's the end~";
        `)
    }

    setSavePath(savePath) {
        this.savePath = savePath
        return this
    }

    setStructure(structure) {
        this.structure = structure
        return this
    }

    /**
     * 设置结构文件目录。
     * 若调用了 setStructure(structure) 或构造函数传递了 structure 数据，则不会加载结构文件
     * @param {String} structurePath 
     * @returns 
     */
    setStructurePath(structurePath) {
        if (!this.structure) {
            this.setStructure(JSON.parse($file.read(structurePath)?.string))
        }
        return this
    }

    /**
     * 设置一个独一无二的名字，防止多个 Setting 导致 UI 冲突
     * @param {String} name 名字
     */
    setName(name) {
        this.name = name
        return this
    }

    setFooter(footer) {
        this.footer = footer
        return this
    }

    set(key, value) {
        this.setting[key] = value
        $file.write({
            data: $data({ string: JSON.stringify(this.setting) }),
            path: this.savePath
        })
        this.callEvent("onSet", key, value)
        return true
    }

    get(key, _default = null) {
        if (Object.prototype.hasOwnProperty.call(this.setting, key))
            return this.setting[key]
        else
            return _default
    }

    getColor(color) {
        return typeof color === "string"
            ? $color(color)
            : $rgba(color.red, color.green, color.blue, color.alpha)
    }

    _touchHighlightStart(id) {
        $(id).bgcolor = $color("insetGroupedBackground")
    }

    _touchHighlightEnd(id, duration = 0.3) {
        $ui.animate({
            duration: duration,
            animation: () => {
                $(id).bgcolor = $color("clear")
            }
        })
    }

    _withTouchEvents(lineId, events, withTapped = false, highlightEndDelay = 0) {
        events = Object.assign(events, {
            touchesBegan: () => {
                this._touchHighlightStart(lineId)
            },
            touchesMoved: () => {
                this._touchHighlightEnd(lineId, 0)
            }
        })
        if (withTapped) {
            const tapped = events.tapped
            events.tapped = () => {
                // highlight
                this._touchHighlightStart(lineId)
                setTimeout(() => this._touchHighlightEnd(lineId), highlightEndDelay * 1000)
                if (typeof tapped === "function") tapped()
            }
        }
        return events
    }

    createLineLabel(title, icon) {
        if (!icon[1]) icon[1] = "#00CC00"
        if (typeof icon[1] !== "object") {
            icon[1] = [icon[1], icon[1]]
        }
        if (typeof icon[0] !== "object") {
            icon[0] = [icon[0], icon[0]]
        }
        return {
            type: "view",
            views: [
                {// icon
                    type: "view",
                    props: {
                        bgcolor: $color(icon[1][0], icon[1][1]),
                        cornerRadius: 5,
                        smoothCorners: true
                    },
                    views: [
                        {
                            type: "image",
                            props: {
                                tintColor: $color("white"),
                                image: $image(icon[0][0], icon[0][1])
                            },
                            layout: (make, view) => {
                                make.center.equalTo(view.super)
                                make.size.equalTo(20)
                            }
                        },
                    ],
                    layout: (make, view) => {
                        make.centerY.equalTo(view.super)
                        make.size.equalTo(30)
                        make.left.inset(10)
                    }
                },
                {// title
                    type: "label",
                    props: {
                        text: title,
                        textColor: this.textColor,
                        align: $align.left
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.super)
                        make.height.equalTo(view.super)
                        make.left.equalTo(view.prev.right).offset(10)
                    }
                }
            ],
            layout: (make, view) => {
                make.centerY.equalTo(view.super)
                make.height.equalTo(view.super)
                make.left.inset(0)
            }
        }
    }

    createInfo(icon, title, value) {
        const isArray = Array.isArray(value)
        const text = isArray ? value[0] : value
        const moreInfo = isArray ? value[1] : value
        const lineId = `script-${this.name}-${uuid()}`
        return {
            type: "view",
            props: { id: lineId },
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "label",
                    props: {
                        text: text,
                        align: $align.right,
                        textColor: $color("darkGray")
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.prev)
                        make.right.inset(15)
                        make.width.equalTo(180)
                    }
                },
                {// 监听点击动作
                    type: "view",
                    events: this._withTouchEvents(lineId, {
                        tapped: () => {
                            $ui.alert({
                                title: title,
                                message: moreInfo,
                                actions: [
                                    {
                                        title: $l10n("COPY"),
                                        handler: () => {
                                            $clipboard.text = moreInfo
                                            $ui.toast($l10n("COPIED"))
                                        }
                                    },
                                    { title: $l10n("OK") }
                                ]
                            })
                        }
                    }, true),
                    layout: (make, view) => {
                        make.right.inset(0)
                        make.size.equalTo(view.super)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createSwitch(key, icon, title, events) {
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "switch",
                    props: {
                        on: this.get(key),
                        onColor: $color("#00CC00")
                    },
                    events: {
                        changed: sender => {
                            if (!this.set(key, sender.on)) {
                                sender.on = !sender.on
                            } else {
                                if (events) eval(`(()=>{return ${events}})()`)
                            }
                        }
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.prev)
                        make.right.inset(15)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createString(key, icon, title, events) {
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "button",
                    props: {
                        symbol: "square.and.pencil",
                        bgcolor: $color("clear"),
                        tintColor: $color("primaryText")
                    },
                    events: {
                        tapped: sender => {
                            const popover = $ui.popover({
                                sourceView: sender,
                                sourceRect: sender.bounds,
                                directions: $popoverDirection.down,
                                size: $size(320, 150),
                                views: [
                                    {
                                        type: "text",
                                        props: {
                                            id: `${this.name}-string-${key}`,
                                            align: $align.left,
                                            text: this.get(key)
                                        },
                                        layout: make => {
                                            make.left.right.inset(10)
                                            make.top.inset(20)
                                            make.height.equalTo(90)
                                        }
                                    },
                                    {
                                        type: "button",
                                        props: {
                                            symbol: "checkmark",
                                            bgcolor: $color("clear"),
                                            titleEdgeInsets: 10,
                                            contentEdgeInsets: 0
                                        },
                                        layout: make => {
                                            make.right.inset(10)
                                            make.bottom.inset(25)
                                            make.size.equalTo(30)
                                        },
                                        events: {
                                            tapped: () => {
                                                if (this.set(key, $(key).text)) {
                                                    popover.dismiss()
                                                    if (events) eval(`(()=>{return ${events}})()`)
                                                }
                                            }
                                        }
                                    }
                                ]
                            })
                        }
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.prev)
                        make.right.inset(0)
                        make.size.equalTo(50)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createNumber(key, icon, title, events) {
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "label",
                    props: {
                        id: `${this.name}-number-${key}`,
                        align: $align.right,
                        text: this.get(key)
                    },
                    events: {
                        tapped: () => {
                            $input.text({
                                type: $kbType.number,
                                text: this.get(key),
                                placeholder: title,
                                handler: (text) => {
                                    const isNumber = (str) => {
                                        const reg = /^[0-9]+.?[0-9]*$/
                                        return reg.test(str)
                                    }
                                    if (text === "" || !isNumber(text)) {
                                        $ui.toast($l10n("INVALID_VALUE"))
                                        return
                                    }
                                    if (this.set(key, text)) {
                                        $(key).text = text
                                        if (events) eval(`(()=>{return ${events}})()`)
                                    }
                                }
                            })
                        }
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.prev)
                        make.right.inset(15)
                        make.height.equalTo(50)
                        make.width.equalTo(100)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createStepper(key, icon, title, min, max, events) {
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "label",
                    props: {
                        id: `${this.name}-stepper-${key}`,
                        text: this.get(key),
                        textColor: this.textColor,
                        align: $align.left
                    },
                    layout: (make, view) => {
                        make.height.equalTo(view.super)
                        make.right.inset(120)
                    }
                },
                {
                    type: "stepper",
                    props: {
                        min: min,
                        max: max,
                        value: this.get(key)
                    },
                    events: {
                        changed: (sender) => {
                            $(key).text = sender.value
                            if (!this.set(key, sender.value)) {
                                $(key).text = this.get(key)
                            } else {
                                if (events) eval(`(()=>{return ${events}})()`)
                            }
                        }
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.prev)
                        make.right.inset(15)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createScript(key, icon, title, script) {
        const id = `script-${this.name}-${key}`
        const lineId = `${id}-line`
        const touchHighlight = () => {
            this._touchHighlightStart(lineId)
            this._touchHighlightEnd(lineId)
        }
        const actionStart = () => {
            // 隐藏button，显示spinner
            $(id).alpha = 0
            $(`${id}-spinner`).alpha = 1
            this._touchHighlightStart(lineId)
        }
        const actionCancel = () => {
            $(id).alpha = 1
            $(`${id}-spinner`).alpha = 0
            this._touchHighlightEnd(lineId)
        }
        const actionDone = (status = true, message = $l10n("ERROR")) => {
            $(`${id}-spinner`).alpha = 0
            this._touchHighlightEnd(lineId)
            const button = $(id)
            if (!status) { // 失败
                $ui.toast(message)
                button.alpha = 1
                return
            }
            // 成功动画
            button.symbol = "checkmark"
            $ui.animate({
                duration: 0.6,
                animation: () => {
                    button.alpha = 1
                },
                completion: () => {
                    setTimeout(() => {
                        $ui.animate({
                            duration: 0.4,
                            animation: () => {
                                button.alpha = 0
                            },
                            completion: () => {
                                button.symbol = "chevron.right"
                                $ui.animate({
                                    duration: 0.4,
                                    animation: () => {
                                        button.alpha = 1
                                    },
                                    completion: () => {
                                        button.alpha = 1
                                    }
                                })
                            }
                        })
                    }, 600)
                }
            })
        }
        return {
            type: "view",
            props: { id: lineId },
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [
                        {// 仅用于显示图片
                            type: "image",
                            props: {
                                id: id,
                                symbol: "chevron.right",
                                tintColor: $color("secondaryText")
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.right.inset(0)
                                make.size.equalTo(15)
                            }
                        },
                        {
                            type: "spinner",
                            props: {
                                id: `${id}-spinner`,
                                loading: true,
                                alpha: 0
                            },
                            layout: (make, view) => {
                                make.size.equalTo(view.prev)
                                make.left.top.equalTo(view.prev)
                            }
                        },
                        {// 覆盖在图片上监听点击动作
                            type: "view",
                            events: this._withTouchEvents(lineId, {
                                tapped: () => {
                                    // 生成开始事件和结束事件动画，供函数调用
                                    const animate = {
                                        actionStart: actionStart, // 会出现加载动画
                                        actionCancel: actionCancel, // 会直接恢复箭头图标
                                        actionDone: actionDone, // 会出现对号，然后恢复箭头
                                        touchHighlight: touchHighlight, // 被点击的一行颜色加深，然后颜色恢复
                                        touchHighlightStart: () => this._touchHighlightStart(lineId), // 被点击的一行颜色加深
                                        touchHighlightEnd: () => this._touchHighlightEnd(lineId) // 被点击的一行颜色恢复
                                    }
                                    // 执行代码
                                    if (script.startsWith("this")) {
                                        // 传递 animate 对象
                                        eval(`(()=>{return ${script}(animate)})()`)
                                    } else {
                                        eval(script)
                                    }
                                }
                            }),
                            layout: (make, view) => {
                                make.right.inset(0)
                                make.size.equalTo(view.super)
                            }
                        }
                    ],
                    layout: (make, view) => {
                        make.right.inset(15)
                        make.height.equalTo(50)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createTab(key, icon, title, items, events, withTitle) {
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "tab",
                    props: {
                        items: items,
                        index: this.get(key),
                        dynamicWidth: true
                    },
                    layout: (make, view) => {
                        make.right.inset(15)
                        make.centerY.equalTo(view.prev)
                    },
                    events: {
                        changed: (sender) => {
                            const value = withTitle ? [sender.index, title] : sender.index
                            this.set(key, value)
                            if (events) eval(`(()=>{return ${events}})()`)
                        }
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createColor(key, icon, title, events) {
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [
                        {// 颜色预览以及按钮功能
                            type: "view",
                            props: {
                                id: `setting-${this.name}-color-${key}`,
                                bgcolor: this.getColor(this.get(key)),
                                circular: true,
                                borderWidth: 1,
                                borderColor: $color("#e3e3e3")
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.right.inset(15)
                                make.size.equalTo(20)
                            }
                        },
                        { // 用来监听点击事件，增大可点击面积
                            type: "view",
                            events: {
                                tapped: async () => {
                                    const color = await $picker.color({ color: this.getColor(this.get(key)) })
                                    this.set(key, color.components)
                                    if (events) eval(`(()=>{return ${events}})()`)
                                    $(`setting-${this.name}-color-${key}`).bgcolor = $rgba(
                                        color.components.red,
                                        color.components.green,
                                        color.components.blue,
                                        color.components.alpha
                                    )
                                }
                            },
                            layout: (make, view) => {
                                make.right.inset(0)
                                make.height.width.equalTo(view.super.height)
                            }
                        }
                    ],
                    layout: (make, view) => {
                        make.height.equalTo(50)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createMenu(key, icon, title, items, events, withTitle) {
        const id = `setting-menu-${this.name}-${key}`
        const lineId = `${id}-line`
        return {
            type: "view",
            props: { id: lineId },
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [
                        {
                            type: "label",
                            props: {
                                text: withTitle ? items[(() => {
                                    const value = this.get(key)
                                    if (typeof value === "object") return value[0]
                                    else return value
                                })()] : items[this.get(key)],
                                color: $color("secondaryText"),
                                id: id
                            },
                            layout: (make, view) => {
                                make.right.inset(0)
                                make.height.equalTo(view.super)
                            }
                        }
                    ],
                    layout: (make, view) => {
                        make.right.inset(15)
                        make.height.equalTo(50)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            events: this._withTouchEvents(lineId, {
                tapped: () => {
                    this._touchHighlightStart(lineId)
                    $ui.menu({
                        items: items,
                        handler: (title, idx) => {
                            const value = withTitle ? [idx, title] : idx
                            this.set(key, value)
                            if (events) eval(`(()=>{return ${events}})()`)
                            $(id).text = $l10n(title)
                        },
                        finished: () => {
                            this._touchHighlightEnd(lineId, 0.2)
                        }
                    })
                }
            }),
            layout: $layout.fill
        }
    }

    createDate(key, icon, title, mode = 2, events) {
        const id = `setting-date-${this.name}-${key}`
        const getFormatDate = date => {
            let str = ""
            if (typeof date === "number") date = new Date(date)
            switch (mode) {
                case 0:
                    str = date.toLocaleTimeString()
                    break
                case 1:
                    str = date.toLocaleDateString()
                    break
                case 2:
                    str = date.toLocaleString()
                    break
            }
            return str
        }
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [{
                        type: "label",
                        props: {
                            id: `${id}-label`,
                            color: $color("secondaryText"),
                            text: this.get(key) ? getFormatDate(this.get(key)) : "None"
                        },
                        layout: (make, view) => {
                            make.right.inset(0)
                            make.height.equalTo(view.super)

                        }
                    }],
                    events: {
                        tapped: async () => {
                            const settingData = this.get(key)
                            const date = await $picker.date({
                                props: {
                                    mode: mode,
                                    date: settingData ? settingData : Date.now()
                                }
                            })
                            if (events) eval(`(()=>{return ${events}})()`)
                            this.set(key, date.getTime())
                            $(`${id}-label`).text = getFormatDate(date)
                        }
                    },
                    layout: (make, view) => {
                        make.right.inset(15)
                        make.height.equalTo(50)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createInput(key, icon, title, events) {
        const id = `setting-input-${this.name}-${key}`
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [{
                        type: "label",
                        props: {
                            id: `${id}-label`,
                            color: $color("secondaryText"),
                            text: this.get(key)
                        },
                        layout: (make, view) => {
                            make.right.inset(0)
                            make.height.equalTo(view.super)

                        }
                    }],
                    events: {
                        tapped: async () => {
                            $input.text({
                                text: this.get(key),
                                placeholder: title,
                                handler: (text) => {
                                    if (text === "") {
                                        $ui.toast($l10n("INVALID_VALUE"))
                                        return
                                    }
                                    if (this.set(key, text)) {
                                        $(`${id}-label`).text = text
                                        if (events) eval(`(()=>{return ${events}})()`)
                                    }
                                }
                            })
                        }
                    },
                    layout: (make, view) => {
                        make.right.inset(15)
                        make.height.equalTo(50)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createIcon(key, icon, title, events) {
        const id = `setting-icon-${this.name}-${key}`
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [
                        {
                            type: "image",
                            props: {
                                cornerRadius: 8,
                                bgcolor: $color("#000000"),
                                smoothCorners: true
                            },
                            layout: (make, view) => {
                                make.right.inset(15)
                                make.centerY.equalTo(view.super)
                                make.size.equalTo($size(30, 30))
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: id,
                                image: $image(this.get(key)),
                                icon: $icon(this.get(key).slice(5, this.get(key).indexOf(".")), $color("#ffffff")),
                                tintColor: $color("#ffffff")
                            },
                            layout: (make, view) => {
                                make.right.inset(20)
                                make.centerY.equalTo(view.super)
                                make.size.equalTo($size(20, 20))
                            }
                        }
                    ],
                    events: {
                        tapped: () => {
                            $ui.menu({
                                items: [$l10n("JSBOX_ICON"), $l10n("SF_SYMBOLS"), $l10n("IMAGE_BASE64")],
                                handler: async (title, idx) => {
                                    if (idx === 0) {
                                        const icon = await $ui.selectIcon()
                                        this.set(key, icon)
                                        $(id).icon = $icon(icon.slice(5, icon.indexOf(".")), $color("#ffffff"))
                                        if (events) eval(`(()=>{return ${events}})()`)
                                    } else if (idx === 1 || idx === 2) {
                                        $input.text({
                                            text: "",
                                            placeholder: title,
                                            handler: text => {
                                                if (text === "") {
                                                    $ui.toast($l10n("INVALID_VALUE"))
                                                    return
                                                }
                                                this.set(key, text)
                                                if (idx === 1) $(id).symbol = text
                                                else $(id).image = $image(text)
                                                if (events) eval(`(()=>{return ${events}})()`)
                                            }
                                        })
                                    }
                                }
                            })
                        }
                    },
                    layout: (make, view) => {
                        make.right.inset(0)
                        make.height.equalTo(50)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createChild(key, icon, title, children) {
        const id = `setting-child-${this.name}-${key}`
        const lineId = `${id}-line`
        return {
            type: "view",
            layout: $layout.fill,
            props: { id: lineId },
            views: [
                this.createLineLabel(title, icon),
                {// 仅用于显示图片
                    type: "image",
                    props: {
                        symbol: "chevron.right",
                        tintColor: $color("secondaryText")
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.super)
                        make.right.inset(15)
                        make.size.equalTo(15)
                    }
                }
            ],
            events: this._withTouchEvents(lineId, {
                tapped: () => {
                    setTimeout(() => {
                        const pageController = new PageController()
                        pageController
                            .setView(this.getListView(children))
                            .navigationItem
                            .setTitle(title)
                            .addPopButton()
                            .setLargeTitleDisplayMode(NavigationItem.LargeTitleDisplayModeNever)
                            .setLargeTitleHeightOffset(30)
                        this.viewController.push(pageController)
                    })
                }
            }, true, 0.3)
        }
    }

    _getSections(structure) {
        const sections = []
        for (let section of structure) {
            const rows = []
            for (let item of section.items) {
                const value = this.get(item.key)
                let row = null
                if (!item.icon) item.icon = ["square.grid.2x2.fill", "#00CC00"]
                if (typeof item.items === "object") item.items = item.items.map(item => $l10n(item))
                // 更新标题值
                item.title = $l10n(item.title)
                switch (item.type) {
                    case "switch":
                        row = this.createSwitch(item.key, item.icon, item.title, item.events)
                        break
                    case "stepper":
                        row = this.createStepper(item.key, item.icon, item.title, item.min === undefined ? 1 : item.min, item.max === undefined ? 12 : item.max, item.events)
                        break
                    case "string":
                        row = this.createString(item.key, item.icon, item.title, item.events)
                        break
                    case "number":
                        row = this.createNumber(item.key, item.icon, item.title, item.events)
                        break
                    case "info":
                        row = this.createInfo(item.icon, item.title, value)
                        break
                    case "script":
                        row = this.createScript(item.key, item.icon, item.title, value)
                        break
                    case "tab":
                        row = this.createTab(item.key, item.icon, item.title, item.items, item.events, item.withTitle)
                        break
                    case "color":
                        row = this.createColor(item.key, item.icon, item.title, item.events)
                        break
                    case "menu":
                        if (typeof item.items === "string") {
                            item.items = eval(`(()=>{return ${item.items}()})()`)
                        }
                        row = this.createMenu(item.key, item.icon, item.title, item.items, item.events, item.withTitle)
                        break
                    case "date":
                        row = this.createDate(item.key, item.icon, item.title, item.mode, item.events)
                        break
                    case "input":
                        row = this.createInput(item.key, item.icon, item.title, item.events)
                        break
                    case "icon":
                        row = this.createIcon(item.key, item.icon, item.title, item.events)
                        break
                    case "child":
                        row = this.createChild(item.key, item.icon, item.title, item.children)
                        break
                    default:
                        continue
                }
                rows.push(row)
            }
            sections.push({
                title: $l10n(section.title ?? ""),
                rows: rows
            })
        }
        return sections
    }

    getListView(structure) {
        this.footer = this.footer ?? (() => {
            const info = JSON.parse($file.read("/config.json")?.string)["info"]
            return {
                type: "view",
                props: { height: 130 },
                views: [
                    {
                        type: "label",
                        props: {
                            font: $font(14),
                            text: `${$l10n("VERSION")} ${info.version} © ${info.author}`,
                            textColor: $color({
                                light: "#C0C0C0",
                                dark: "#545454"
                            }),
                            align: $align.center
                        },
                        layout: make => {
                            make.left.right.inset(0)
                            make.top.inset(10)
                        }
                    }
                ]
            }
        })()
        return {
            type: "list",
            props: {
                style: 2,
                separatorInset: $insets(0, 50, 0, 10), // 分割线边距
                rowHeight: 50,
                indicatorInsets: $insets(50, 0, 50, 0),
                footer: this.footer,
                data: this._getSections(structure ?? this.structure)
            },
            layout: $layout.fill
        }
    }

    getPageView() {
        if (!this.viewController.hasRootPageController()) {
            const pageController = new PageController()
            pageController
                .setView(this.getListView(this.structure))
                .navigationItem
                .setTitle($l10n("SETTING"))
                .setLargeTitleHeightOffset(10)
            pageController
                .initPage()
                .page
                .setProp("bgcolor", $color("insetGroupedBackground"))
            this.viewController.setRootPageController(pageController)
        }
        return this.viewController.getRootPageController().getPage()
    }
}

/**
 * 检查版本号是否是过期版本
 * @param {String} latestVersion 最新版本号
 * @param {String} version 待检查版本号
 * @returns 过期则返回 true
 */
function isOutdated(latestVersion, version) {
    if (version.indexOf("dev") > -1) return true
    // TODO 检查版本号
    return latestVersion !== version
}

function init() {
    return
    const update = () => {
        // 清除旧文件
        $file.delete(ROOT_PATH)
        // 复制
        $file.copy({
            src: SHARED_PATH,
            dst: ROOT_PATH
        })
        setTimeout(() => {
            $ui.toast("The update is successful and will restart soon")
            setTimeout(() => $addin.restart(), 1500)
        }, 1500)
    }
    if ($file.exists(ROOT_PATH) && $file.exists(`${ROOT_PATH}/src/kernel.js`)) {
        // 不在 widget 中运行且 SHARED_PATH 目录存在则检查更新
        if ($file.exists(SHARED_PATH) && $app.env !== $env.widget) {
            const SHARED_VERSION = eval($file.read(`${SHARED_PATH}/src/kernel.js`).string).VERSION
            if (isOutdated(VERSION, SHARED_VERSION)) {
                update()
            }
        }
    } else {
        update()
    }
}

module.exports = {
    VERSION,
    SHARED_PATH,
    init,
    isOutdated,
    // class
    UIKit,
    ViewController,
    ContainerView,
    Sheet,
    NavigationBar,
    BarButtonItem,
    NavigationItem,
    NavigationController,
    PageView,
    PageController,
    TabBarCellView,
    TabBarController,
    Kernel,
    Setting
}