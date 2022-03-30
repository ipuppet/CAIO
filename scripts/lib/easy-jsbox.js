const VERSION = "1.2.1"

String.prototype.trim = function (char, type) {
    if (char) {
        if (type == 'l') {
            return this.replace(new RegExp('^\\' + char + '+', 'g'), '');
        } else if (type == 'r') {
            return this.replace(new RegExp('\\' + char + '+$', 'g'), '');
        }
        return this.replace(new RegExp('^\\' + char + '+|\\' + char + '+$', 'g'), '');
    }
    return this.replace(/^\s+|\s+$/g, '');
}

/**
 * 对比版本号
 * @param {String} preVersion 
 * @param {String} lastVersion 
 * @returns 1: preVersion 大, 0: 相等, -1: lastVersion 大
 */
function versionCompare(preVersion = '', lastVersion = '') {
    let sources = preVersion.split('.')
    let dests = lastVersion.split('.')
    let maxL = Math.max(sources.length, dests.length)
    let result = 0
    for (let i = 0; i < maxL; i++) {
        let preValue = sources.length > i ? sources[i] : 0
        let preNum = isNaN(Number(preValue)) ? preValue.charCodeAt() : Number(preValue)
        let lastValue = dests.length > i ? dests[i] : 0
        let lastNum = isNaN(Number(lastValue)) ? lastValue.charCodeAt() : Number(lastValue)
        if (preNum < lastNum) {
            result = -1
            break
        } else if (preNum > lastNum) {
            result = 1
            break
        }
    }
    return result
}

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

function objectEqual(a, b) {
    let aProps = Object.getOwnPropertyNames(a)
    let bProps = Object.getOwnPropertyNames(b)
    if (aProps.length !== bProps.length) {
        return false
    }
    for (let i = 0; i < aProps.length; i++) {
        let propName = aProps[i]

        let propA = a[propName]
        let propB = b[propName]
        if (typeof propA === 'object') {
            return objectEqual(propA, propB)
        } else if (propA !== propB) {
            return false
        }
    }
    return true
}

class ValidationError extends Error {
    constructor(parameter, type) {
        super(`The type of the parameter '${parameter}' must be '${type}'`)
        this.name = "ValidationError"
    }
}

class Controller {
    events = {}

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
    id = uuid()
    type
    props
    views
    events
    layout

    constructor({
        type = "view",
        props = {},
        views = [],
        events = {},
        layout = $layout.fill
    } = {}) {
        // 属性
        this.type = type
        this.props = props
        this.views = views
        this.events = events
        this.layout = layout

        if (this.props.id) {
            this.id = this.props.id
        } else {
            this.props.id = this.id
        }
    }

    static create(args) {
        return new this(args)
    }

    static createByViews(views) {
        return new this({ views })
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

    /**
     * 事件中间件
     * 
     * 调用处理函数 `action`，第一个参数为用户定义的事件处理函数
     * 其余参数为 JSBox 传递的参数，如 sender 等
     * 
     * @param {String} event 事件名称
     * @param {Function} action 处理事件的函数
     * @returns 
     */
    eventMiddleware(event, action) {
        const old = this.events[event]
        this.events[event] = (...args) => {
            if (typeof old === "function") {
                // 调用处理函数
                action(old, ...args)
            }
        }
        return this
    }

    assignEvent(event, action) {
        const old = this.events[event]
        this.events[event] = (...args) => {
            if (typeof old === "function") {
                old(...args)
            }
            action(...args)
        }
        return this
    }

    setLayout(layout) {
        this.layout = layout
        return this
    }

    getView() {
        return this
    }

    get definition() {
        return this.getView()
    }
}

class UIKit {
    static #sharedApplication = $objc("UIApplication").$sharedApplication()
    static align = { left: 0, right: 1, top: 2, bottom: 3 }
    static textColor = $color("primaryText", "secondaryText")
    static linkColor = $color("systemLink")
    static primaryViewBackgroundColor = $color("primarySurface")
    static scrollViewBackgroundColor = $color("insetGroupedBackground")
    static scrollViewList = ["list", "matrix"]

    /**
     * 是否属于大屏设备
     */
    static isLargeScreen = $device.isIpad || $device.isIpadPro

    /**
     * 获取Window大小
     * @returns 
     */
    static get windowSize() {
        return $objc("UIWindow").$keyWindow().jsValue().size
    }

    /**
     * 判断是否是分屏模式
     * @returns {Boolean}
     */
    static get isSplitScreenMode() {
        return UIKit.isLargeScreen && $device.info.screen.width !== UIKit.windowSize.width
    }

    static get statusBarHeight() {
        return $app.isDebugging ? 0 : UIKit.#sharedApplication.$statusBarFrame().height
    }

    static get statusBarOrientation() {
        return UIKit.#sharedApplication.$statusBarOrientation()
    }

    static get isHorizontal() {
        return UIKit.statusBarOrientation === 3 || UIKit.statusBarOrientation === 4
    }

    static defaultBackgroundColor(type) {
        return UIKit.scrollViewList.indexOf(type) > -1 ? UIKit.scrollViewBackgroundColor : UIKit.primaryViewBackgroundColor
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
                    ctx.strokeColor = props.bgcolor ?? $color("separatorColor")
                    ctx.setLineWidth(1)
                    ctx.moveToPoint(0, 0)
                    ctx.addLineToPoint(view.frame.width, 0)
                    ctx.strokePath()
                }
            }
        }
    }

    static blurBox(props = {}, views = [], layout = $layout.fill) {
        return {
            type: "blur",
            props: Object.assign({
                style: $blurStyle.thinMaterial
            }, props),
            views: views,
            layout: layout
        }
    }

    /**
     * 建议仅在使用 JSBox nav 时使用，便于统一风格
     */
    static push(args) {
        const views = args.views,
            statusBarStyle = args.statusBarStyle ?? 0,
            title = args.title ?? "",
            navButtons = args.navButtons ?? [{ title: "" }],
            bgcolor = args.bgcolor ?? (views[0]?.props?.bgcolor ?? "primarySurface"),
            disappeared = args.disappeared
        $ui.push({
            props: {
                statusBarStyle: statusBarStyle,
                navButtons: navButtons,
                title: title,
                bgcolor: typeof bgcolor === "string" ? $color(bgcolor) : bgcolor,
            },
            events: {
                disappeared: () => {
                    if (disappeared !== undefined) disappeared()
                }
            },
            views: [
                {
                    type: "view",
                    views: views,
                    layout: (make, view) => {
                        make.top.equalTo(view.super.safeArea)
                        make.bottom.equalTo(view.super)
                        make.left.right.equalTo(view.super.safeArea)
                    }
                }
            ]
        })
    }
}

class ViewController extends Controller {
    #pageControllers = []

    /**
     * @param {PageController} pageController 
     */
    #onPop(pageController) {
        this.callEvent("onPop", pageController) // 被弹出的对象
        this.#pageControllers.pop()
    }

    /**
     * push 新页面
     * @param {PageController} pageController 
     */
    push(pageController) {
        const parent = this.#pageControllers[this.#pageControllers.length - 1]
        pageController.navigationItem.addPopButton(parent?.navigationItem.title)
        this.#pageControllers.push(pageController)
        $ui.push({
            props: {
                statusBarStyle: 0,
                navBarHidden: true
            },
            events: {
                dealloc: () => {
                    this.#onPop(pageController)
                }
            },
            views: [pageController.getPage().definition],
            layout: $layout.fill
        })
    }

    /**
     * 
     * @param {PageController} pageController 
     * @returns 
     */
    setRootPageController(pageController) {
        this.#pageControllers = []
        this.#pageControllers.push(pageController)
        return this
    }

    hasRootPageController() {
        return this.#pageControllers[0] instanceof PageController
    }

    getRootPageController() {
        return this.#pageControllers[0]
    }
}

class Matrix extends View {
    titleStyle = {
        font: $font("bold", 21),
        height: 30
    }
    #hiddenViews
    #templateHiddenStatus

    templateIdByIndex(i) {
        if (this.props.template.views[i]?.props?.id === undefined) {
            if (this.props.template.views[i].props === undefined) {
                this.props.template.views[i].props = {}
            }
            this.props.template.views[i].props.id = uuid()
        }

        return this.props.template.views[i].props.id
    }

    get templateHiddenStatus() {
        if (!this.#templateHiddenStatus) {
            this.#templateHiddenStatus = {}
            for (let i = 0; i < this.props.template.views.length; i++) {
                // 未定义 id 以及 hidden 的模板默认 hidden 设置为 false
                if (
                    this.props.template.views[i].props.id === undefined
                    && this.props.template.views[i].props.hidden === undefined
                ) {
                    this.#templateHiddenStatus[this.templateIdByIndex(i)] = false
                }
                // 模板中声明 hidden 的值，在数据中将会成为默认值
                if (this.props.template.views[i].props.hidden !== undefined) {
                    this.#templateHiddenStatus[this.templateIdByIndex(i)] = this.props.template.views[i].props.hidden
                }
            }
        }

        return this.#templateHiddenStatus
    }

    get hiddenViews() {
        if (!this.#hiddenViews) {
            this.#hiddenViews = {}
            // hide other views
            for (let i = 0; i < this.props.template.views.length; i++) {
                this.#hiddenViews[this.templateIdByIndex(i)] = {
                    hidden: true
                }
            }
        }

        return this.#hiddenViews
    }

    #titleToData(title) {
        let hiddenViews = { ...this.hiddenViews }

        // templateProps & title
        Object.assign(hiddenViews, {
            __templateProps: {
                hidden: true
            },
            __title: {
                hidden: false,
                text: title,
                info: { title: true }
            }
        })

        return hiddenViews
    }

    rebuildData(data = []) {
        // rebuild data
        return data.map(section => {
            section.items = section.items.map(item => {
                // 所有元素都重置 hidden 属性
                Object.keys(item).forEach(key => {
                    item[key].hidden = this.templateHiddenStatus[key] ?? false
                })

                // 修正数据
                Object.keys(this.templateHiddenStatus).forEach(key => {
                    if (!item[key]) {
                        item[key] = {}
                    }
                    item[key].hidden = this.templateHiddenStatus[key]
                })

                item.__templateProps = {
                    hidden: false
                }
                item.__title = {
                    hidden: true
                }

                return item
            })

            if (section.title) {
                section.items.unshift(this.#titleToData(section.title))
            }

            return section
        })
    }

    rebuildTemplate() {
        let templateProps = {}
        if (this.props.template.props !== undefined) {
            templateProps = Object.assign(
                this.props.template.props,
                {
                    id: "__templateProps",
                    hidden: false
                }
            )
        }
        this.props.template.props = {}

        // rebuild template
        const templateViews = [
            { // templateProps
                type: "view",
                props: templateProps,
                layout: $layout.fill
            },
            { // title
                type: "label",
                props: {
                    id: "__title",
                    hidden: true,
                    font: this.titleStyle.font
                },
                layout: (make, view) => {
                    make.top.inset(-(this.titleStyle.height / 4) * 3)
                    make.height.equalTo(this.titleStyle.height)
                    make.width.equalTo(view.super.safeArea)
                }
            }
        ].concat(this.props.template.views)
        this.props.template.views = templateViews
    }

    insert(data, withTitleOffset = true) {
        data.indexPath = this.indexPath(data.indexPath, withTitleOffset)
        return $(this.id).insert(data)
    }

    delete(indexPath, withTitleOffset = true) {
        indexPath = this.indexPath(indexPath, withTitleOffset)
        return $(this.id).delete(indexPath)
    }

    object(indexPath, withTitleOffset = true) {
        indexPath = this.indexPath(indexPath, withTitleOffset)
        return $(this.id).object(indexPath)
    }

    cell(indexPath, withTitleOffset = true) {
        indexPath = this.indexPath(indexPath, withTitleOffset)
        return $(this.id).cell(indexPath)
    }

    /**
     * 获得修正后的 indexPath
     * @param {$indexPath||Number} indexPath 
     * @param {Boolean} withTitleOffset 输入的 indexPath 是否已经包含了标题列。通常自身事件返回的 indexPath 视为已包含，使用默认值即可。
     * @returns 
     */
    indexPath(indexPath, withTitleOffset) {
        let offset = withTitleOffset ? 0 : 1
        if (typeof indexPath === "number") {
            indexPath = $indexPath(0, indexPath)
        }
        indexPath = $indexPath(indexPath.section, indexPath.row + offset)
        return indexPath
    }

    update(data) {
        this.props.data = this.rebuildData(data)
        $(this.id).data = this.props.data
    }

    getView() {
        // rebuild data, must first
        this.props.data = this.rebuildData(this.props.data)

        // rebuild template
        this.rebuildTemplate()

        // itemSize event
        this.setEvent("itemSize", (sender, indexPath) => {
            const info = sender.object(indexPath)?.__title?.info
            if (info?.title) {
                return $size(Math.max(UIKit.windowSize.width, UIKit.windowSize.height), 0)
            }
            const columns = this.props.columns ?? 2
            const spacing = this.props.spacing ?? 15
            const width = this.props.itemWidth
                ?? this.props.itemSize?.width
                ?? (UIKit.windowSize.width - spacing * (columns + 1)) / columns
            const height = this.props.itemHeight
                ?? this.props.itemSize?.height
                ?? 100
            return $size(width, height)
        })

        return this
    }
}

class SheetAddNavBarError extends Error {
    constructor() {
        super("Please call setView(view) first.")
        this.name = "SheetAddNavBarError"
    }
}

class SheetViewTypeError extends ValidationError {
    constructor(parameter, type) {
        super(parameter, type)
        this.name = "SheetViewTypeError"
    }
}

class Sheet extends View {
    #present = () => { }
    #dismiss = () => { }
    pageController

    init() {
        const UIModalPresentationStyle = { pageSheet: 1 } // TODO: sheet style
        const { width, height } = $device.info.screen
        const UIView = $objc("UIView").invoke("initWithFrame", $rect(0, 0, width, height))
        const PSViewController = $objc("UIViewController").invoke("alloc.init")
        const PSViewControllerView = PSViewController.$view()
        PSViewControllerView.$setBackgroundColor($color("primarySurface"))
        PSViewControllerView.$addSubview(UIView)
        PSViewController.$setModalPresentationStyle(UIModalPresentationStyle.pageSheet)
        this.#present = () => {
            PSViewControllerView.jsValue().add(this.pageController?.getPage().definition ?? this.view)
            $ui.vc.ocValue().invoke("presentModalViewController:animated", PSViewController, true)
        }
        this.#dismiss = () => PSViewController.invoke("dismissModalViewControllerAnimated", true)
        return this
    }

    /**
     * 设置 view
     * @param {Object} view 视图对象
     * @returns this
     */
    setView(view = {}) {
        if (typeof view !== "object") throw new SheetViewTypeError("view", "object")
        this.view = view
        return this
    }

    /**
     * 为 view 添加一个 navBar
     * @param {Object} param
     *  {
     *      {String} title
     *      {Object} popButton 参数与 BarButtonItem 一致
     *      {Array} rightButtons
     *  } 
     * @returns 
     */
    addNavBar({ title, popButton = { title: "Done" }, rightButtons = [] }) {
        if (this.view === undefined) throw new SheetAddNavBarError()
        this.pageController = new PageController()
        // 返回按钮
        const barButtonItem = new BarButtonItem()
        barButtonItem
            .setEvents(Object.assign({
                tapped: () => {
                    this.dismiss()
                    if (typeof popButton.tapped === "function") popButton.tapped()
                }
            }, popButton.events))
            .setAlign(UIKit.align.left)
            .setSymbol(popButton.symbol)
            .setTitle(popButton.title)
            .setMenu(popButton.menu)
        const button = barButtonItem.definition.views[0]
        button.layout = (make, view) => {
            make.left.equalTo(view.super.safeArea).offset(15)
            make.centerY.equalTo(view.super.safeArea)
        }
        this.pageController.navigationItem
            .addPopButton("", button)
            .setTitle(title)
            .setLargeTitleDisplayMode(NavigationItem.largeTitleDisplayModeNever)
            .setRightButtons(rightButtons)
        this.pageController
            .setView(this.view)
            .navigationController.navigationBar
            .pageSheetMode()
        this.pageController?.getPage().setProp("bgcolor", this.view.props.bgcolor)
        return this
    }

    /**
     * 弹出 Sheet
     */
    present() {
        this.#present()
    }

    /**
     * 关闭 Sheet
     */
    dismiss() {
        this.#dismiss()
    }
}

class NavigationBar extends View {
    static pageSheetNavigationBarHeight = 56

    prefersLargeTitles = true
    largeTitleFontSize = 34
    navigationBarTitleFontSize = 17
    addStatusBarHeight = true
    contentViewHeightOffset = 10
    navigationBarNormalHeight = $objc("UINavigationController").invoke("alloc.init").$navigationBar().jsValue().frame.height
    navigationBarLargeTitleHeight = $objc("UITabBarController").invoke("alloc.init").$tabBar().jsValue().frame.height + this.navigationBarNormalHeight

    pageSheetMode() {
        this.navigationBarLargeTitleHeight -= this.navigationBarNormalHeight
        this.navigationBarNormalHeight = NavigationBar.pageSheetNavigationBarHeight
        this.navigationBarLargeTitleHeight += this.navigationBarNormalHeight
        this.addStatusBarHeight = false
        return this
    }

    withStatusBarHeight() {
        this.addStatusBarHeight = true
        return this
    }

    withoutStatusBarHeight() {
        this.addStatusBarHeight = false
        return this
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

    setContentViewHeightOffset(offset) {
        this.contentViewHeightOffset = offset
        return this
    }

    /**
     * 页面大标题
     */
    getLargeTitleView() {
        return this.prefersLargeTitles
            && this.navigationItem.largeTitleDisplayMode !== NavigationItem.largeTitleDisplayModeNever
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
                    make.top.equalTo(view.super.safeAreaTop).offset(this.navigationBarNormalHeight)
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
                    make.bottom.equalTo(view.super.safeAreaTop).offset(this.navigationBarNormalHeight)
                    if (align === UIKit.align.left) make.left.equalTo(view.super.safeArea).offset(5)
                    else make.right.equalTo(view.super.safeArea).offset(-5)
                    make.width.equalTo(buttons.length * BarButtonItem.size.width)
                }
            } : {}
        }
        const rightButtonView = getButtonView(this.navigationItem.rightButtons, UIKit.align.right)
        const leftButtonView = this.navigationItem.popButtonView ?? getButtonView(this.navigationItem.leftButtons, UIKit.align.left)
        const isHideBackground = this.prefersLargeTitles
        const isHideTitle = !this.prefersLargeTitles || this.navigationItem.largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeNever
        return { // 顶部 bar
            type: "view",
            props: {
                id: this.id + "-navigation",
                bgcolor: $color("clear")
            },
            layout: (make, view) => {
                make.left.top.right.inset(0)
                make.bottom.equalTo(view.super.safeAreaTop).offset(this.navigationBarNormalHeight)
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
                {
                    type: "view",
                    props: {
                        hidden: true,
                        bgcolor: $color("clear"),
                        id: this.id + "-large-title-mask"
                    },
                    layout: $layout.fill
                },
                { // 标题
                    type: "label",
                    props: {
                        id: this.id + "-small-title",
                        alpha: isHideTitle ? 1 : 0,  // 不显示大标题则显示小标题
                        text: this.navigationItem.title,
                        font: $font("bold", this.navigationBarTitleFontSize),
                        align: $align.center,
                        bgcolor: $color("clear"),
                        textColor: UIKit.textColor
                    },
                    layout: (make, view) => {
                        make.left.right.inset(0)
                        make.height.equalTo(20)
                        make.centerY.equalTo(view.super.safeArea)
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
    static size = $size(44, 44)
    static iconSize = $size(23, 23)

    title = ""
    align = UIKit.align.right

    setTitle(title = "") {
        this.title = title
        return this
    }

    setSymbol(symbol) {
        this.symbol = symbol
        return this
    }

    setMenu(menu) {
        this.menu = menu
        return this
    }

    setAlign(align) {
        this.align = align
        return this
    }

    #actionStart() {
        // 隐藏button，显示spinner
        $(this.id).hidden = true
        $("spinner-" + this.id).hidden = false
    }

    #actionDone() {
        const buttonIcon = $(`icon-button-${this.id}`)
        const checkmarkIcon = $(`icon-checkmark-${this.id}`)
        buttonIcon.alpha = 0
        $(this.id).hidden = false
        $("spinner-" + this.id).hidden = true
        // 成功动画
        $ui.animate({
            duration: 0.6,
            animation: () => {
                checkmarkIcon.alpha = 1
            },
            completion: () => {
                $delay(0.3, () => $ui.animate({
                    duration: 0.6,
                    animation: () => {
                        checkmarkIcon.alpha = 0
                    },
                    completion: () => {
                        $ui.animate({
                            duration: 0.4,
                            animation: () => {
                                buttonIcon.alpha = 1
                            },
                            completion: () => {
                                buttonIcon.alpha = 1
                            }
                        })
                    }
                }))
            }
        })
    }

    #actionCancel() {
        $(this.id).hidden = false
        $("spinner-" + this.id).hidden = true
    }

    getView() {
        const userTapped = this.events.tapped
        this.events.tapped = sender => {
            if (!userTapped) return
            userTapped({
                start: () => this.#actionStart(),
                done: () => this.#actionDone(),
                cancel: () => this.#actionCancel()
            }, sender)
        }
        return {
            type: "view",
            views: [
                {
                    type: "button",
                    props: Object.assign(
                        {
                            id: this.id,
                            bgcolor: $color("clear"),
                            tintColor: UIKit.textColor,
                            titleColor: UIKit.textColor,
                            contentEdgeInsets: $insets(0, 0, 0, 0),
                            titleEdgeInsets: $insets(0, 0, 0, 0),
                            imageEdgeInsets: $insets(0, 0, 0, 0)
                        },
                        this.menu ? { menu: this.menu } : {},
                        this.title?.length > 0 ? { title: this.title } : {}
                    ),
                    views: [
                        {
                            type: "image",
                            props: Object.assign(
                                {
                                    id: `icon-button-${this.id}`,
                                    hidden: this.symbol === undefined,
                                    tintColor: UIKit.textColor,
                                },
                                this.symbol === undefined
                                    ? {}
                                    : typeof this.symbol === "string"
                                        ? { symbol: this.symbol }
                                        : { data: this.symbol.png }
                            ),
                            layout: (make, view) => {
                                make.center.equalTo(view.super)
                                make.size.equalTo(BarButtonItem.iconSize)
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: `icon-checkmark-${this.id}`,
                                alpha: 0,
                                tintColor: UIKit.textColor,
                                symbol: "checkmark"
                            },
                            layout: (make, view) => {
                                make.center.equalTo(view.super)
                                make.size.equalTo(BarButtonItem.iconSize)
                            }
                        }
                    ],
                    events: this.events,
                    layout: $layout.fill
                },
                {
                    type: "spinner",
                    props: {
                        id: "spinner-" + this.id,
                        loading: true,
                        hidden: true
                    },
                    layout: $layout.fill
                }
            ],
            layout: (make, view) => {
                make.size.equalTo(BarButtonItem.size)
                make.centerY.equalTo(view.super)
                if (view.prev && view.prev.id !== "label" && view.prev.id !== undefined) {
                    if (this.align === UIKit.align.right) make.right.equalTo(view.prev.left)
                    else make.left.equalTo(view.prev.right)
                } else {
                    if (this.align === UIKit.align.right) make.right.inset(0)
                    else make.left.inset(0)
                }
            }
        }
    }
}

class BarTitleView extends View {
    height = 20
    controller = {}

    setController(controller) {
        this.controller = controller
        return this
    }
}

class SearchBar extends BarTitleView {
    height = 35
    kbType = $kbType.search
    placeholder = $l10n("SEARCH")

    constructor(args) {
        super(args)

        this.setController(new SearchBarController())
        this.controller.setSearchBar(this)
    }

    setPlaceholder(placeholder) {
        this.placeholder = placeholder
        return this
    }

    setKbType(kbType) {
        this.kbType = kbType
        return this
    }

    getView() {
        return {
            type: "input",
            props: {
                id: this.id,
                type: this.kbType,
                placeholder: this.placeholder
            },
            layout: (make, view) => {
                //make.top.equalTo(view.prev.bottom).offset(15)
                make.top.equalTo(view.prev.bottom).offset(15)
                make.left.equalTo(view.super.safeArea).offset(15)
                make.right.equalTo(view.super.safeArea).offset(-15)
                make.height.equalTo(this.height)
            },
            events: {
                changed: sender => this.controller.callEvent("onChange", sender.text)
            }
        }
    }
}

class SearchBarController extends Controller {
    setSearchBar(searchBar) {
        this.searchBar = searchBar
        return this
    }

    updateSelector() {
        this.selector = {
            input: $(this.searchBar.id)
        }
    }

    hide() {
        this.updateSelector()
        this.selector.input.updateLayout(make => {
            make.height.equalTo(0)
        })
    }

    show() {
        this.updateSelector()
        this.selector.input.updateLayout(make => {
            make.height.equalTo(this.searchBar.height)
        })
    }

    didScroll(contentOffset) {
        this.updateSelector()
        // 调整大小
        let height = this.searchBar.height - contentOffset
        height = height > 0 ? (height > this.searchBar.height ? this.searchBar.height : height) : 0
        this.selector.input.updateLayout(make => {
            make.height.equalTo(height)
        })
        // 隐藏内容
        if (contentOffset > 0) {
            this.selector.input.placeholder = ""
        } else {
            this.selector.input.placeholder = this.searchBar.placeholder
        }
    }

    didEndDragging(contentOffset, decelerate, scrollToOffset, zeroOffset) {
        this.updateSelector()
        if (
            contentOffset >= 0
            && contentOffset <= this.searchBar.height
        ) {
            scrollToOffset($point(
                0,
                contentOffset >= this.searchBar.height / 2
                    ? this.searchBar.height - zeroOffset
                    : -zeroOffset
            ))
        }
    }
}

class NavigationItem {
    static largeTitleDisplayModeAutomatic = 0
    static largeTitleDisplayModeAlways = 1
    static largeTitleDisplayModeNever = 2

    rightButtons = []
    leftButtons = []
    hasbutton = false
    largeTitleDisplayMode = NavigationItem.largeTitleDisplayModeAutomatic
    largeTitleHeightOffset = 20

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

    setBackgroundColor(backgroundColor) {
        this.backgroundColor = backgroundColor
        return this
    }

    setRightButtons(buttons) {
        buttons.forEach(button => this.addRightButton(button))
        if (!this.hasbutton) this.hasbutton = true
        return this
    }

    setLeftButtons(buttons) {
        buttons.forEach(button => this.addLeftButton(button))
        if (!this.hasbutton) this.hasbutton = true
        return this
    }

    addRightButton({ symbol, title, tapped, menu, events }) {
        const barButtonItem = new BarButtonItem()
        barButtonItem
            .setEvents(Object.assign({
                tapped: tapped
            }, events))
            .setAlign(UIKit.align.right)
            .setSymbol(symbol)
            .setTitle(title)
            .setMenu(menu)
        this.rightButtons.push(barButtonItem.definition)
        if (!this.hasbutton) this.hasbutton = true
        return this
    }

    addLeftButton({ symbol, title, tapped, menu, events }) {
        const barButtonItem = new BarButtonItem()
        barButtonItem
            .setEvents(Object.assign({
                tapped: tapped
            }, events))
            .setAlign(UIKit.align.left)
            .setSymbol(symbol)
            .setTitle(title)
            .setMenu(menu)
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
                make.left.equalTo(view.super.safeArea).offset(15)
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
    static largeTitleViewSmallMode = 0
    static largeTitleViewLargeMode = 1

    navigationBar = new NavigationBar()
    largeTitleScrollTrigger = this.navigationBar.largeTitleFontSize - 3

    updateSelector() {
        this.selector = {
            navigation: $(this.navigationBar.id + "-navigation"),
            largeTitleView: $(this.navigationBar.id + "-large-title"),
            smallTitleView: $(this.navigationBar.id + "-small-title"),
            underlineView: $(this.navigationBar.id + "-underline"),
            largeTitleMaskView: $(this.navigationBar.id + "-large-title-mask"),
            backgroundView: $(this.navigationBar.id + "-background")
        }
    }

    toNormal(permanent = true) {
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
        if (permanent && this.navigationBar?.navigationItem) {
            this.navigationBar.navigationItem.largeTitleDisplayMode = NavigationItem.largeTitleDisplayModeNever
        }
    }

    toLargeTitle(permanent = true) {
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
        if (permanent && this.navigationBar?.navigationItem) {
            this.navigationBar.navigationItem.largeTitleDisplayMode = NavigationItem.largeTitleDisplayModeAlways
        }
    }

    #changeLargeTitleView(largeTitleViewMode) {
        const isSmallMode = largeTitleViewMode === NavigationController.largeTitleViewSmallMode
        $ui.animate({
            duration: 0.2,
            animation: () => {
                // 隐藏大标题，显示小标题
                this.selector.smallTitleView.alpha = isSmallMode ? 1 : 0
                this.selector.largeTitleView.alpha = isSmallMode ? 0 : 1
            }
        })
    }

    #largeTitleScrollAction(contentOffset) {
        const titleSizeMax = 40 // 下拉放大字体最大值
        // 标题跟随
        this.selector.largeTitleView.updateLayout((make, view) => {
            make.top.equalTo(view.super.safeAreaTop).offset(this.navigationBar.navigationBarNormalHeight - contentOffset)
        })

        if (contentOffset > 0) {
            if (contentOffset > this.largeTitleScrollTrigger) {
                this.#changeLargeTitleView(NavigationController.largeTitleViewSmallMode)
            } else {
                this.#changeLargeTitleView(NavigationController.largeTitleViewLargeMode)
            }
        } else if (contentOffset < -20) {
            // 切换模式
            this.#changeLargeTitleView(NavigationController.largeTitleViewLargeMode)
            // 下拉放大字体
            let size = this.navigationBar.largeTitleFontSize - contentOffset * 0.04
            if (size > titleSizeMax) size = titleSizeMax
            this.selector.largeTitleView.font = $font("bold", size)
        }
    }

    #navigationBarScrollAction(contentOffset) {
        if (contentOffset > 0) {
            let trigger = this.navigationBar.navigationItem.largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeNever
                ? 5
                : this.largeTitleScrollTrigger
            if (contentOffset > trigger) {
                // 隐藏遮罩
                this.selector.largeTitleMaskView.hidden = true
                $ui.animate({
                    duration: 0.2,
                    animation: () => {
                        // 显示下划线和背景
                        this.selector.underlineView.alpha = 1
                        this.selector.backgroundView.hidden = false
                    }
                })
            } else {
                const contentViewBackgroundColor = this.selector.largeTitleView?.prev.bgcolor
                this.selector.largeTitleMaskView.bgcolor = contentViewBackgroundColor
                this.selector.largeTitleMaskView.hidden = false
                // 隐藏背景
                this.selector.underlineView.alpha = 0
                this.selector.backgroundView.hidden = true
            }
        } else {
            // 隐藏背景 滑动过快时， contentOffset > 0 内的隐藏背景可能失效
            this.selector.underlineView.alpha = 0
            this.selector.backgroundView.hidden = true
        }
    }

    didScroll(contentOffset) {
        if (!this.navigationBar.prefersLargeTitles) return
        const largeTitleDisplayMode = this.navigationBar?.navigationItem.largeTitleDisplayMode
        if (largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeAlways) return
        this.updateSelector()
        if (largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeAutomatic) {
            // titleView didScroll
            this.navigationBar?.navigationItem?.titleView?.controller.didScroll(contentOffset)
            // 在 titleView 折叠前锁住主要视图
            if (contentOffset > 0) {
                const height = this.navigationBar?.navigationItem?.titleView?.height ?? 0
                contentOffset -= height
                if (contentOffset < 0) contentOffset = 0
            }
            this.#largeTitleScrollAction(contentOffset)
            this.#navigationBarScrollAction(contentOffset)
        } else if (largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeNever) {
            this.#navigationBarScrollAction(contentOffset)
        }
    }

    didEndDragging(contentOffset, decelerate, scrollToOffset) {
        if (!this.navigationBar.prefersLargeTitles) return
        const largeTitleDisplayMode = this.navigationBar?.navigationItem.largeTitleDisplayMode
        if (largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeAlways) return
        this.updateSelector()
        if (largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeAutomatic) {
            // titleView didEndDragging
            const zeroOffset = (!UIKit.isHorizontal || UIKit.isLargeScreen) && this.navigationBar.addStatusBarHeight
                ? UIKit.statusBarHeight
                : 0
            this.navigationBar?.navigationItem?.titleView?.controller.didEndDragging(contentOffset, decelerate, scrollToOffset, zeroOffset)
            const titleViewHeight = this.navigationBar?.navigationItem?.titleView?.height ?? 0
            contentOffset -= titleViewHeight
            if (
                contentOffset >= 0
                && contentOffset <= this.navigationBar.largeTitleFontSize
            ) {
                scrollToOffset($point(
                    0,
                    contentOffset >= this.navigationBar.largeTitleFontSize / 2
                        ? this.navigationBar.navigationBarNormalHeight + titleViewHeight - zeroOffset
                        : titleViewHeight - zeroOffset
                ))
            }
        }
    }
}

class PageView extends View {
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

    #layout(make, view) {
        make.top.bottom.equalTo(view.super)
        if (this.horizontalSafeArea) {
            make.left.right.equalTo(view.super.safeArea)
        } else {
            make.left.right.equalTo(view.super)
        }
    }

    getView() {
        this.layout = this.#layout
        this.props.clipsToBounds = true
        this.props.hidden = !this.activeStatus
        return super.getView()
    }
}

class PageControllerViewTypeError extends ValidationError {
    constructor(parameter, type) {
        super(parameter, type)
        this.name = "PageControllerViewTypeError"
    }
}

/**
 * events:
 * - onChange(from, to)
 */
class PageController extends Controller {
    page
    navigationItem = new NavigationItem()
    navigationController = new NavigationController()

    constructor() {
        super()

        this.navigationController.navigationBar.setNavigationItem(this.navigationItem)
    }

    /**
     * 
     * @param {Object} view 
     * @returns 
     */
    setView(view) {
        if (typeof view !== "object") {
            throw new PageControllerViewTypeError("view", "object")
        }
        this.view = View.create(view)
        return this
    }

    bindScrollEvents() {
        if (!(this.view instanceof View)) {
            throw new PageControllerViewTypeError("view", "View")
        }

        // 计算偏移高度
        let height = this.navigationController.navigationBar.contentViewHeightOffset
        if (this.navigationItem.titleView) {
            height += this.navigationItem.titleView.height
        }
        if (this.navigationItem.largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeNever) {
            height += this.navigationController.navigationBar.navigationBarNormalHeight
        } else {
            height += this.navigationController.navigationBar.navigationBarLargeTitleHeight
        }

        // 修饰视图顶部偏移
        if (!this.view.props.header) this.view.props.header = {}
        this.view.props.header.props = Object.assign(this.view.props.header.props ?? {}, {
            height: height
        })

        // 重写布局
        if (UIKit.scrollViewList.indexOf(this.view.type) === -1) {
            // 非滚动视图
            this.view.layout = (make, view) => {
                make.left.right.equalTo(view.super.safeArea)
                make.bottom.equalTo(view.super)
                let topOffset = this.navigationController.navigationBar.contentViewHeightOffset
                if (this.navigationItem.largeTitleDisplayMode !== NavigationItem.largeTitleDisplayModeNever) {
                    topOffset += this.navigationController.navigationBar.largeTitleFontSize
                }
                if ((!UIKit.isHorizontal || UIKit.isLargeScreen) && this.navigationController.navigationBar.addStatusBarHeight) {
                    topOffset += UIKit.statusBarHeight
                }
                make.top.equalTo(this.navigationController.navigationBar.navigationBarNormalHeight + topOffset)
            }
        } else {
            // indicatorInsets
            if (this.view.props.indicatorInsets) {
                const old = this.view.props.indicatorInsets
                this.view.props.indicatorInsets = $insets(
                    old.top + this.navigationController.navigationBar.navigationBarNormalHeight,
                    old.left,
                    old.bottom,
                    old.right
                )
            } else {
                this.view.props.indicatorInsets = $insets(this.navigationController.navigationBar.navigationBarNormalHeight, 0, 0, 0)
            }

            // layout
            this.view.layout = (make, view) => {
                make.left.right.equalTo(view.super.safeArea)
                make.top.bottom.equalTo(view.super)
            }

            // 重写滚动事件
            this.view
                .assignEvent("didScroll", sender => {
                    let contentOffset = sender.contentOffset.y
                    if ((!UIKit.isHorizontal || UIKit.isLargeScreen) && this.navigationController.navigationBar.addStatusBarHeight) {
                        contentOffset += UIKit.statusBarHeight
                    }
                    this.navigationController.didScroll(contentOffset)
                })
                .assignEvent("didEndDragging", (sender, decelerate) => {
                    let contentOffset = sender.contentOffset.y
                    if ((!UIKit.isHorizontal || UIKit.isLargeScreen) && this.navigationController.navigationBar.addStatusBarHeight) {
                        contentOffset += UIKit.statusBarHeight
                    }
                    this.navigationController.didEndDragging(contentOffset, decelerate, (...args) => sender.scrollToOffset(...args))
                })
                .assignEvent("didEndDecelerating", (...args) => this.view.events?.didEndDragging(...args))
        }
    }

    initPage() {
        if (this.navigationController.navigationBar.prefersLargeTitles) {
            this.bindScrollEvents()

            // 初始化 PageView
            this.page = PageView.createByViews([
                this.view,
                this.navigationController.navigationBar.getLargeTitleView(),
                // titleView
                this.navigationItem.titleView?.definition ?? {},
                this.navigationController.navigationBar.getNavigationBarView()
            ])
        } else {
            this.page = PageView.createByViews([this.view])
        }
        if (this.view.props?.bgcolor) {
            this.page.setProp("bgcolor", this.view.props.bgcolor)
        } else {
            this.page.setProp("bgcolor", UIKit.defaultBackgroundColor(this.view.type))
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

class TabBarCellView extends View {
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
                    const half = TabBarController.tabBarHeight / 2
                    make.size.equalTo(half)
                    make.top.inset((TabBarController.tabBarHeight - half - 13) / 2)
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
                    make.top.equalTo(view.prev.bottom).offset(3)
                }
            }
        ]
        return super.getView()
    }
}

class TabBarController extends Controller {
    static tabBarHeight = 50

    #pages = {}
    #cells = {}
    #selected

    get selected() {
        return this.#selected
    }

    set selected(selected) {
        this.switchPageTo(selected)
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
        if (this.#selected === undefined) this.#selected = key
        if (page instanceof PageView) {
            this.#pages[key] = page
        } else {
            this.#pages[key] = PageView.createByViews(page)
        }
        if (this.#selected !== key) this.#pages[key].activeStatus = false
        return this
    }

    switchPageTo(key) {
        if (this.#pages[key]) {
            if (this.#selected === key) return
            // menu 动画
            $ui.animate({
                duration: 0.4,
                animation: () => {
                    // 点击的图标
                    this.#cells[key].active()
                }
            })
            // 之前的图标
            this.#cells[this.#selected].inactive()
            // 切换页面
            this.#pages[this.#selected].hide()
            this.#pages[key].show()
            this.callEvent("onChange", this.#selected, key)
            this.#selected = key
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
        if (this.#selected === undefined) this.#selected = key
        if (!(cell instanceof TabBarCellView)) {
            cell = new TabBarCellView({
                props: { info: { key } },
                icon: cell.icon,
                title: cell.title,
                activeStatus: this.#selected === key
            })
        }
        this.#cells[key] = cell
        return this
    }

    #cellViews() {
        const views = []
        Object.values(this.#cells).forEach(cell => {
            cell.setEvent("tapped", sender => {
                const key = sender.info.key
                // 切换页面
                this.switchPageTo(key)
            })
            views.push(cell.getView())
        })
        return views
    }

    #pageViews() {
        return Object.values(this.#pages).map(page => {
            const view = page.definition
            if (UIKit.scrollViewList.indexOf(view.views[0].type) > -1) {
                if (view.views[0].props === undefined) {
                    view.views[0].props = {}
                }
                // indicatorInsets
                if (view.views[0].props.indicatorInsets) {
                    const old = view.views[0].props.indicatorInsets
                    view.views[0].props.indicatorInsets = $insets(
                        old.top,
                        old.left,
                        old.bottom + TabBarController.tabBarHeight,
                        old.right
                    )
                } else {
                    view.views[0].props.indicatorInsets = $insets(0, 0, 0, TabBarController.tabBarHeight)
                }
                // footer
                if (view.views[0].props.footer) {
                    view.views[0].props.footer.height += TabBarController.tabBarHeight
                } else {
                    view.views[0].props.footer = Object.assign(
                        view.views[0].props.footer = {
                            props: {
                                height: TabBarController.tabBarHeight
                            }
                        }
                    )
                }
            }
            return view
        })
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
                            views: this.#cellViews()
                        }
                    }
                }]),
                UIKit.separatorLine({}, UIKit.align.top)
            ]
        }
        return View.createByViews(this.#pageViews().concat(tabBarView))
    }
}

class Kernel {
    startTime = Date.now()
    version = VERSION
    // 隐藏 jsbox 默认 nav 栏
    isUseJsboxNav = false

    constructor() {
        if ($app.isDebugging) {
            this.debug()
        }
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

    useJsboxNav() {
        this.isUseJsboxNav = true
        return this
    }

    setTitle(title) {
        if (this.isUseJsboxNav) {
            $ui.title = title
        }
        this.title = title
    }

    setNavButtons(buttons) {
        this.navButtons = buttons
    }

    UIRender(view) {
        view.props = Object.assign({
            title: this.title,
            navBarHidden: !this.isUseJsboxNav,
            navButtons: this.navButtons ?? [],
            statusBarStyle: 0
        }, view.props)
        if (!view.events) {
            view.events = {}
        }
        const oldLayoutSubviews = view.events.layoutSubviews
        view.events.layoutSubviews = () => {
            $app.notify({
                name: "interfaceOrientationEvent",
                object: {
                    statusBarOrientation: UIKit.statusBarOrientation,
                    isHorizontal: UIKit.isHorizontal
                }
            })
            if (typeof oldLayoutSubviews === "function") oldLayoutSubviews()
        }
        $ui.render(view)
    }

    async checkUpdate(callback) {
        const branche = "master" // 更新版本，可选 master, dev
        const res = await $http.get(`https://raw.githubusercontent.com/ipuppet/EasyJsBox/${branche}/src/easy-jsbox.js`)
        if (res.error) throw res.error
        const firstLine = res.data.split("\n")[0]
        const latestVersion = firstLine.slice(16).replaceAll("\"", "")
        if (versionCompare(latestVersion, VERSION) > 0) {
            if (typeof callback === "function") {
                callback(res.data)
            }
        }
    }
}

class FileStorageParameterError extends Error {
    constructor(parameter) {
        super(`Parameter [${parameter}] is required.`)
        this.name = "FileStorageParameterError"
    }
}

class FileStorageFileNotFoundError extends Error {
    constructor(filePath) {
        super(`File not found: ${filePath}`)
        this.name = "FileStorageFileNotFoundError"
    }
}

class FileStorage {
    basePath

    constructor({ basePath = "storage" } = {}) {
        this.basePath = basePath
        this.#createDirectory(this.basePath)
    }

    #createDirectory(path) {
        if (!$file.isDirectory(path)) {
            $file.mkdir(path)
        }
    }

    #filePath(path = "", fileName) {
        path = `${this.basePath}/${path.trim("/")}`.trim("/")

        this.#createDirectory(path)

        path = `${path}/${fileName}`
        return path
    }

    write(path = "", fileName, data) {
        if (!fileName) {
            throw new FileStorageParameterError("fileName")
        }
        if (!data) {
            throw new FileStorageParameterError("data")
        }
        return $file.write({
            data: data,
            path: this.#filePath(path, fileName)
        })
    }

    writeSync(path = "", fileName, data) {
        return new Promise((resolve, reject) => {
            try {
                const success = this.write(path, fileName, data)
                if (success) {
                    resolve(success)
                } else {
                    reject(success)
                }
            } catch (error) {
                reject(error)
            }
        })
    }

    read(path = "", fileName) {
        if (!fileName) {
            throw new FileStorageParameterError("fileName")
        }
        path = this.#filePath(path, fileName)
        if (!$file.exists(path)) {
            throw new FileStorageFileNotFoundError(path)
        }
        if ($file.isDirectory(path)) {
            return $file.list(path)
        }
        return $file.read(path)
    }

    readSync(path = "", fileName) {
        return new Promise((resolve, reject) => {
            try {
                const file = this.read(path, fileName)
                if (file) {
                    resolve(file)
                } else {
                    reject()
                }
            } catch (error) {
                reject(error)
            }
        })
    }

    readAsJSON(path = "", fileName, _default = null) {
        try {
            const fileString = this.read(path, fileName)?.string
            return JSON.parse(fileString)
        } catch (error) {
            return _default
        }
    }

    static readFromRoot(path) {
        if (!path) {
            throw new FileStorageParameterError("path")
        }
        if (!$file.exists(path)) {
            throw new FileStorageFileNotFoundError(path)
        }
        if ($file.isDirectory(path)) {
            return $file.list(path)
        }
        return $file.read(path)
    }

    static readFromRootSync(path = "") {
        return new Promise((resolve, reject) => {
            try {
                const file = FileStorage.readFromRoot(path)
                if (file) {
                    resolve(file)
                } else {
                    reject()
                }
            } catch (error) {
                reject(error)
            }
        })
    }

    static readFromRootAsJSON(path = "", _default = null) {
        try {
            const fileString = FileStorage.readFromRoot(path)?.string
            return JSON.parse(fileString)
        } catch (error) {
            return _default
        }
    }
}

class SettingLoadConfigError extends Error {
    constructor() {
        super("Call loadConfig() first.")
        this.name = "SettingLoadConfigError"
    }
}

class SettingReadonlyError extends Error {
    constructor() {
        super("Attempted to assign to readonly property.")
        this.name = "SettingReadonlyError"
    }
}

/**
 * events:
 * - onSet(key, value)
 */
class Setting extends Controller {
    // 存储数据
    setting = {}
    // 用来控制 child 类型
    viewController = new ViewController()
    // 用于存放 script 类型用到的方法
    method = {}
    // withTouchEvents 延时自动关闭高亮，防止 touchesMoved 事件未正常调用
    #withTouchEventsT = {}
    // read only
    #readonly = false
    // 判断是否已经加载数据加载
    #loadConfigStatus = false
    #footer

    constructor(args = {}) {
        super()

        this.fileStorage = new FileStorage()
        // set 和 get 同时设置才会生效
        if (typeof args.set === "function" && typeof args.get === "function") {
            this.set = args.set
            this.get = args.get
        } else {
            this.dataFile = args.dataFile ?? "setting.json"
        }
        if (args.structure) {
            this.setStructure(args.structure) // structure 优先级高于 structurePath
        } else {
            this.setStructurePath(args.structurePath ?? "setting.json")
        }
        this.isUseJsboxNav = args.isUseJsboxNav ?? false
        this.setName(args.name ?? uuid())
        // l10n
        this.loadL10n()
    }

    useJsboxNav() {
        this.isUseJsboxNav = true
        return this
    }

    #checkLoadConfigError() {
        if (!this.#loadConfigStatus) {
            throw new SettingLoadConfigError()
        }
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
        userData = this.fileStorage.readAsJSON("", this.dataFile, {})
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
        this.#loadConfigStatus = true
        return this
    }

    hasSectionTitle(structure) {
        this.#checkLoadConfigError()
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
            this.setStructure(FileStorage.readFromRootAsJSON(structurePath))
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
        this.#footer = footer
        return this
    }

    set footer(footer) {
        this.#footer = footer
    }

    get footer() {
        if (this.#footer === undefined) {
            const info = FileStorage.readFromRootAsJSON("/config.json", {})["info"]
            this.#footer = info ? {
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
            } : {}
        }
        return this.#footer
    }

    setReadonly() {
        this.#readonly = true
        return this
    }

    set(key, value) {
        if (this.#readonly) {
            throw new SettingReadonlyError()
        }
        this.#checkLoadConfigError()
        this.setting[key] = value
        this.fileStorage.write("", this.dataFile, $data({ string: JSON.stringify(this.setting) }))
        this.callEvent("onSet", key, value)
        return true
    }

    get(key, _default = null) {
        this.#checkLoadConfigError()
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

    getId(type, key) {
        return `setting-${this.name}-${type}-${key}`
    }

    #touchHighlightStart(id) {
        $(id).bgcolor = $color("insetGroupedBackground")
    }

    #touchHighlightEnd(id, duration = 0.3) {
        $ui.animate({
            duration: duration,
            animation: () => {
                $(id).bgcolor = $color("clear")
            }
        })
    }

    #withTouchEvents(lineId, events, withTappedHighlight = false, highlightEndDelay = 0) {
        events = Object.assign(events, {
            touchesBegan: () => {
                this.#touchHighlightStart(lineId)
                // 延时自动关闭高亮，防止 touchesMoved 事件未正常调用
                this.#withTouchEventsT[lineId] = $delay(1, () => this.#touchHighlightEnd(lineId, 0))
            },
            touchesMoved: () => {
                this.#withTouchEventsT[lineId]?.cancel()
                this.#touchHighlightEnd(lineId, 0)
            }
        })
        if (withTappedHighlight) {
            const tapped = events.tapped
            events.tapped = () => {
                // highlight
                this.#touchHighlightStart(lineId)
                setTimeout(() => this.#touchHighlightEnd(lineId), highlightEndDelay * 1000)
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
        // 内部随机 id
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
                    events: this.#withTouchEvents(lineId, {
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

    createSwitch(key, icon, title) {
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

    createString(key, icon, title) {
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
                                                if (this.set(key, $(`${this.name}-string-${key}`).text)) {
                                                    popover.dismiss()
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

    createNumber(key, icon, title) {
        const id = this.getId("number", key)
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "label",
                    props: {
                        id: id,
                        align: $align.right,
                        text: this.get(key)
                    },
                    events: {
                        tapped: () => {
                            $input.text({
                                type: $kbType.decimal,
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
                                        $(id).text = text
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

    createStepper(key, icon, title, min, max) {
        const id = this.getId("stepper", key)
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "label",
                    props: {
                        id: id,
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
                            $(id).text = sender.value
                            if (!this.set(key, sender.value)) {
                                $(id).text = this.get(key)
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
        const id = this.getId("script", key)
        const buttonId = `${id}-button`
        const lineId = `${id}-line`
        const touchHighlight = () => {
            this.#touchHighlightStart(lineId)
            this.#touchHighlightEnd(lineId)
        }
        const actionStart = () => {
            // 隐藏 button，显示 spinner
            $(buttonId).alpha = 0
            $(`${buttonId}-spinner`).alpha = 1
            this.#touchHighlightStart(lineId)
        }
        const actionCancel = () => {
            $(buttonId).alpha = 1
            $(`${buttonId}-spinner`).alpha = 0
            this.#touchHighlightEnd(lineId)
        }
        const actionDone = (status = true, message = $l10n("ERROR")) => {
            $(`${buttonId}-spinner`).alpha = 0
            this.#touchHighlightEnd(lineId)
            const button = $(buttonId)
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
                                id: buttonId,
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
                                id: `${buttonId}-spinner`,
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
                            events: this.#withTouchEvents(lineId, {
                                tapped: () => {
                                    // 生成开始事件和结束事件动画，供函数调用
                                    const animate = {
                                        actionStart: actionStart, // 会出现加载动画
                                        actionCancel: actionCancel, // 会直接恢复箭头图标
                                        actionDone: actionDone, // 会出现对号，然后恢复箭头
                                        touchHighlight: touchHighlight, // 被点击的一行颜色加深，然后颜色恢复
                                        touchHighlightStart: () => this.#touchHighlightStart(lineId), // 被点击的一行颜色加深
                                        touchHighlightEnd: () => this.#touchHighlightEnd(lineId) // 被点击的一行颜色恢复
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

    createTab(key, icon, title, items, withTitle) {
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
                        }
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createColor(key, icon, title) {
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

    createMenu(key, icon, title, items, withTitle) {
        const id = this.getId("menu", key)
        const labelId = `${id}-label`
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
                                id: labelId
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
            events: this.#withTouchEvents(lineId, {
                tapped: () => {
                    this.#touchHighlightStart(lineId)
                    $ui.menu({
                        items: items,
                        handler: (title, idx) => {
                            const value = withTitle ? [idx, title] : idx
                            this.set(key, value)
                            $(labelId).text = $l10n(title)
                        },
                        finished: () => {
                            this.#touchHighlightEnd(lineId, 0.2)
                        }
                    })
                }
            }),
            layout: $layout.fill
        }
    }

    createDate(key, icon, title, mode = 2) {
        const id = this.getId("date", key)
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

    createInput(key, icon, title) {
        const id = this.getId("input", key)
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

    /**
     * 
     * @param {*} key 
     * @param {*} icon 
     * @param {*} title 
     * @param {*} events 
     * @param {String} bgcolor 指定预览时的背景色，默认 "#000000"
     * @returns 
     */
    createIcon(key, icon, title, bgcolor) {
        const id = this.getId("icon", key)
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
                                bgcolor: $color(bgcolor ?? "#000000"),
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
        const id = this.getId("child", key)
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
            events: this.#withTouchEvents(lineId, {
                tapped: () => {
                    setTimeout(() => {
                        if (this.events?.onChildPush) {
                            this.callEvent("onChildPush", this.getListView(children, {}), title)
                        } else {
                            if (this.isUseJsboxNav) {
                                UIKit.push({
                                    title: title,
                                    bgcolor: UIKit.scrollViewBackgroundColor,
                                    views: [this.getListView(children, {})]
                                })
                            } else {
                                const pageController = new PageController()
                                pageController
                                    .setView(this.getListView(children, {}))
                                    .navigationItem
                                    .setTitle(title)
                                    .addPopButton()
                                    .setLargeTitleDisplayMode(NavigationItem.largeTitleDisplayModeNever)
                                if (this.hasSectionTitle(children)) {
                                    pageController.navigationController.navigationBar.setContentViewHeightOffset(-5)
                                } else {
                                    pageController.navigationController.navigationBar.setContentViewHeightOffset(30)
                                }
                                this.viewController.push(pageController)
                            }
                        }
                    })
                }
            }, true, 0.3)
        }
    }

    #getSections(structure) {
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
                        row = this.createSwitch(item.key, item.icon, item.title)
                        break
                    case "stepper":
                        row = this.createStepper(item.key, item.icon, item.title, item.min ?? 1, item.max ?? 12)
                        break
                    case "string":
                        row = this.createString(item.key, item.icon, item.title)
                        break
                    case "number":
                        row = this.createNumber(item.key, item.icon, item.title)
                        break
                    case "info":
                        row = this.createInfo(item.icon, item.title, value)
                        break
                    case "script":
                        row = this.createScript(item.key, item.icon, item.title, value)
                        break
                    case "tab":
                        row = this.createTab(item.key, item.icon, item.title, item.items, item.withTitle)
                        break
                    case "color":
                        row = this.createColor(item.key, item.icon, item.title)
                        break
                    case "menu":
                        if (typeof item.items === "string") {
                            item.items = eval(`(()=>{return ${item.items}()})()`)
                        }
                        row = this.createMenu(item.key, item.icon, item.title, item.items, item.withTitle)
                        break
                    case "date":
                        row = this.createDate(item.key, item.icon, item.title, item.mode)
                        break
                    case "input":
                        row = this.createInput(item.key, item.icon, item.title)
                        break
                    case "icon":
                        row = this.createIcon(item.key, item.icon, item.title)
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

    getListView(structure, footer = this.footer) {
        return {
            type: "list",
            props: {
                style: 2,
                separatorInset: $insets(0, 50, 0, 10), // 分割线边距
                rowHeight: 50,
                bgcolor: UIKit.scrollViewBackgroundColor,
                footer: footer,
                data: this.#getSections(structure ?? this.structure)
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
            if (this.hasSectionTitle(this.structure)) {
                pageController.navigationController.navigationBar.setContentViewHeightOffset(-5)
            } else {
                pageController.navigationController.navigationBar.setContentViewHeightOffset(30)
            }
            this.viewController.setRootPageController(pageController)
        }
        return this.viewController.getRootPageController().getPage()
    }
}

module.exports = {
    VERSION,
    versionCompare,
    // class
    UIKit,
    ViewController,
    Matrix,
    Sheet,
    NavigationBar,
    BarButtonItem,
    SearchBar,
    SearchBarController,
    NavigationItem,
    NavigationController,
    PageView,
    PageController,
    TabBarCellView,
    TabBarController,
    Kernel,
    FileStorage,
    Setting
}