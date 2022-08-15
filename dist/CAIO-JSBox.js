(() => {
var $parcel$global =
typeof globalThis !== 'undefined'
  ? globalThis
  : typeof self !== 'undefined'
  ? self
  : typeof window !== 'undefined'
  ? window
  : typeof global !== 'undefined'
  ? global
  : {};
var $parcel$modules = {};
var $parcel$inits = {};

var parcelRequire = $parcel$global["parcelRequire94c2"];
if (parcelRequire == null) {
  parcelRequire = function(id) {
    if (id in $parcel$modules) {
      return $parcel$modules[id].exports;
    }
    if (id in $parcel$inits) {
      var init = $parcel$inits[id];
      delete $parcel$inits[id];
      var module = {id: id, exports: {}};
      $parcel$modules[id] = module;
      init.call(module.exports, module, module.exports);
      return module.exports;
    }
    var err = new Error("Cannot find module '" + id + "'");
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  };

  parcelRequire.register = function register(id, init) {
    $parcel$inits[id] = init;
  };

  $parcel$global["parcelRequire94c2"] = parcelRequire;
}
parcelRequire.register("l35Ko", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $f52e560de5bdadbc$require$UIKit = $1cJLV.UIKit;
var $f52e560de5bdadbc$require$TabBarController = $1cJLV.TabBarController;
var $f52e560de5bdadbc$require$Kernel = $1cJLV.Kernel;
var $f52e560de5bdadbc$require$FileStorage = $1cJLV.FileStorage;
var $f52e560de5bdadbc$require$Setting = $1cJLV.Setting;

var $6QERS = parcelRequire("6QERS");

var $2Ygkq = parcelRequire("2Ygkq");

var $cMkik = parcelRequire("cMkik");

var $4lgvP = parcelRequire("4lgvP");
const $f52e560de5bdadbc$var$fileStorage = new $f52e560de5bdadbc$require$FileStorage();
/**
 * @typedef {AppKernel} AppKernel
 */ class $f52e560de5bdadbc$var$AppKernel extends $f52e560de5bdadbc$require$Kernel {
    constructor(){
        super();
        this.query = $context.query;
        // FileStorage
        this.fileStorage = $f52e560de5bdadbc$var$fileStorage;
        // Setting
        let structure;
        try {
            structure = __SETTING__;
        } catch  {
        }
        this.setting = new $f52e560de5bdadbc$require$Setting({
            fileStorage: this.fileStorage,
            structure: structure
        });
        this.setting.loadConfig();
        // Storage
        this.storage = new $6QERS(this.setting.get("clipboard.autoSync"), this);
        this.initComponents();
        $4lgvP(this);
    }
    initComponents() {
        // Clipboard
        this.clipboard = new $2Ygkq(this);
        // ActionManager
        this.actionManager = new $cMkik(this);
    }
    deleteConfirm(message, conformAction) {
        $ui.alert({
            title: message,
            actions: [
                {
                    title: $l10n("DELETE"),
                    style: $alertActionType.destructive,
                    handler: ()=>{
                        conformAction();
                    }
                },
                {
                    title: $l10n("CANCEL")
                }
            ]
        });
    }
}


class $f52e560de5bdadbc$var$AppUI {
    static renderMainUI() {
        const kernel = new $f52e560de5bdadbc$var$AppKernel();
        const buttons = {
            clipboard: {
                icon: "doc.on.clipboard",
                title: $l10n("CLIPBOARD")
            },
            actions: {
                icon: "command",
                title: $l10n("ACTIONS")
            },
            setting: {
                icon: "gear",
                title: $l10n("SETTING")
            }
        };
        kernel.setting.setEvent("onSet", (key)=>{
            if (key === "mainUIDisplayMode") $delay(0.3, ()=>$addin.restart()
            );
        });
        if (kernel.setting.get("mainUIDisplayMode") === 0) {
            kernel.useJsboxNav();
            kernel.setting.useJsboxNav();
            kernel.setNavButtons([
                {
                    symbol: buttons.setting.icon,
                    title: buttons.setting.title,
                    handler: ()=>{
                        $f52e560de5bdadbc$require$UIKit.push({
                            title: buttons.setting.title,
                            views: [
                                kernel.setting.getListView()
                            ]
                        });
                    }
                },
                {
                    symbol: buttons.actions.icon,
                    title: buttons.actions.title,
                    handler: ()=>{
                        kernel.actionManager.present();
                    }
                }
            ]);
            kernel.UIRender(kernel.clipboard.getPageController().getPage());
        } else {
            kernel.tabBarController = new $f52e560de5bdadbc$require$TabBarController();
            const clipboardPageController = kernel.clipboard.getPageController();
            kernel.tabBarController.setPages({
                clipboard: clipboardPageController.getPage(),
                actions: kernel.actionManager.getPageView(),
                setting: kernel.setting.getPageView()
            }).setCells({
                clipboard: buttons.clipboard,
                actions: buttons.actions,
                setting: buttons.setting
            });
            kernel.UIRender(kernel.tabBarController.generateView().definition);
        }
    }
    static renderKeyboardUI() {
        const kernel = new $f52e560de5bdadbc$var$AppKernel();
        const Keyboard = (parcelRequire("ehiE8"));
        const keyboard = new Keyboard(kernel);
        $ui.render({
            views: [
                keyboard.getView()
            ]
        });
    }
    static renderTodayUI() {
        const kernel = new $f52e560de5bdadbc$var$AppKernel();
        const Today = (parcelRequire("knL6n"));
        const today = new Today(kernel);
        $ui.render({
            views: [
                today.getView()
            ]
        });
    }
    static renderUnsupported() {
        $intents.finish("不支持在此环境中运行");
        $ui.render({
            views: [
                {
                    type: "label",
                    props: {
                        text: "不支持在此环境中运行",
                        align: $align.center
                    },
                    layout: $layout.fill
                }
            ]
        });
    }
}
class $f52e560de5bdadbc$var$Widget {
    static widgetInstance(widget, ...data) {
        if ($file.exists(`/scripts/widget/${widget}.js`)) {
            const { Widget: Widget  } = require(`./widget/${widget}.js`);
            return new Widget(...data);
        } else return false;
    }
    static renderError() {
        $widget.setTimeline({
            render: ()=>({
                    type: "text",
                    props: {
                        text: "Invalid argument"
                    }
                })
        });
    }
    static renderClipboard() {
        const setting = new $f52e560de5bdadbc$require$Setting();
        setting.loadConfig().setReadonly();
        const widget = $f52e560de5bdadbc$var$Widget.widgetInstance("Clipboard", setting, new $6QERS(false, {
            fileStorage: $f52e560de5bdadbc$var$fileStorage
        }));
        widget.render();
    }
    static render(widgetName = $widget.inputValue) {
        widgetName = widgetName ?? "Clipboard";
        if (widgetName === "Clipboard") $f52e560de5bdadbc$var$Widget.renderClipboard();
        else $f52e560de5bdadbc$var$Widget.renderError();
    }
}
module.exports = {
    Widget: $f52e560de5bdadbc$var$Widget,
    run: ()=>{
        //AppUI.renderTodayUI(); return
        //AppUI.renderKeyboardUI(); return
        //Widget.render(); return
        if ($app.env === $env.app || $app.env === $env.action) $f52e560de5bdadbc$var$AppUI.renderMainUI();
        else if ($app.env === $env.keyboard) $f52e560de5bdadbc$var$AppUI.renderKeyboardUI();
        else if ($app.env === $env.widget) $f52e560de5bdadbc$var$Widget.render();
        else if ($app.env === $env.today) $f52e560de5bdadbc$var$AppUI.renderTodayUI();
        else $f52e560de5bdadbc$var$AppUI.renderUnsupported();
    }
};

});
parcelRequire.register("1cJLV", function(module, exports) {
const VERSION = "1.2.3";
String.prototype.trim = function(char, type) {
    if (char) {
        if (type === "l") return this.replace(new RegExp("^\\" + char + "+", "g"), "");
        else if (type === "r") return this.replace(new RegExp("\\" + char + "+$", "g"), "");
        return this.replace(new RegExp("^\\" + char + "+|\\" + char + "+$", "g"), "");
    }
    return this.replace(/^\s+|\s+$/g, "");
};
/**
 * 对比版本号
 * @param {string} preVersion
 * @param {string} lastVersion
 * @returns {number} 1: preVersion 大, 0: 相等, -1: lastVersion 大
 */ function versionCompare(preVersion = "", lastVersion = "") {
    let sources = preVersion.split(".");
    let dests = lastVersion.split(".");
    let maxL = Math.max(sources.length, dests.length);
    let result = 0;
    for(let i = 0; i < maxL; i++){
        let preValue = sources.length > i ? sources[i] : 0;
        let preNum = isNaN(Number(preValue)) ? preValue.charCodeAt() : Number(preValue);
        let lastValue = dests.length > i ? dests[i] : 0;
        let lastNum = isNaN(Number(lastValue)) ? lastValue.charCodeAt() : Number(lastValue);
        if (preNum < lastNum) {
            result = -1;
            break;
        } else if (preNum > lastNum) {
            result = 1;
            break;
        }
    }
    return result;
}
function l10n(language, content, override = true) {
    if (typeof content === "string") {
        const strings = {
        };
        const strArr = content.split(";");
        strArr.forEach((line)=>{
            line = line.trim();
            if (line !== "") {
                const kv = line.split("=");
                strings[kv[0].trim().slice(1, -1)] = kv[1].trim().slice(1, -1);
            }
        });
        content = strings;
    }
    const strings = $app.strings;
    if (override) strings[language] = Object.assign($app.strings[language], content);
    else strings[language] = Object.assign(content, $app.strings[language]);
    $app.strings = strings;
}
function uuid() {
    const s = [];
    const hexDigits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    for(let i = 0; i < 36; i++)s[i] = hexDigits.substr(Math.floor(Math.random() * 16), 1);
    s[14] = "4" // bits 12-15 of the time_hi_and_version field to 0010
    ;
    s[19] = hexDigits.substr(s[19] & 3 | 8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
    ;
    s[8] = s[13] = s[18] = s[23] = "-";
    return s.join("");
}
function objectEqual(a, b) {
    let aProps = Object.getOwnPropertyNames(a);
    let bProps = Object.getOwnPropertyNames(b);
    if (aProps.length !== bProps.length) return false;
    for(let i = 0; i < aProps.length; i++){
        let propName = aProps[i];
        let propA = a[propName];
        let propB = b[propName];
        if (Array.isArray(propA)) for(let i = 0; i < propA.length; i++){
            if (!objectEqual(propA[i], propB[i])) return false;
        }
        else if (typeof propA === "object") return objectEqual(propA, propB);
        else if (propA !== propB) return false;
    }
    return true;
}
/**
 * 压缩图片
 * @param {$image} image $image
 * @param {number} maxSize 图片最大尺寸 单位：像素
 * @returns {$image}
 */ function compressImage(image, maxSize = 921600) {
    const info = $imagekit.info(image);
    if (info.height * info.width > maxSize) {
        const scale = maxSize / (info.height * info.width);
        image = $imagekit.scaleBy(image, scale);
    }
    return image;
}
class ValidationError extends Error {
    constructor(parameter, type){
        super(`The type of the parameter '${parameter}' must be '${type}'`);
        this.name = "ValidationError";
    }
}
class Controller {
    events = {
    };
    setEvents(events) {
        Object.keys(events).forEach((event)=>this.setEvent(event, events[event])
        );
        return this;
    }
    setEvent(event, callback) {
        this.events[event] = callback;
        return this;
    }
    callEvent(event, ...args) {
        if (typeof this.events[event] === "function") this.events[event](...args);
    }
}
/**
 * 视图基类
 */ class View {
    /**
     * id
     * @type {string}
     */ id = uuid();
    /**
     * 类型
     * @type {string}
     */ type;
    /**
     * 属性
     * @type {Object}
     */ props;
    /**
     * 子视图
     * @type {Array}
     */ views;
    /**
     * 事件
     * @type {Object}
     */ events;
    /**
     * 布局函数
     * @type {Function}
     */ layout;
    constructor({ type ="view" , props ={
    } , views =[] , events ={
    } , layout =$layout.fill  } = {
    }){
        // 属性
        this.type = type;
        this.props = props;
        this.views = views;
        this.events = events;
        this.layout = layout;
        if (this.props.id) this.id = this.props.id;
        else this.props.id = this.id;
    }
    static create(args) {
        return new this(args);
    }
    static createByViews(views) {
        return new this({
            views
        });
    }
    setProps(props) {
        Object.keys(props).forEach((key)=>this.setProp(key, props[key])
        );
        return this;
    }
    setProp(key, prop) {
        if (key === "id") this.id = prop;
        this.props[key] = prop;
        return this;
    }
    setViews(views) {
        this.views = views;
        return this;
    }
    setEvents(events) {
        Object.keys(events).forEach((event)=>this.setEvent(event, events[event])
        );
        return this;
    }
    setEvent(event, action) {
        this.events[event] = action;
        return this;
    }
    /**
     * 事件中间件
     *
     * 调用处理函数 `action`，第一个参数为用户定义的事件处理函数
     * 其余参数为 JSBox 传递的参数，如 sender 等
     *
     * @param {string} event 事件名称
     * @param {Function} action 处理事件的函数
     * @returns {this}
     */ eventMiddleware(event, action) {
        const old = this.events[event];
        this.events[event] = (...args)=>{
            if (typeof old === "function") // 调用处理函数
            action(old, ...args);
        };
        return this;
    }
    assignEvent(event, action) {
        const old = this.events[event];
        this.events[event] = (...args)=>{
            if (typeof old === "function") old(...args);
            action(...args);
        };
        return this;
    }
    setLayout(layout) {
        this.layout = layout;
        return this;
    }
    getView() {
        return this;
    }
    get definition() {
        return this.getView();
    }
}
class UIKit {
    static #sharedApplication = $objc("UIApplication").$sharedApplication();
    /**
     * 对齐方式
     */ static align = {
        left: 0,
        right: 1,
        top: 2,
        bottom: 3
    };
    /**
     * 默认文本颜色
     */ static textColor = $color("primaryText", "secondaryText");
    /**
     * 默认链接颜色
     */ static linkColor = $color("systemLink");
    static primaryViewBackgroundColor = $color("primarySurface");
    static scrollViewBackgroundColor = $color("insetGroupedBackground");
    /**
     * 可滚动视图列表
     * @type {string[]}
     */ static scrollViewList = [
        "list",
        "matrix"
    ];
    /**
     * 是否属于大屏设备
     * @type {boolean}
     */ static isLargeScreen = $device.isIpad || $device.isIpadPro;
    /**
     * 获取Window大小
     */ static get windowSize() {
        return $objc("UIWindow").$keyWindow().jsValue().size;
    }
    static NavigationBarNormalHeight = $objc("UINavigationController").invoke("alloc.init").$navigationBar().jsValue().frame.height;
    static NavigationBarLargeTitleHeight = $objc("UITabBarController").invoke("alloc.init").$tabBar().jsValue().frame.height + UIKit.NavigationBarNormalHeight;
    /**
     * 判断是否是分屏模式
     * @type {boolean}
     */ static get isSplitScreenMode() {
        return UIKit.isLargeScreen && $device.info.screen.width !== UIKit.windowSize.width;
    }
    static get statusBarHeight() {
        return $app.isDebugging ? 0 : UIKit.#sharedApplication.$statusBarFrame().height;
    }
    static get statusBarOrientation() {
        return UIKit.#sharedApplication.$statusBarOrientation();
    }
    static get isHorizontal() {
        return UIKit.statusBarOrientation === 3 || UIKit.statusBarOrientation === 4;
    }
    static loading() {
        const loading = $ui.create(UIKit.blurBox({
            cornerRadius: 15
        }, [
            {
                type: "spinner",
                props: {
                    loading: true,
                    style: 0
                },
                layout: (make, view)=>{
                    make.size.equalTo(view.prev);
                    make.center.equalTo(view.super);
                }
            }
        ]));
        return {
            start: ()=>{
                $ui.controller.view.insertAtIndex(loading, 0);
                loading.layout((make, view)=>{
                    make.center.equalTo(view.super);
                    const width = Math.min(UIKit.windowSize.width * 0.6, 300);
                    make.size.equalTo($size(width, width));
                });
                loading.moveToFront();
            },
            end: ()=>{
                loading.remove();
            }
        };
    }
    static defaultBackgroundColor(type) {
        return UIKit.scrollViewList.indexOf(type) > -1 ? UIKit.scrollViewBackgroundColor : UIKit.primaryViewBackgroundColor;
    }
    static separatorLine(props = {
    }, align = UIKit.align.bottom) {
        return {
            // canvas
            type: "canvas",
            props: props,
            layout: (make, view)=>{
                if (view.prev === undefined) make.top.equalTo(view.super);
                else if (align === UIKit.align.bottom) make.top.equalTo(view.prev.bottom);
                else make.top.equalTo(view.prev.top);
                make.height.equalTo(1 / $device.info.screen.scale);
                make.left.right.inset(0);
            },
            events: {
                draw: (view, ctx)=>{
                    ctx.strokeColor = props.bgcolor ?? $color("separatorColor");
                    ctx.setLineWidth(1);
                    ctx.moveToPoint(0, 0);
                    ctx.addLineToPoint(view.frame.width, 0);
                    ctx.strokePath();
                }
            }
        };
    }
    static blurBox(props = {
    }, views = [], layout = $layout.fill) {
        return {
            type: "blur",
            props: Object.assign({
                style: $blurStyle.thinMaterial
            }, props),
            views: views,
            layout: layout
        };
    }
    /**
     * 建议仅在使用 JSBox nav 时使用，便于统一风格
     */ static push(args) {
        const views = args.views, statusBarStyle = args.statusBarStyle ?? 0, title = args.title ?? "", navButtons = args.navButtons ?? [
            {
                title: ""
            }
        ], bgcolor = (args.bgcolor ?? views[0]?.props?.bgcolor) ?? "primarySurface", disappeared = args.disappeared;
        $ui.push({
            props: {
                statusBarStyle: statusBarStyle,
                navButtons: navButtons,
                title: title,
                bgcolor: typeof bgcolor === "string" ? $color(bgcolor) : bgcolor
            },
            events: {
                disappeared: ()=>{
                    if (disappeared !== undefined) disappeared();
                }
            },
            views: [
                {
                    type: "view",
                    views: views,
                    layout: (make, view)=>{
                        make.top.equalTo(view.super.safeArea);
                        make.bottom.equalTo(view.super);
                        make.left.right.equalTo(view.super.safeArea);
                    }
                }
            ]
        });
    }
}
/**
 * @property {function(PageController)} ViewController.events.onChange
 */ class ViewController extends Controller {
    #pageControllers = [];
    /**
     * @param {PageController} pageController
     */  #onPop(pageController) {
        this.callEvent("onPop", pageController) // 被弹出的对象
        ;
        this.#pageControllers.pop();
    }
    /**
     * push 新页面
     * @param {PageController} pageController
     */ push(pageController1) {
        const parent = this.#pageControllers[this.#pageControllers.length - 1];
        pageController1.navigationItem.addPopButton(parent?.navigationItem.title);
        this.#pageControllers.push(pageController1);
        $ui.push({
            props: {
                statusBarStyle: 0,
                navBarHidden: true
            },
            events: {
                dealloc: ()=>{
                    this.#onPop(pageController1);
                }
            },
            views: [
                pageController1.getPage().definition
            ],
            layout: $layout.fill
        });
    }
    /**
     *
     * @param {PageController} pageController
     * @returns {this}
     */ setRootPageController(pageController2) {
        this.#pageControllers = [];
        this.#pageControllers.push(pageController2);
        return this;
    }
    hasRootPageController() {
        return this.#pageControllers[0] instanceof PageController;
    }
    getRootPageController() {
        return this.#pageControllers[0];
    }
}
class Matrix extends View {
    titleStyle = {
        font: $font("bold", 21),
        height: 30
    };
    #hiddenViews;
    #templateHiddenStatus;
    templateIdByIndex(i) {
        if (this.props.template.views[i]?.props?.id === undefined) {
            if (this.props.template.views[i].props === undefined) this.props.template.views[i].props = {
            };
            this.props.template.views[i].props.id = uuid();
        }
        return this.props.template.views[i].props.id;
    }
    get templateHiddenStatus() {
        if (!this.#templateHiddenStatus) {
            this.#templateHiddenStatus = {
            };
            for(let i = 0; i < this.props.template.views.length; i++){
                // 未定义 id 以及 hidden 的模板默认 hidden 设置为 false
                if (this.props.template.views[i].props.id === undefined && this.props.template.views[i].props.hidden === undefined) this.#templateHiddenStatus[this.templateIdByIndex(i)] = false;
                // 模板中声明 hidden 的值，在数据中将会成为默认值
                if (this.props.template.views[i].props.hidden !== undefined) this.#templateHiddenStatus[this.templateIdByIndex(i)] = this.props.template.views[i].props.hidden;
            }
        }
        return this.#templateHiddenStatus;
    }
    get hiddenViews() {
        if (!this.#hiddenViews) {
            this.#hiddenViews = {
            };
            // hide other views
            for(let i = 0; i < this.props.template.views.length; i++)this.#hiddenViews[this.templateIdByIndex(i)] = {
                hidden: true
            };
        }
        return this.#hiddenViews;
    }
     #titleToData(title) {
        let hiddenViews = {
            ...this.hiddenViews
        };
        // templateProps & title
        Object.assign(hiddenViews, {
            __templateProps: {
                hidden: true
            },
            __title: {
                hidden: false,
                text: title,
                info: {
                    title: true
                }
            }
        });
        return hiddenViews;
    }
    rebuildData(data = []) {
        // rebuild data
        return data.map((section)=>{
            section.items = section.items.map((item)=>{
                // 所有元素都重置 hidden 属性
                Object.keys(item).forEach((key)=>{
                    item[key].hidden = this.templateHiddenStatus[key] ?? false;
                });
                // 修正数据
                Object.keys(this.templateHiddenStatus).forEach((key)=>{
                    if (!item[key]) item[key] = {
                    };
                    item[key].hidden = this.templateHiddenStatus[key];
                });
                item.__templateProps = {
                    hidden: false
                };
                item.__title = {
                    hidden: true
                };
                return item;
            });
            if (section.title) section.items.unshift(this.#titleToData(section.title));
            return section;
        });
    }
    rebuildTemplate() {
        let templateProps = {
        };
        if (this.props.template.props !== undefined) templateProps = Object.assign(this.props.template.props, {
            id: "__templateProps",
            hidden: false
        });
        this.props.template.props = {
        };
        // rebuild template
        const templateViews = [
            {
                // templateProps
                type: "view",
                props: templateProps,
                layout: $layout.fill
            },
            {
                // title
                type: "label",
                props: {
                    id: "__title",
                    hidden: true,
                    font: this.titleStyle.font
                },
                layout: (make, view)=>{
                    make.top.inset(-(this.titleStyle.height / 4) * 3);
                    make.height.equalTo(this.titleStyle.height);
                    make.width.equalTo(view.super.safeArea);
                }
            }
        ].concat(this.props.template.views);
        this.props.template.views = templateViews;
    }
    insert(data, withTitleOffset = true) {
        data.indexPath = this.indexPath(data.indexPath, withTitleOffset);
        return $(this.id).insert(data);
    }
    delete(indexPath, withTitleOffset = true) {
        indexPath = this.indexPath(indexPath, withTitleOffset);
        return $(this.id).delete(indexPath);
    }
    object(indexPath, withTitleOffset = true) {
        indexPath = this.indexPath(indexPath, withTitleOffset);
        return $(this.id).object(indexPath);
    }
    cell(indexPath, withTitleOffset = true) {
        indexPath = this.indexPath(indexPath, withTitleOffset);
        return $(this.id).cell(indexPath);
    }
    /**
     * 获得修正后的 indexPath
     * @param {$indexPath||number} indexPath
     * @param {boolean} withTitleOffset 输入的 indexPath 是否已经包含了标题列。通常自身事件返回的 indexPath 视为已包含，使用默认值即可。
     * @returns {$indexPath}
     */ indexPath(indexPath, withTitleOffset) {
        let offset = withTitleOffset ? 0 : 1;
        if (typeof indexPath === "number") indexPath = $indexPath(0, indexPath);
        indexPath = $indexPath(indexPath.section, indexPath.row + offset);
        return indexPath;
    }
    update(data) {
        this.props.data = this.rebuildData(data);
        $(this.id).data = this.props.data;
    }
    getView() {
        // rebuild data, must first
        this.props.data = this.rebuildData(this.props.data);
        // rebuild template
        this.rebuildTemplate();
        // itemSize event
        this.setEvent("itemSize", (sender, indexPath)=>{
            const info = sender.object(indexPath)?.__title?.info;
            if (info?.title) return $size(Math.max($device.info.screen.width, $device.info.screen.height), 0);
            const columns = this.props.columns ?? 2;
            const spacing = this.props.spacing ?? 15;
            const width = (this.props.itemWidth ?? this.props.itemSize?.width) ?? (sender.super.frame.width - spacing * (columns + 1)) / columns;
            const height = (this.props.itemHeight ?? this.props.itemSize?.height) ?? 100;
            return $size(width, height);
        });
        return this;
    }
}
class SheetAddNavBarError extends Error {
    constructor(){
        super("Please call setView(view) first.");
        this.name = "SheetAddNavBarError";
    }
}
class SheetViewTypeError extends ValidationError {
    constructor(parameter, type){
        super(parameter, type);
        this.name = "SheetViewTypeError";
    }
}
class Sheet extends View {
    #present = ()=>{
    };
    #dismiss = ()=>{
    };
    pageController;
    init() {
        const UIModalPresentationStyle = {
            pageSheet: 1
        } // TODO: sheet style
        ;
        const { width , height  } = $device.info.screen;
        const UIView = $objc("UIView").invoke("initWithFrame", $rect(0, 0, width, height));
        const PSViewController = $objc("UIViewController").invoke("alloc.init");
        const PSViewControllerView = PSViewController.$view();
        PSViewControllerView.$setBackgroundColor($color("primarySurface"));
        PSViewControllerView.$addSubview(UIView);
        PSViewController.$setModalPresentationStyle(UIModalPresentationStyle.pageSheet);
        this.#present = ()=>{
            PSViewControllerView.jsValue().add(this.pageController?.getPage().definition ?? this.view);
            $ui.vc.ocValue().invoke("presentModalViewController:animated", PSViewController, true);
        };
        this.#dismiss = ()=>PSViewController.invoke("dismissModalViewControllerAnimated", true)
        ;
        return this;
    }
    /**
     * 设置 view
     * @param {Object} view 视图对象
     * @returns {this}
     */ setView(view = {
    }) {
        if (typeof view !== "object") throw new SheetViewTypeError("view", "object");
        this.view = view;
        return this;
    }
    /**
     * 为 view 添加一个 navBar
     * @param {Object} param
     *  {
     *      {string} title
     *      {Object} popButton 参数与 BarButtonItem 一致
     *      {Array} rightButtons
     *  }
     * @returns {this}
     */ addNavBar({ title: title1 , popButton ={
        title: "Done"
    } , rightButtons =[]  }) {
        if (this.view === undefined) throw new SheetAddNavBarError();
        this.pageController = new PageController();
        // 返回按钮
        const barButtonItem = new BarButtonItem();
        barButtonItem.setEvents(Object.assign({
            tapped: ()=>{
                this.dismiss();
                if (typeof popButton.tapped === "function") popButton.tapped();
            }
        }, popButton.events)).setAlign(UIKit.align.left).setSymbol(popButton.symbol).setTitle(popButton.title).setMenu(popButton.menu);
        const button = barButtonItem.definition.views[0];
        button.layout = (make, view)=>{
            make.left.equalTo(view.super.safeArea).offset(15);
            make.centerY.equalTo(view.super.safeArea);
        };
        this.pageController.navigationItem.addPopButton("", button).setTitle(title1).setLargeTitleDisplayMode(NavigationItem.largeTitleDisplayModeNever).setRightButtons(rightButtons);
        this.pageController.setView(this.view).navigationController.navigationBar.pageSheetMode();
        if (this.view.props?.bgcolor) this.pageController?.getPage().setProp("bgcolor", this.view.props?.bgcolor);
        return this;
    }
    /**
     * 弹出 Sheet
     */ present() {
        this.#present();
    }
    /**
     * 关闭 Sheet
     */ dismiss() {
        this.#dismiss();
    }
}
/**
 * 用于创建一个靠右侧按钮（自动布局）
 * this.events.tapped 按钮点击事件，会传入三个函数，start()、done() 和 cancel()
 *     调用 start() 表明按钮被点击，准备开始动画
 *     调用 done() 表明您的操作已经全部完成，默认操作成功完成，播放一个按钮变成对号的动画
 *                 若第一个参数传出false则表示运行出错
 *                 第二个参数为错误原因($ui.toast(message))
 *     调用 cancel() 表示取消操作
 *     示例：
 *      (start, done, cancel) => {
 *          start()
 *          const upload = (data) => { return false }
 *          if (upload(data)) { done() }
 *          else { done(false, "Upload Error!") }
 *      }
 */ class BarButtonItem extends View {
    static size = $size(38, 38);
    static iconSize = $size(23, 23) // 比 size 小 edges
    ;
    static edges = 15;
    /**
     * 标题
     * @type {string}
     */ title = "";
    /**
     * 对齐方式
     */ align = UIKit.align.right;
    setTitle(title2 = "") {
        this.title = title2;
        return this;
    }
    setSymbol(symbol) {
        this.symbol = symbol;
        return this;
    }
    setMenu(menu) {
        this.menu = menu;
        return this;
    }
    setAlign(align) {
        this.align = align;
        return this;
    }
     #actionStart() {
        // 隐藏button，显示spinner
        $(this.id).hidden = true;
        $("spinner-" + this.id).hidden = false;
    }
     #actionDone() {
        const buttonIcon = $(`icon-button-${this.id}`);
        const checkmarkIcon = $(`icon-checkmark-${this.id}`);
        buttonIcon.alpha = 0;
        $(this.id).hidden = false;
        $("spinner-" + this.id).hidden = true;
        // 成功动画
        $ui.animate({
            duration: 0.6,
            animation: ()=>{
                checkmarkIcon.alpha = 1;
            },
            completion: ()=>{
                $delay(0.3, ()=>$ui.animate({
                        duration: 0.6,
                        animation: ()=>{
                            checkmarkIcon.alpha = 0;
                        },
                        completion: ()=>{
                            $ui.animate({
                                duration: 0.4,
                                animation: ()=>{
                                    buttonIcon.alpha = 1;
                                },
                                completion: ()=>{
                                    buttonIcon.alpha = 1;
                                }
                            });
                        }
                    })
                );
            }
        });
    }
     #actionCancel() {
        $(this.id).hidden = false;
        $("spinner-" + this.id).hidden = true;
    }
    getView() {
        const userTapped = this.events.tapped;
        this.events.tapped = (sender)=>{
            if (!userTapped) return;
            userTapped({
                start: ()=>this.#actionStart()
                ,
                done: ()=>this.#actionDone()
                ,
                cancel: ()=>this.#actionCancel()
            }, sender);
        };
        return {
            type: "view",
            views: [
                {
                    type: "button",
                    props: Object.assign({
                        id: this.id,
                        bgcolor: $color("clear"),
                        tintColor: UIKit.textColor,
                        titleColor: UIKit.textColor,
                        contentEdgeInsets: $insets(0, 0, 0, 0),
                        titleEdgeInsets: $insets(0, 0, 0, 0),
                        imageEdgeInsets: $insets(0, 0, 0, 0)
                    }, this.menu ? {
                        menu: this.menu
                    } : {
                    }, this.title?.length > 0 ? {
                        title: this.title
                    } : {
                    }, this.props),
                    views: [
                        {
                            type: "image",
                            props: Object.assign({
                                id: `icon-button-${this.id}`,
                                hidden: this.symbol === undefined,
                                tintColor: UIKit.textColor
                            }, this.symbol === undefined ? {
                            } : typeof this.symbol === "string" ? {
                                symbol: this.symbol
                            } : {
                                data: this.symbol.png
                            }),
                            layout: (make, view)=>{
                                make.center.equalTo(view.super);
                                make.size.equalTo(BarButtonItem.iconSize);
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
                            layout: (make, view)=>{
                                make.center.equalTo(view.super);
                                make.size.equalTo(BarButtonItem.iconSize);
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
            layout: (make, view)=>{
                make.size.equalTo(BarButtonItem.size);
                make.centerY.equalTo(view.super);
                if (view.prev && view.prev.id !== "label" && view.prev.id !== undefined) {
                    if (this.align === UIKit.align.right) make.right.equalTo(view.prev.left);
                    else make.left.equalTo(view.prev.right);
                } else {
                    // 图片类型留一半边距，图标和按钮边距是另一半
                    const edges = this.symbol ? BarButtonItem.edges / 2 : BarButtonItem.edges;
                    if (this.align === UIKit.align.right) make.right.inset(edges);
                    else make.left.inset(edges);
                }
            }
        };
    }
    /**
     * 用于快速创建 BarButtonItem
     * @typedef {Object} BarButtonItemProperties
     * @property {string} title
     * @property {string} symbol
     * @property {Function} tapped
     * @property {Object} menu
     * @property {Object} events
     *
     * @param {BarButtonItemProperties} param0
     * @returns {BarButtonItem}
     */ static creat({ symbol , title: title3 , tapped , menu , events , align =UIKit.align.right  }) {
        const barButtonItem = new BarButtonItem();
        barButtonItem.setEvents(Object.assign({
            tapped: tapped
        }, events)).setAlign(align).setSymbol(symbol).setTitle(title3).setMenu(menu);
        return barButtonItem;
    }
}
class BarTitleView extends View {
    height = 20;
    topOffset = 15;
    bottomOffset = 10;
    controller = {
    };
    setController(controller) {
        this.controller = controller;
        return this;
    }
}
class SearchBar extends BarTitleView {
    height = 35;
    topOffset = 15;
    bottomOffset = 10;
    kbType = $kbType.search;
    placeholder = $l10n("SEARCH");
    constructor(args){
        super(args);
        this.setController(new SearchBarController());
        this.controller.setSearchBar(this);
        this.init();
    }
    init() {
        this.props = {
            id: this.id,
            smoothCorners: true,
            cornerRadius: 6,
            bgcolor: $color("#EEF1F1", "#212121")
        };
        this.views = [
            {
                type: "input",
                props: {
                    id: this.id + "-input",
                    type: this.kbType,
                    bgcolor: $color("clear"),
                    placeholder: this.placeholder
                },
                layout: $layout.fill,
                events: {
                    changed: (sender)=>this.controller.callEvent("onChange", sender.text)
                }
            }
        ];
        this.layout = (make, view)=>{
            make.height.equalTo(this.height);
            make.top.equalTo(view.super.safeArea).offset(this.topOffset);
            make.left.equalTo(view.super.safeArea).offset(15);
            make.right.equalTo(view.super.safeArea).offset(-15);
        };
    }
    setPlaceholder(placeholder) {
        this.placeholder = placeholder;
        return this;
    }
    setKbType(kbType) {
        this.kbType = kbType;
        return this;
    }
}
class SearchBarController extends Controller {
    setSearchBar(searchBar) {
        this.searchBar = searchBar;
        return this;
    }
    updateSelector() {
        this.selector = {
            inputBox: $(this.searchBar.id),
            input: $(this.searchBar.id + "-input")
        };
    }
    hide() {
        this.updateSelector();
        this.selector.inputBox.updateLayout((make)=>{
            make.height.equalTo(0);
        });
    }
    show() {
        this.updateSelector();
        this.selector.inputBox.updateLayout((make)=>{
            make.height.equalTo(this.searchBar.height);
        });
    }
    didScroll(contentOffset) {
        this.updateSelector();
        // 调整大小
        let height = this.searchBar.height - contentOffset;
        height = height > 0 ? height > this.searchBar.height ? this.searchBar.height : height : 0;
        this.selector.inputBox.updateLayout((make)=>{
            make.height.equalTo(height);
        });
        // 隐藏内容
        if (contentOffset > 0) {
            const alpha = (this.searchBar.height / 2 - 5 - contentOffset) / 10;
            this.selector.input.alpha = alpha;
        } else this.selector.input.alpha = 1;
    }
    didEndDragging(contentOffset, decelerate, scrollToOffset, zeroOffset) {
        this.updateSelector();
        if (contentOffset >= 0 && contentOffset <= this.searchBar.height) scrollToOffset($point(0, contentOffset >= this.searchBar.height / 2 ? this.searchBar.height - zeroOffset : -zeroOffset));
    }
}
class NavigationItem {
    static largeTitleDisplayModeAutomatic = 0;
    static largeTitleDisplayModeAlways = 1;
    static largeTitleDisplayModeNever = 2;
    rightButtons = [];
    leftButtons = [];
    hasbutton = false;
    largeTitleDisplayMode = NavigationItem.largeTitleDisplayModeAutomatic;
    largeTitleHeightOffset = 20;
    isPinTitleView = false;
    setTitle(title4) {
        this.title = title4;
        return this;
    }
    setTitleView(titleView) {
        this.titleView = titleView;
        return this;
    }
    pinTitleView() {
        this.isPinTitleView = true;
        return this;
    }
    setLargeTitleDisplayMode(mode) {
        this.largeTitleDisplayMode = mode;
        return this;
    }
    setFixedFooterView(fixedFooterView) {
        this.fixedFooterView = fixedFooterView;
        return this;
    }
    setBackgroundColor(backgroundColor) {
        this.backgroundColor = backgroundColor;
        return this;
    }
    /**
     *
     * @param {BarButtonItemProperties[]} buttons
     * @returns {this}
     */ setRightButtons(buttons) {
        buttons.forEach((button)=>this.addRightButton(button)
        );
        if (!this.hasbutton) this.hasbutton = true;
        return this;
    }
    /**
     *
     * @param {BarButtonItemProperties[]} buttons
     * @returns {this}
     */ setLeftButtons(buttons) {
        buttons.forEach((button)=>this.addLeftButton(button)
        );
        if (!this.hasbutton) this.hasbutton = true;
        return this;
    }
    /**
     *
     * @param {BarButtonItemProperties} param0
     * @returns {this}
     */ addRightButton({ symbol , title: title5 , tapped , menu , events  }) {
        this.rightButtons.push(BarButtonItem.creat({
            symbol,
            title: title5,
            tapped,
            menu,
            events,
            align: UIKit.align.right
        }).definition);
        if (!this.hasbutton) this.hasbutton = true;
        return this;
    }
    /**
     *
     * @param {BarButtonItemProperties} param0
     * @returns {this}
     */ addLeftButton({ symbol , title: title6 , tapped , menu , events  }) {
        this.leftButtons.push(BarButtonItem.creat({
            symbol,
            title: title6,
            tapped,
            menu,
            events,
            align: UIKit.align.left
        }).definition);
        if (!this.hasbutton) this.hasbutton = true;
        return this;
    }
    /**
     * 覆盖左侧按钮
     * @param {string} parent 父页面标题，将会显示为文本按钮
     * @param {Object} view 自定义按钮视图
     * @returns {this}
     */ addPopButton(parent, view1) {
        if (!parent) parent = $l10n("BACK");
        this.popButtonView = view1 ?? {
            // 返回按钮
            type: "button",
            props: {
                bgcolor: $color("clear"),
                symbol: "chevron.left",
                tintColor: UIKit.linkColor,
                title: ` ${parent}`,
                titleColor: UIKit.linkColor,
                font: $font("bold", 16)
            },
            layout: (make, view)=>{
                make.left.equalTo(view.super.safeArea).offset(BarButtonItem.edges);
                make.centerY.equalTo(view.super.safeArea);
            },
            events: {
                tapped: ()=>{
                    $ui.pop();
                }
            }
        };
        return this;
    }
    removePopButton() {
        this.popButtonView = undefined;
        return this;
    }
}
class NavigationBar extends View {
    static pageSheetNavigationBarHeight = 56;
    prefersLargeTitles = true;
    largeTitleFontSize = 34;
    largeTitleFontFamily = "bold";
    largeTitleFontHeight = $text.sizeThatFits({
        text: "A",
        width: 100,
        font: $font(this.largeTitleFontFamily, this.largeTitleFontSize)
    }).height;
    navigationBarTitleFontSize = 17;
    addStatusBarHeight = true;
    contentViewHeightOffset = 10;
    navigationBarNormalHeight = UIKit.NavigationBarNormalHeight;
    navigationBarLargeTitleHeight = UIKit.NavigationBarLargeTitleHeight;
    pageSheetMode() {
        this.navigationBarLargeTitleHeight -= this.navigationBarNormalHeight;
        this.navigationBarNormalHeight = NavigationBar.pageSheetNavigationBarHeight;
        this.navigationBarLargeTitleHeight += this.navigationBarNormalHeight;
        this.addStatusBarHeight = false;
        return this;
    }
    withStatusBarHeight() {
        this.addStatusBarHeight = true;
        return this;
    }
    withoutStatusBarHeight() {
        this.addStatusBarHeight = false;
        return this;
    }
    setNavigationItem(navigationItem) {
        this.navigationItem = navigationItem;
    }
    setBackgroundColor(backgroundColor) {
        this.backgroundColor = backgroundColor;
        return this;
    }
    setPrefersLargeTitles(bool) {
        this.prefersLargeTitles = bool;
        return this;
    }
    setContentViewHeightOffset(offset) {
        this.contentViewHeightOffset = offset;
        return this;
    }
    /**
     * 页面大标题
     */ getLargeTitleView() {
        return this.prefersLargeTitles && this.navigationItem.largeTitleDisplayMode !== NavigationItem.largeTitleDisplayModeNever ? {
            type: "label",
            props: {
                id: this.id + "-large-title",
                text: this.navigationItem.title,
                textColor: UIKit.textColor,
                align: $align.left,
                font: $font(this.largeTitleFontFamily, this.largeTitleFontSize),
                line: 1
            },
            layout: (make, view)=>{
                make.left.equalTo(view.super.safeArea).offset(15);
                make.height.equalTo(this.largeTitleFontHeight);
                make.top.equalTo(view.super.safeAreaTop).offset(this.navigationBarNormalHeight);
            }
        } : {
        };
    }
    getNavigationBarView() {
        const getButtonView = (buttons, align)=>{
            return buttons.length > 0 ? {
                type: "view",
                views: [
                    {
                        type: "view",
                        views: buttons,
                        layout: $layout.fill
                    }
                ],
                layout: (make, view)=>{
                    make.top.equalTo(view.super.safeAreaTop);
                    make.bottom.equalTo(view.super.safeAreaTop).offset(this.navigationBarNormalHeight);
                    if (align === UIKit.align.left) make.left.equalTo(view.super.safeArea);
                    else make.right.equalTo(view.super.safeArea);
                    make.width.equalTo(buttons.length * BarButtonItem.size.width);
                }
            } : {
            };
        };
        const rightButtonView = getButtonView(this.navigationItem.rightButtons, UIKit.align.right);
        const leftButtonView = this.navigationItem.popButtonView ?? getButtonView(this.navigationItem.leftButtons, UIKit.align.left);
        const isHideBackground = this.prefersLargeTitles;
        const isHideTitle = !this.prefersLargeTitles || this.navigationItem.largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeNever;
        return {
            // 顶部 bar
            type: "view",
            props: {
                id: this.id + "-navigation",
                bgcolor: $color("clear")
            },
            layout: (make, view)=>{
                make.left.top.right.inset(0);
                make.bottom.equalTo(view.super.safeAreaTop).offset(this.navigationBarNormalHeight);
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
                {
                    // 标题
                    type: "label",
                    props: {
                        id: this.id + "-small-title",
                        alpha: isHideTitle ? 1 : 0,
                        text: this.navigationItem.title,
                        font: $font(this.largeTitleFontFamily, this.navigationBarTitleFontSize),
                        align: $align.center,
                        bgcolor: $color("clear"),
                        textColor: UIKit.textColor
                    },
                    layout: (make, view)=>{
                        make.left.right.inset(0);
                        make.height.equalTo(20);
                        make.centerY.equalTo(view.super.safeArea);
                    }
                }
            ].concat(rightButtonView, leftButtonView)
        };
    }
}
class NavigationController extends Controller {
    static largeTitleViewSmallMode = 0;
    static largeTitleViewLargeMode = 1;
    navigationBar = new NavigationBar();
    largeTitleScrollTrigger = this.navigationBar.navigationBarNormalHeight;
    updateSelector() {
        this.selector = {
            navigation: $(this.navigationBar.id + "-navigation"),
            largeTitleView: $(this.navigationBar.id + "-large-title"),
            smallTitleView: $(this.navigationBar.id + "-small-title"),
            underlineView: this.navigationBar?.navigationItem?.isPinTitleView ? $(this.navigationBar.id + "-title-view-underline") : $(this.navigationBar.id + "-underline"),
            largeTitleMaskView: $(this.navigationBar.id + "-large-title-mask"),
            backgroundView: $(this.navigationBar.id + "-background"),
            titleViewBackgroundView: $(this.navigationBar.id + "-title-view-background")
        };
    }
    toNormal(permanent = true) {
        this.updateSelector();
        $ui.animate({
            duration: 0.2,
            animation: ()=>{
                // 显示下划线和背景
                this.selector.underlineView.alpha = 1;
                this.selector.backgroundView.hidden = false;
                // 隐藏大标题，显示小标题
                this.selector.smallTitleView.alpha = 1;
                this.selector.largeTitleView.alpha = 0;
            }
        });
        if (permanent && this.navigationBar?.navigationItem) this.navigationBar.navigationItem.largeTitleDisplayMode = NavigationItem.largeTitleDisplayModeNever;
    }
    toLargeTitle(permanent = true) {
        this.updateSelector();
        this.selector.underlineView.alpha = 0;
        this.selector.backgroundView.hidden = true;
        $ui.animate({
            duration: 0.2,
            animation: ()=>{
                this.selector.smallTitleView.alpha = 0;
                this.selector.largeTitleView.alpha = 1;
            }
        });
        if (permanent && this.navigationBar?.navigationItem) this.navigationBar.navigationItem.largeTitleDisplayMode = NavigationItem.largeTitleDisplayModeAlways;
    }
     #changeLargeTitleView(largeTitleViewMode) {
        const isSmallMode = largeTitleViewMode === NavigationController.largeTitleViewSmallMode;
        $ui.animate({
            duration: 0.2,
            animation: ()=>{
                // 隐藏大标题，显示小标题
                this.selector.smallTitleView.alpha = isSmallMode ? 1 : 0;
                this.selector.largeTitleView.alpha = isSmallMode ? 0 : 1;
            }
        });
    }
     #largeTitleScrollAction(contentOffset) {
        const titleSizeMax = 40 // 下拉放大字体最大值
        ;
        // 标题跟随
        this.selector.largeTitleView.updateLayout((make, view)=>{
            if (this.navigationBar.navigationBarNormalHeight - contentOffset > 0) // 标题上移致隐藏后停止移动
            make.top.equalTo(view.super.safeAreaTop).offset(this.navigationBar.navigationBarNormalHeight - contentOffset);
            else make.top.equalTo(view.super.safeAreaTop).offset(0);
        });
        if (contentOffset > 0) {
            if (contentOffset >= this.largeTitleScrollTrigger) this.#changeLargeTitleView(NavigationController.largeTitleViewSmallMode);
            else this.#changeLargeTitleView(NavigationController.largeTitleViewLargeMode);
        } else {
            // 切换模式
            this.#changeLargeTitleView(NavigationController.largeTitleViewLargeMode);
            // 下拉放大字体
            let size = this.navigationBar.largeTitleFontSize - contentOffset * 0.04;
            if (size > titleSizeMax) size = titleSizeMax;
            this.selector.largeTitleView.font = $font(this.navigationBar.largeTitleFontFamily, size);
        }
    }
     #navigationBarScrollAction(contentOffset1) {
        if (this.navigationBar?.navigationItem?.isPinTitleView) {
            // titleView 背景
            if (this.navigationBar.navigationBarNormalHeight - contentOffset1 > 0) this.selector.titleViewBackgroundView.hidden = true;
            else this.selector.titleViewBackgroundView.hidden = false;
        }
        let trigger = this.navigationBar.navigationItem.largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeNever ? 5 : this.largeTitleScrollTrigger;
        if (contentOffset1 > trigger) {
            // 隐藏遮罩
            this.selector.largeTitleMaskView.hidden = true;
            $ui.animate({
                duration: 0.2,
                animation: ()=>{
                    // 显示下划线和背景
                    this.selector.underlineView.alpha = 1;
                    this.selector.backgroundView.hidden = false;
                }
            });
        } else {
            const contentViewBackgroundColor = this.selector.largeTitleView?.prev.bgcolor;
            this.selector.largeTitleMaskView.bgcolor = contentViewBackgroundColor;
            this.selector.largeTitleMaskView.hidden = false;
            // 隐藏背景
            this.selector.underlineView.alpha = 0;
            this.selector.backgroundView.hidden = true;
        }
    }
    didScroll(contentOffset2) {
        if (!this.navigationBar.prefersLargeTitles) return;
        const largeTitleDisplayMode = this.navigationBar?.navigationItem.largeTitleDisplayMode;
        if (largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeAlways) return;
        this.updateSelector();
        if (largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeAutomatic) {
            if (!this.navigationBar?.navigationItem?.isPinTitleView) {
                // titleView didScroll
                this.navigationBar?.navigationItem?.titleView?.controller.didScroll(contentOffset2);
                // 在 titleView 折叠前锁住主要视图
                if (contentOffset2 > 0) {
                    const height = this.navigationBar?.navigationItem?.titleView?.height ?? 0;
                    contentOffset2 -= height;
                    if (contentOffset2 < 0) contentOffset2 = 0;
                }
            }
            this.#largeTitleScrollAction(contentOffset2);
            this.#navigationBarScrollAction(contentOffset2);
        } else if (largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeNever) this.#navigationBarScrollAction(contentOffset2);
    }
    didEndDragging(contentOffset3, decelerate, scrollToOffset, zeroOffset) {
        if (!this.navigationBar.prefersLargeTitles) return;
        const largeTitleDisplayMode = this.navigationBar?.navigationItem.largeTitleDisplayMode;
        if (largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeAlways) return;
        this.updateSelector();
        if (largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeAutomatic) {
            let titleViewHeight = 0;
            if (!this.navigationBar?.navigationItem?.isPinTitleView) {
                // titleView didEndDragging
                this.navigationBar?.navigationItem?.titleView?.controller.didEndDragging(contentOffset3, decelerate, scrollToOffset, zeroOffset);
                titleViewHeight = this.navigationBar?.navigationItem?.titleView?.height ?? 0;
                contentOffset3 -= titleViewHeight;
            }
            if (contentOffset3 >= 0 && contentOffset3 <= this.navigationBar.largeTitleFontHeight) scrollToOffset($point(0, contentOffset3 >= this.navigationBar.largeTitleFontHeight / 2 ? this.navigationBar.navigationBarNormalHeight + titleViewHeight - zeroOffset : titleViewHeight - zeroOffset));
        }
    }
}
class FixedFooterView extends View {
    height = 60;
    getView() {
        this.type = "view";
        this.setProp("bgcolor", UIKit.primaryViewBackgroundColor);
        this.layout = (make, view)=>{
            make.left.right.bottom.equalTo(view.super);
            make.top.equalTo(view.super.safeAreaBottom).offset(-this.height);
        };
        this.views = [
            View.create({
                props: this.props,
                views: this.views,
                layout: (make, view)=>{
                    make.left.right.top.equalTo(view.super);
                    make.height.equalTo(this.height);
                }
            })
        ];
        return this;
    }
}
class PageView extends View {
    constructor(args = {
    }){
        super(args);
        this.activeStatus = true;
    }
    show() {
        $(this.props.id).hidden = false;
        this.activeStatus = true;
    }
    hide() {
        $(this.props.id).hidden = true;
        this.activeStatus = false;
    }
    setHorizontalSafeArea(bool) {
        this.horizontalSafeArea = bool;
        return this;
    }
     #layout(make, view) {
        make.top.bottom.equalTo(view.super);
        if (this.horizontalSafeArea) make.left.right.equalTo(view.super.safeArea);
        else make.left.right.equalTo(view.super);
    }
    getView() {
        this.layout = this.#layout;
        this.props.clipsToBounds = true;
        this.props.hidden = !this.activeStatus;
        return super.getView();
    }
}
class PageControllerViewTypeError extends ValidationError {
    constructor(parameter, type){
        super(parameter, type);
        this.name = "PageControllerViewTypeError";
    }
}
class PageController extends Controller {
    page;
    navigationItem = new NavigationItem();
    navigationController = new NavigationController();
    constructor(){
        super();
        this.navigationController.navigationBar.setNavigationItem(this.navigationItem);
    }
    /**
     *
     * @param {Object} view
     * @returns {this}
     */ setView(view2) {
        if (typeof view2 !== "object") throw new PageControllerViewTypeError("view", "object");
        this.view = View.create(view2);
        return this;
    }
    bindScrollEvents() {
        if (!(this.view instanceof View)) throw new PageControllerViewTypeError("view", "View");
        // 计算偏移高度
        let height = this.navigationController.navigationBar.contentViewHeightOffset;
        if (this.navigationItem.titleView) {
            height += this.navigationItem.titleView.topOffset;
            height += this.navigationItem.titleView.height;
            height += this.navigationItem.titleView.bottomOffset;
        }
        if (this.view.props.stickyHeader) height += this.navigationController.navigationBar.largeTitleFontHeight;
        else if (this.navigationItem.largeTitleDisplayMode === NavigationItem.largeTitleDisplayModeNever) height += this.navigationController.navigationBar.navigationBarNormalHeight;
        else height += this.navigationController.navigationBar.navigationBarLargeTitleHeight;
        // 修饰视图顶部偏移
        if (this.view.props.header) this.view.props.header = {
            type: "view",
            props: {
                height: height + (this.view.props.header?.props?.height ?? 0)
            },
            views: [
                {
                    type: "view",
                    props: {
                        clipsToBounds: true
                    },
                    views: [
                        this.view.props.header
                    ],
                    layout: (make1, view3)=>{
                        make1.top.inset(height);
                        make1.height.equalTo(this.view.props.header?.props?.height ?? 0);
                        make1.width.equalTo(view3.super);
                    }
                }
            ]
        };
        else this.view.props.header = {
            props: {
                height: height
            }
        };
        // 修饰视图底部偏移
        if (!this.view.props.footer) this.view.props.footer = {
        };
        this.view.props.footer.props = Object.assign(this.view.props.footer.props ?? {
        }, {
            height: (this.navigationItem.fixedFooterView?.height ?? 0) + (this.view.props.footer.props?.height ?? 0)
        });
        // 重写布局
        if (UIKit.scrollViewList.indexOf(this.view.type) === -1) // 非滚动视图
        this.view.layout = (make2, view4)=>{
            make2.left.right.equalTo(view4.super.safeArea);
            make2.bottom.equalTo(view4.super);
            let topOffset = this.navigationController.navigationBar.contentViewHeightOffset;
            if (this.navigationItem.largeTitleDisplayMode !== NavigationItem.largeTitleDisplayModeNever) topOffset += this.navigationController.navigationBar.largeTitleFontHeight;
            if (this.navigationItem.titleView) topOffset += this.navigationItem.titleView.topOffset + this.navigationItem.titleView.bottomOffset;
            if ((!UIKit.isHorizontal || UIKit.isLargeScreen) && this.navigationController.navigationBar.addStatusBarHeight) topOffset += UIKit.statusBarHeight;
            make2.top.equalTo(this.navigationController.navigationBar.navigationBarNormalHeight + topOffset);
        };
        else {
            // indicatorInsets
            const pinTitleViewOffset = this.navigationItem.isPinTitleView ? this.navigationItem.titleView.height + this.navigationItem.titleView.bottomOffset + this.navigationController.navigationBar.contentViewHeightOffset : 0;
            if (this.view.props.indicatorInsets) {
                const old = this.view.props.indicatorInsets;
                this.view.props.indicatorInsets = $insets(old.top + this.navigationController.navigationBar.navigationBarNormalHeight + pinTitleViewOffset, old.left, old.bottom + (this.navigationItem.fixedFooterView?.height ?? 0), old.right);
            } else this.view.props.indicatorInsets = $insets(this.navigationController.navigationBar.navigationBarNormalHeight + pinTitleViewOffset, 0, this.navigationItem.fixedFooterView?.height ?? 0, 0);
            // layout
            this.view.layout = (make3, view5)=>{
                if (this.view.props.stickyHeader) make3.top.equalTo(view5.super.safeArea).offset(this.navigationController.navigationBar.navigationBarNormalHeight);
                else make3.top.equalTo(view5.super);
                make3.left.right.equalTo(view5.super.safeArea);
                make3.bottom.equalTo(view5.super);
            };
            // 重写滚动事件
            this.view.assignEvent("didScroll", (sender)=>{
                let contentOffset4 = sender.contentOffset.y;
                if ((!UIKit.isHorizontal || UIKit.isLargeScreen) && this.navigationController.navigationBar.addStatusBarHeight && !this.view.props.stickyHeader) contentOffset4 += UIKit.statusBarHeight;
                this.navigationController.didScroll(contentOffset4);
            }).assignEvent("didEndDragging", (sender, decelerate)=>{
                let contentOffset5 = sender.contentOffset.y;
                let zeroOffset = 0;
                if ((!UIKit.isHorizontal || UIKit.isLargeScreen) && this.navigationController.navigationBar.addStatusBarHeight && !this.view.props.stickyHeader) {
                    contentOffset5 += UIKit.statusBarHeight;
                    zeroOffset = UIKit.statusBarHeight;
                }
                this.navigationController.didEndDragging(contentOffset5, decelerate, (...args)=>sender.scrollToOffset(...args)
                , zeroOffset);
            }).assignEvent("didEndDecelerating", (...args)=>{
                if (args[0].tracking) return;
                this.view.events?.didEndDragging(...args);
            });
        }
    }
    initPage() {
        if (this.navigationController.navigationBar.prefersLargeTitles) {
            this.bindScrollEvents();
            let titleView = {
            };
            if (this.navigationItem.titleView) {
                // 修改 titleView 背景与 navigationBar 相同
                const isHideBackground = this.navigationController.navigationBar.prefersLargeTitles;
                titleView = View.create({
                    views: [
                        this.navigationController.navigationBar.backgroundColor ? {
                            type: "view",
                            props: {
                                hidden: isHideBackground,
                                bgcolor: this.navigationController.navigationBar.backgroundColor,
                                id: this.navigationController.navigationBar.id + "-title-view-background"
                            },
                            layout: $layout.fill
                        } : UIKit.blurBox({
                            hidden: isHideBackground,
                            id: this.navigationController.navigationBar.id + "-title-view-background"
                        }),
                        UIKit.separatorLine({
                            id: this.navigationController.navigationBar.id + "-title-view-underline",
                            alpha: isHideBackground ? 0 : 1
                        }),
                        this.navigationItem.titleView.definition
                    ],
                    layout: (make4, view6)=>{
                        make4.top.equalTo(view6.prev.bottom);
                        make4.width.equalTo(view6.super);
                        make4.height.equalTo(this.navigationItem.titleView.topOffset + this.navigationItem.titleView.height + this.navigationItem.titleView.bottomOffset);
                    }
                });
            }
            // 初始化 PageView
            this.page = PageView.createByViews([
                this.view,
                this.navigationController.navigationBar.getLargeTitleView(),
                titleView,
                this.navigationController.navigationBar.getNavigationBarView(),
                this.navigationItem.fixedFooterView?.definition ?? {
                }
            ]);
        } else this.page = PageView.createByViews([
            this.view
        ]);
        if (this.view.props?.bgcolor) this.page.setProp("bgcolor", this.view.props.bgcolor);
        else this.page.setProp("bgcolor", UIKit.defaultBackgroundColor(this.view.type));
        return this;
    }
    getPage() {
        if (!this.page) this.initPage();
        return this.page;
    }
}
class TabBarCellView extends View {
    constructor(args = {
    }){
        super(args);
        this.setIcon(args.icon);
        this.setTitle(args.title);
        if (args.activeStatus !== undefined) this.activeStatus = args.activeStatus;
    }
    setIcon(icon) {
        // 格式化单个icon和多个icon
        if (icon instanceof Array) this.icon = icon;
        else this.icon = [
            icon,
            icon
        ];
        return this;
    }
    setTitle(title7) {
        this.title = title7;
        return this;
    }
    active() {
        $(`${this.props.id}-icon`).image = $image(this.icon[1]);
        $(`${this.props.id}-icon`).tintColor = $color("systemLink");
        $(`${this.props.id}-title`).textColor = $color("systemLink");
        this.activeStatus = true;
    }
    inactive() {
        $(`${this.props.id}-icon`).image = $image(this.icon[0]);
        $(`${this.props.id}-icon`).tintColor = $color("lightGray");
        $(`${this.props.id}-title`).textColor = $color("lightGray");
        this.activeStatus = false;
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
                layout: (make5, view7)=>{
                    make5.centerX.equalTo(view7.super);
                    const half = TabBarController.tabBarHeight / 2;
                    make5.size.equalTo(half);
                    make5.top.inset((TabBarController.tabBarHeight - half - 13) / 2);
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
                layout: (make6, view8)=>{
                    make6.centerX.equalTo(view8.prev);
                    make6.top.equalTo(view8.prev.bottom).offset(3);
                }
            }
        ];
        return this;
    }
}
class TabBarHeaderView extends View {
    height = 60;
    getView() {
        this.type = "view";
        this.setProp("bgcolor", this.props.bgcolor ?? UIKit.primaryViewBackgroundColor);
        this.layout = (make7, view9)=>{
            make7.left.right.bottom.equalTo(view9.super);
            make7.top.equalTo(view9.super.safeAreaBottom).offset(-this.height - TabBarController.tabBarHeight);
        };
        this.views = [
            View.create({
                props: this.props,
                views: this.views,
                layout: (make8, view10)=>{
                    make8.left.right.top.equalTo(view10.super);
                    make8.height.equalTo(this.height);
                }
            })
        ];
        return this;
    }
}
/**
 * @property {function(from: string, to: string)} TabBarController.events.onChange
 */ class TabBarController extends Controller {
    static tabBarHeight = 50;
    #pages = {
    };
    #cells = {
    };
    #header;
    #selected;
    get selected() {
        return this.#selected;
    }
    set selected(selected) {
        this.switchPageTo(selected);
    }
    get contentOffset() {
        return TabBarController.tabBarHeight + (this.#header?.height ?? 0);
    }
    /**
     *
     * @param {Object} pages
     * @returns {this}
     */ setPages(pages = {
    }) {
        Object.keys(pages).forEach((key)=>this.setPage(key, pages[key])
        );
        return this;
    }
    setPage(key, page) {
        if (this.#selected === undefined) this.#selected = key;
        if (page instanceof PageView) this.#pages[key] = page;
        else this.#pages[key] = PageView.createByViews(page);
        if (this.#selected !== key) this.#pages[key].activeStatus = false;
        return this;
    }
    switchPageTo(key) {
        if (this.#pages[key]) {
            if (this.#selected === key) return;
            // menu 动画
            $ui.animate({
                duration: 0.4,
                animation: ()=>{
                    // 点击的图标
                    this.#cells[key].active();
                }
            });
            // 之前的图标
            this.#cells[this.#selected].inactive();
            // 切换页面
            this.#pages[this.#selected].hide();
            this.#pages[key].show();
            this.callEvent("onChange", this.#selected, key);
            this.#selected = key;
        }
    }
    /**
     *
     * @param {Object} cells
     * @returns {this}
     */ setCells(cells = {
    }) {
        Object.keys(cells).forEach((key)=>this.setCell(key, cells[key])
        );
        return this;
    }
    setCell(key, cell) {
        if (this.#selected === undefined) this.#selected = key;
        if (!(cell instanceof TabBarCellView)) cell = new TabBarCellView({
            props: {
                info: {
                    key
                }
            },
            icon: cell.icon,
            title: cell.title,
            activeStatus: this.#selected === key
        });
        this.#cells[key] = cell;
        return this;
    }
    setHeader(view11) {
        this.#header = view11;
        return this;
    }
     #cellViews() {
        const views = [];
        Object.values(this.#cells).forEach((cell)=>{
            cell.setEvent("tapped", (sender)=>{
                const key = sender.info.key;
                // 切换页面
                this.switchPageTo(key);
            });
            views.push(cell.getView());
        });
        return views;
    }
     #pageViews() {
        return Object.values(this.#pages).map((page)=>{
            const view12 = page.definition;
            if (UIKit.scrollViewList.indexOf(view12.views[0].type) > -1) {
                if (view12.views[0].props === undefined) view12.views[0].props = {
                };
                // indicatorInsets
                if (view12.views[0].props.indicatorInsets) {
                    const old = view12.views[0].props.indicatorInsets;
                    view12.views[0].props.indicatorInsets = $insets(old.top, old.left, old.bottom + this.contentOffset, old.right);
                } else view12.views[0].props.indicatorInsets = $insets(0, 0, 0, this.contentOffset);
                // footer
                if (view12.views[0].footer === undefined) view12.views[0].footer = {
                    props: {
                    }
                };
                else if (view12.views[0].footer.props === undefined) view12.views[0].footer.props = {
                };
                if (view12.views[0].props.footer.props.height) view12.views[0].props.footer.props.height += this.contentOffset;
                else view12.views[0].props.footer.props.height = this.contentOffset;
            }
            return view12;
        });
    }
    generateView() {
        const tabBarView = {
            type: "view",
            layout: (make9, view13)=>{
                make9.centerX.equalTo(view13.super);
                make9.width.equalTo(view13.super);
                make9.top.equalTo(view13.super.safeAreaBottom).offset(-TabBarController.tabBarHeight);
                make9.bottom.equalTo(view13.super);
            },
            views: [
                UIKit.blurBox({
                }, [
                    {
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
                    }
                ]),
                UIKit.separatorLine({
                }, UIKit.align.top)
            ]
        };
        return View.createByViews(this.#pageViews().concat(this.#header?.definition ?? [], tabBarView));
    }
}
class Kernel {
    startTime = Date.now();
    version = VERSION;
    // 隐藏 jsbox 默认 nav 栏
    isUseJsboxNav = false;
    constructor(){
        if ($app.isDebugging) this.debug();
    }
    uuid() {
        return uuid();
    }
    l10n(language, content, override = true) {
        l10n(language, content, override);
    }
    debug(print, error) {
        this.debugMode = true;
        $app.idleTimerDisabled = true;
        if (typeof print === "function") this.debugPrint = print;
        if (typeof error === "function") this.debugError = error;
        this.print("You are running EasyJsBox in debug mode.");
    }
    print(message) {
        if (!this.debugMode) return;
        if (typeof this.debugPrint === "function") this.debugPrint(message);
        else console.log(message);
    }
    error(error) {
        if (!this.debugMode) return;
        if (typeof this.debugError === "function") this.debugError(error);
        else console.error(error);
    }
    useJsboxNav() {
        this.isUseJsboxNav = true;
        return this;
    }
    setTitle(title8) {
        if (this.isUseJsboxNav) $ui.title = title8;
        this.title = title8;
    }
    setNavButtons(buttons) {
        this.navButtons = buttons;
    }
    UIRender(view14) {
        try {
            view14.props = Object.assign({
                title: this.title,
                navBarHidden: !this.isUseJsboxNav,
                navButtons: this.navButtons ?? [],
                statusBarStyle: 0
            }, view14.props);
            if (!view14.events) view14.events = {
            };
            const oldLayoutSubviews = view14.events.layoutSubviews;
            view14.events.layoutSubviews = ()=>{
                $app.notify({
                    name: "interfaceOrientationEvent",
                    object: {
                        statusBarOrientation: UIKit.statusBarOrientation,
                        isHorizontal: UIKit.isHorizontal
                    }
                });
                if (typeof oldLayoutSubviews === "function") oldLayoutSubviews();
            };
            $ui.render(view14);
        } catch (error) {
            this.print(error);
        }
    }
    async checkUpdate(callback) {
        const branche = "master" // 更新版本，可选 master, dev
        ;
        const res = await $http.get(`https://raw.githubusercontent.com/ipuppet/EasyJsBox/${branche}/src/easy-jsbox.js`);
        if (res.error) throw res.error;
        const firstLine = res.data.split("\n")[0];
        const latestVersion = firstLine.slice(16).replaceAll('"', "");
        if (versionCompare(latestVersion, VERSION) > 0) {
            if (typeof callback === "function") callback(res.data);
        }
    }
}
class UILoading {
    #labelId;
    text = "";
    interval;
    fullScreen = false;
    #loop = ()=>{
    };
    constructor(){
        this.#labelId = uuid();
    }
    updateText(text) {
        $(this.#labelId).text = text;
    }
    setLoop(loop) {
        if (typeof loop !== "function") throw "loop must be a function";
        this.#loop = loop;
    }
    done() {
        clearInterval(this.interval);
    }
    load() {
        $ui.render({
            props: {
                navBarHidden: this.fullScreen
            },
            views: [
                {
                    type: "spinner",
                    props: {
                        loading: true
                    },
                    layout: (make10, view15)=>{
                        make10.centerY.equalTo(view15.super).offset(-15);
                        make10.width.equalTo(view15.super);
                    }
                },
                {
                    type: "label",
                    props: {
                        id: this.#labelId,
                        align: $align.center,
                        text: ""
                    },
                    layout: (make11, view16)=>{
                        make11.top.equalTo(view16.prev.bottom).offset(10);
                        make11.left.right.equalTo(view16.super);
                    }
                }
            ],
            layout: $layout.fill,
            events: {
                appeared: ()=>{
                    this.interval = setInterval(()=>{
                        this.#loop();
                    }, 100);
                }
            }
        });
    }
}
class FileStorageParameterError extends Error {
    constructor(parameter){
        super(`Parameter [${parameter}] is required.`);
        this.name = "FileStorageParameterError";
    }
}
class FileStorageFileNotFoundError extends Error {
    constructor(filePath){
        super(`File not found: ${filePath}`);
        this.name = "FileStorageFileNotFoundError";
    }
}
class FileStorage {
    basePath;
    constructor({ basePath ="storage"  } = {
    }){
        this.basePath = basePath;
        this.#createDirectory(this.basePath);
    }
     #createDirectory(path) {
        if (!$file.isDirectory(path)) $file.mkdir(path);
    }
     #filePath(path1 = "", fileName) {
        path1 = `${this.basePath}/${path1.trim("/")}`.trim("/");
        this.#createDirectory(path1);
        path1 = `${path1}/${fileName}`;
        return path1;
    }
    write(path2 = "", fileName1, data) {
        if (!fileName1) throw new FileStorageParameterError("fileName");
        if (!data) throw new FileStorageParameterError("data");
        return $file.write({
            data: data,
            path: this.#filePath(path2, fileName1)
        });
    }
    writeSync(path3 = "", fileName2, data) {
        return new Promise((resolve, reject)=>{
            try {
                const success = this.write(path3, fileName2, data);
                if (success) resolve(success);
                else reject(success);
            } catch (error) {
                reject(error);
            }
        });
    }
    exists(path4 = "", fileName3) {
        if (!fileName3) throw new FileStorageParameterError("fileName");
        path4 = this.#filePath(path4, fileName3);
        if ($file.exists(path4)) return path4;
        return false;
    }
    read(path5 = "", fileName4) {
        if (!fileName4) throw new FileStorageParameterError("fileName");
        path5 = this.#filePath(path5, fileName4);
        if (!$file.exists(path5)) throw new FileStorageFileNotFoundError(path5);
        if ($file.isDirectory(path5)) return $file.list(path5);
        return $file.read(path5);
    }
    readSync(path6 = "", fileName5) {
        return new Promise((resolve, reject)=>{
            try {
                const file = this.read(path6, fileName5);
                if (file) resolve(file);
                else reject();
            } catch (error) {
                reject(error);
            }
        });
    }
    readAsJSON(path7 = "", fileName6, _default = null) {
        try {
            const fileString = this.read(path7, fileName6)?.string;
            return JSON.parse(fileString);
        } catch (error) {
            return _default;
        }
    }
    static readFromRoot(path8) {
        if (!path8) throw new FileStorageParameterError("path");
        if (!$file.exists(path8)) throw new FileStorageFileNotFoundError(path8);
        if ($file.isDirectory(path8)) return $file.list(path8);
        return $file.read(path8);
    }
    static readFromRootSync(path9 = "") {
        return new Promise((resolve, reject)=>{
            try {
                const file = FileStorage.readFromRoot(path9);
                if (file) resolve(file);
                else reject();
            } catch (error) {
                reject(error);
            }
        });
    }
    static readFromRootAsJSON(path10 = "", _default = null) {
        try {
            const fileString = FileStorage.readFromRoot(path10)?.string;
            return JSON.parse(fileString);
        } catch (error) {
            return _default;
        }
    }
    delete(path11 = "", fileName7 = "") {
        return $file.delete(this.#filePath(path11, fileName7));
    }
}
class SettingLoadConfigError extends Error {
    constructor(){
        super("Call loadConfig() first.");
        this.name = "SettingLoadConfigError";
    }
}
class SettingReadonlyError extends Error {
    constructor(){
        super("Attempted to assign to readonly property.");
        this.name = "SettingReadonlyError";
    }
}
/**
 * @property {function(key: string, value: any)} Setting.events.onSet 键值发生改变
 * @property {function(view: Object,title: string)} Setting.events.onChildPush 进入的子页面
 */ class Setting extends Controller {
    name;
    // 存储数据
    setting = {
    };
    // 初始用户数据，若未定义则尝试从给定的文件读取
    userData;
    // fileStorage
    fileStorage;
    imagePath;
    // 用来控制 child 类型
    viewController = new ViewController();
    // 用于存放 script 类型用到的方法
    method = {
    };
    // style
    rowHeight = 50;
    edgeOffset = 10;
    iconSize = 30;
    // withTouchEvents 延时自动关闭高亮，防止 touchesMoved 事件未正常调用
    #withTouchEventsT = {
    };
    // read only
    #readonly = false;
    // 判断是否已经加载数据加载
    #loadConfigStatus = false;
    #footer;
    /**
     *
     * @param {Object} args
     * @param {Function} args.set 自定义 set 方法，定义后将忽略 fileStorage 和 dataFile
     * @param {Function} args.get 自定义 get 方法，定义后将忽略 fileStorage 和 dataFile
     * @param {Object} args.userData 初始用户数据，定义后将忽略 fileStorage 和 dataFile
     * @param {FileStorage} args.fileStorage FileStorage 对象，用于文件操作
     * @param {string} args.dataFile 持久化数据保存文件
     * @param {Object} args.structure 设置项结构
     * @param {string} args.structurePath 结构路径，优先级低于 structure
     * @param {boolean} args.isUseJsboxNav 是否使用 JSBox 默认 nav 样式
     * @param {string} args.name 唯一名称，默认分配一个 UUID
     */ constructor(args = {
    }){
        super();
        // set 和 get 同时设置才会生效
        if (typeof args.set === "function" && typeof args.get === "function") {
            this.set = args.set;
            this.get = args.get;
            this.userData = args.userData;
        } else {
            this.fileStorage = args.fileStorage ?? new FileStorage();
            this.dataFile = args.dataFile ?? "setting.json";
        }
        if (args.structure) this.setStructure(args.structure) // structure 优先级高于 structurePath
        ;
        else this.setStructurePath(args.structurePath ?? "setting.json");
        this.isUseJsboxNav = args.isUseJsboxNav ?? false;
        // 不能使用 uuid
        this.imagePath = (args.name ?? "default") + ".image";
        this.setName(args.name ?? uuid());
        // l10n
        this.loadL10n();
    }
    useJsboxNav() {
        this.isUseJsboxNav = true;
        return this;
    }
     #checkLoadConfigError() {
        if (!this.#loadConfigStatus) throw new SettingLoadConfigError();
    }
    /**
     * 从 this.structure 加载数据
     * @returns {this}
     */ loadConfig() {
        const exclude = [
            "script",
            "info"
        ];
        const userData = this.userData ?? this.fileStorage.readAsJSON("", this.dataFile, {
        });
        function setValue(structure) {
            const setting = {
            };
            for (let section of structure)for (let item of section.items){
                if (item.type === "child") {
                    const child = setValue(item.children);
                    Object.assign(setting, child);
                } else if (exclude.indexOf(item.type) === -1) setting[item.key] = item.key in userData ? userData[item.key] : item.value;
                else // 被排除的项目直接赋值
                setting[item.key] = item.value;
            }
            return setting;
        }
        this.setting = setValue(this.structure);
        this.#loadConfigStatus = true;
        return this;
    }
    hasSectionTitle(structure) {
        this.#checkLoadConfigError();
        return structure[0]["title"] ? true : false;
    }
    loadL10n() {
        l10n("zh-Hans", `
            "OK" = "好";
            "CANCEL" = "取消";
            "CLEAR" = "清除";
            "BACK" = "返回";
            "ERROR" = "发生错误";
            "SUCCESS" = "成功";
            "LOADING" = "加载中";
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
            "IMAGE_BASE64" = "图片 / base64";

            "PREVIEW" = "预览";
            "SELECT_IMAGE" = "选择图片";
            "CLEAR_IMAGE" = "清除图片";
            "NO_IMAGE" = "无图片";
            
            "ABOUT" = "关于";
            "VERSION" = "Version";
            "AUTHOR" = "作者";
            "AT_BOTTOM" = "已经到底啦~";
            `, false);
        l10n("en", `
            "OK" = "OK";
            "CANCEL" = "Cancel";
            "CLEAR" = "Clear";
            "BACK" = "Back";
            "ERROR" = "Error";
            "SUCCESS" = "Success";
            "LOADING" = "Loading";
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
            "IMAGE_BASE64" = "Image / base64";

            "PREVIEW" = "Preview";
            "SELECT_IMAGE" = "Select Image";
            "CLEAR_IMAGE" = "Clear Image";
            "NO_IMAGE" = "No Image";

            "ABOUT" = "About";
            "VERSION" = "Version";
            "AUTHOR" = "Author";
            "AT_BOTTOM" = "It's the end~";
            `, false);
    }
    setUserData(userData) {
        this.userData = userData;
    }
    setStructure(structure) {
        this.structure = structure;
        return this;
    }
    /**
     * 设置结构文件目录。
     * 若调用了 setStructure(structure) 或构造函数传递了 structure 数据，则不会加载结构文件
     * @param {string} structurePath
     * @returns {this}
     */ setStructurePath(structurePath) {
        if (!this.structure) this.setStructure(FileStorage.readFromRootAsJSON(structurePath));
        return this;
    }
    /**
     * 设置一个独一无二的名字，防止多个 Setting 导致 UI 冲突
     * @param {string} name 名字
     */ setName(name) {
        this.name = name;
        return this;
    }
    setFooter(footer) {
        this.#footer = footer;
        return this;
    }
    set footer(footer) {
        this.#footer = footer;
    }
    get footer() {
        if (this.#footer === undefined) {
            const info = $app.info;
            this.#footer = info.version && info.author ? {
                type: "view",
                props: {
                    height: 130
                },
                views: [
                    {
                        type: "label",
                        props: {
                            font: $font(14),
                            text: `${$l10n("VERSION")} ${info.version} ♥ ${info.author}`,
                            textColor: $color({
                                light: "#C0C0C0",
                                dark: "#545454"
                            }),
                            align: $align.center
                        },
                        layout: (make12)=>{
                            make12.left.right.inset(0);
                            make12.top.inset(10);
                        }
                    }
                ]
            } : {
            };
        }
        return this.#footer;
    }
    setReadonly() {
        this.#readonly = true;
        return this;
    }
    set(key, value) {
        if (this.#readonly) throw new SettingReadonlyError();
        this.#checkLoadConfigError();
        this.setting[key] = value;
        this.fileStorage.write("", this.dataFile, $data({
            string: JSON.stringify(this.setting)
        }));
        this.callEvent("onSet", key, value);
        return true;
    }
    get(key, _default = null) {
        this.#checkLoadConfigError();
        if (Object.prototype.hasOwnProperty.call(this.setting, key)) return this.setting[key];
        else return _default;
    }
    getColor(color) {
        return typeof color === "string" ? $color(color) : $rgba(color.red, color.green, color.blue, color.alpha);
    }
    getImageName(key, compress = false) {
        let name = $text.MD5(key) + ".jpg";
        if (compress) name = "compress." + name;
        return name;
    }
    getImage(key, compress = false) {
        try {
            const name = this.getImageName(key, compress);
            return this.fileStorage.read(this.imagePath, name).image;
        } catch (error) {
            if (error instanceof FileStorageFileNotFoundError) return null;
            throw error;
        }
    }
    getId(key) {
        return `setting-${this.name}-${key}`;
    }
     #touchHighlightStart(id) {
        $(id).bgcolor = $color("systemFill");
    }
     #touchHighlightEnd(id1, duration = 0.3) {
        if (duration === 0) $(id1).bgcolor = $color("clear");
        else $ui.animate({
            duration: duration,
            animation: ()=>{
                $(id1).bgcolor = $color("clear");
            }
        });
    }
     #withTouchEvents(id2, events, withTappedHighlight = false, highlightEndDelay = 0) {
        events = Object.assign(events, {
            touchesBegan: ()=>{
                this.#touchHighlightStart(id2);
                // 延时自动关闭高亮，防止 touchesMoved 事件未正常调用
                this.#withTouchEventsT[id2] = $delay(1, ()=>this.#touchHighlightEnd(id2, 0)
                );
            },
            touchesMoved: ()=>{
                this.#withTouchEventsT[id2]?.cancel();
                this.#touchHighlightEnd(id2, 0);
            }
        });
        if (withTappedHighlight) {
            const tapped = events.tapped;
            events.tapped = ()=>{
                // highlight
                this.#touchHighlightStart(id2);
                setTimeout(()=>this.#touchHighlightEnd(id2)
                , highlightEndDelay * 1000);
                if (typeof tapped === "function") tapped();
            };
        }
        return events;
    }
    createLineLabel(title9, icon) {
        if (!icon[1]) icon[1] = "#00CC00";
        if (typeof icon[1] !== "object") icon[1] = [
            icon[1],
            icon[1]
        ];
        if (typeof icon[0] !== "object") icon[0] = [
            icon[0],
            icon[0]
        ];
        return {
            type: "view",
            views: [
                {
                    // icon
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
                            layout: (make13, view17)=>{
                                make13.center.equalTo(view17.super);
                                make13.size.equalTo(20);
                            }
                        }
                    ],
                    layout: (make14, view18)=>{
                        make14.centerY.equalTo(view18.super);
                        make14.size.equalTo(this.iconSize);
                        make14.left.inset(this.edgeOffset);
                    }
                },
                {
                    // title
                    type: "label",
                    props: {
                        text: title9,
                        lines: 1,
                        textColor: this.textColor,
                        align: $align.left
                    },
                    layout: (make15, view19)=>{
                        make15.centerY.equalTo(view19.super);
                        make15.height.equalTo(view19.super);
                        make15.left.equalTo(view19.prev.right).offset(this.edgeOffset);
                    }
                }
            ],
            layout: (make16, view20)=>{
                make16.height.centerY.equalTo(view20.super);
                make16.left.inset(0);
            }
        };
    }
    createInfo(icon, title10, value) {
        const isArray = Array.isArray(value);
        const text = isArray ? value[0] : value;
        const moreInfo = isArray ? value[1] : value;
        return {
            type: "view",
            props: {
                selectable: true
            },
            views: [
                this.createLineLabel(title10, icon),
                {
                    type: "label",
                    props: {
                        text: text,
                        align: $align.right,
                        textColor: $color("darkGray")
                    },
                    layout: (make17, view21)=>{
                        make17.centerY.equalTo(view21.prev);
                        make17.right.inset(this.edgeOffset);
                        make17.width.equalTo(180);
                    }
                },
                {
                    // 监听点击动作
                    type: "view",
                    events: {
                        tapped: ()=>{
                            $ui.alert({
                                title: title10,
                                message: moreInfo,
                                actions: [
                                    {
                                        title: $l10n("COPY"),
                                        handler: ()=>{
                                            $clipboard.text = moreInfo;
                                            $ui.toast($l10n("COPIED"));
                                        }
                                    },
                                    {
                                        title: $l10n("OK")
                                    }
                                ]
                            });
                        }
                    },
                    layout: (make18, view22)=>{
                        make18.right.inset(0);
                        make18.size.equalTo(view22.super);
                    }
                }
            ],
            layout: $layout.fill
        };
    }
    createSwitch(key, icon, title11) {
        const id3 = this.getId(key);
        return {
            type: "view",
            props: {
                id: id3,
                selectable: true
            },
            views: [
                this.createLineLabel(title11, icon),
                {
                    type: "switch",
                    props: {
                        on: this.get(key),
                        onColor: $color("#00CC00")
                    },
                    events: {
                        changed: (sender)=>{
                            try {
                                this.set(key, sender.on);
                            } catch (error) {
                                // 恢复开关状态
                                sender.on = !sender.on;
                                throw error;
                            }
                        }
                    },
                    layout: (make19, view23)=>{
                        make19.centerY.equalTo(view23.prev);
                        make19.right.inset(this.edgeOffset);
                    }
                }
            ],
            layout: $layout.fill
        };
    }
    createString(key, icon, title12) {
        const id4 = this.getId(key);
        return {
            type: "view",
            props: {
                id: id4,
                selectable: true
            },
            views: [
                this.createLineLabel(title12, icon),
                {
                    type: "button",
                    props: {
                        symbol: "square.and.pencil",
                        bgcolor: $color("clear"),
                        tintColor: $color("primaryText")
                    },
                    events: {
                        tapped: (sender)=>{
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
                                        layout: (make20)=>{
                                            make20.left.right.inset(10);
                                            make20.top.inset(20);
                                            make20.height.equalTo(90);
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
                                        layout: (make21)=>{
                                            make21.right.inset(10);
                                            make21.bottom.inset(25);
                                            make21.size.equalTo(30);
                                        },
                                        events: {
                                            tapped: ()=>{
                                                this.set(key, $(`${this.name}-string-${key}`).text);
                                                popover.dismiss();
                                            }
                                        }
                                    }
                                ]
                            });
                        }
                    },
                    layout: (make22, view24)=>{
                        make22.centerY.equalTo(view24.prev);
                        make22.right.inset(0);
                        make22.size.equalTo(50);
                    }
                }
            ],
            layout: $layout.fill
        };
    }
    createNumber(key, icon, title13) {
        const id5 = this.getId(key);
        const labelId = `${id5}-label`;
        return {
            type: "view",
            props: {
                id: id5,
                selectable: true
            },
            views: [
                this.createLineLabel(title13, icon),
                {
                    type: "label",
                    props: {
                        id: labelId,
                        align: $align.right,
                        text: this.get(key)
                    },
                    events: {
                        tapped: ()=>{
                            $input.text({
                                type: $kbType.decimal,
                                text: this.get(key),
                                placeholder: title13,
                                handler: (text)=>{
                                    const isNumber = (str)=>{
                                        const reg = /^[0-9]+.?[0-9]*$/;
                                        return reg.test(str);
                                    };
                                    if (text === "" || !isNumber(text)) {
                                        $ui.toast($l10n("INVALID_VALUE"));
                                        return;
                                    }
                                    this.set(key, text);
                                    $(labelId).text = text;
                                }
                            });
                        }
                    },
                    layout: (make23, view25)=>{
                        make23.centerY.equalTo(view25.prev);
                        make23.right.inset(this.edgeOffset);
                        make23.height.equalTo(this.rowHeight);
                        make23.width.equalTo(100);
                    }
                }
            ],
            layout: $layout.fill
        };
    }
    createStepper(key, icon, title14, min, max) {
        const id6 = this.getId(key);
        const labelId = `${id6}-label`;
        return {
            type: "view",
            props: {
                id: id6,
                selectable: true
            },
            views: [
                this.createLineLabel(title14, icon),
                {
                    type: "label",
                    props: {
                        id: labelId,
                        text: this.get(key),
                        textColor: this.textColor,
                        align: $align.left
                    },
                    layout: (make24, view26)=>{
                        make24.height.equalTo(view26.super);
                        make24.right.inset(120);
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
                        changed: (sender)=>{
                            $(labelId).text = sender.value;
                            try {
                                this.set(key, sender.value);
                            } catch (error) {
                                // 恢复标签显示数据
                                $(labelId).text = this.get(key);
                                throw error;
                            }
                        }
                    },
                    layout: (make25, view27)=>{
                        make25.centerY.equalTo(view27.prev);
                        make25.right.inset(this.edgeOffset);
                    }
                }
            ],
            layout: $layout.fill
        };
    }
    createScript(key, icon, title15, script) {
        const id7 = this.getId(key);
        const buttonId = `${id7}-button`;
        const actionStart = ()=>{
            // 隐藏 button，显示 spinner
            $(buttonId).alpha = 0;
            $(`${buttonId}-spinner`).alpha = 1;
            this.#touchHighlightStart(id7);
        };
        const actionCancel = ()=>{
            $(buttonId).alpha = 1;
            $(`${buttonId}-spinner`).alpha = 0;
            this.#touchHighlightEnd(id7);
        };
        const actionDone = (status = true, message = $l10n("ERROR"))=>{
            $(`${buttonId}-spinner`).alpha = 0;
            this.#touchHighlightEnd(id7);
            const button = $(buttonId);
            if (!status) {
                // 失败
                $ui.toast(message);
                button.alpha = 1;
                return;
            }
            // 成功动画
            button.symbol = "checkmark";
            $ui.animate({
                duration: 0.6,
                animation: ()=>{
                    button.alpha = 1;
                },
                completion: ()=>{
                    setTimeout(()=>{
                        $ui.animate({
                            duration: 0.4,
                            animation: ()=>{
                                button.alpha = 0;
                            },
                            completion: ()=>{
                                button.symbol = "chevron.right";
                                $ui.animate({
                                    duration: 0.4,
                                    animation: ()=>{
                                        button.alpha = 1;
                                    },
                                    completion: ()=>{
                                        button.alpha = 1;
                                    }
                                });
                            }
                        });
                    }, 600);
                }
            });
        };
        return {
            type: "view",
            props: {
                id: id7
            },
            views: [
                this.createLineLabel(title15, icon),
                {
                    type: "view",
                    views: [
                        {
                            // 仅用于显示图片
                            type: "image",
                            props: {
                                id: buttonId,
                                symbol: "chevron.right",
                                tintColor: $color("secondaryText")
                            },
                            layout: (make26, view28)=>{
                                make26.centerY.equalTo(view28.super);
                                make26.right.inset(0);
                                make26.size.equalTo(15);
                            }
                        },
                        {
                            type: "spinner",
                            props: {
                                id: `${buttonId}-spinner`,
                                loading: true,
                                alpha: 0
                            },
                            layout: (make27, view29)=>{
                                make27.size.equalTo(view29.prev);
                                make27.left.top.equalTo(view29.prev);
                            }
                        }
                    ],
                    layout: (make28, view30)=>{
                        make28.right.inset(this.edgeOffset);
                        make28.height.equalTo(this.rowHeight);
                        make28.width.equalTo(view30.super);
                    }
                }
            ],
            events: this.#withTouchEvents(id7, {
                tapped: ()=>{
                    // 生成开始事件和结束事件动画，供函数调用
                    const animate = {
                        actionStart: actionStart,
                        actionCancel: actionCancel,
                        actionDone: actionDone,
                        touchHighlightStart: ()=>this.#touchHighlightStart(id7)
                        ,
                        touchHighlightEnd: ()=>this.#touchHighlightEnd(id7) // 被点击的一行颜色恢复
                    };
                    // 执行代码
                    if (typeof script === "function") script(animate);
                    else if (script.startsWith("this")) // 传递 animate 对象
                    eval(`(()=>{return ${script}(animate)})()`);
                    else eval(script);
                }
            }),
            layout: $layout.fill
        };
    }
    createTab(key, icon, title16, items, values) {
        if (typeof items === "string") items = eval(`(()=>{return ${items}()})()`);
        else if (typeof items === "function") items = items();
        if (typeof values === "string") values = eval(`(()=>{return ${values}()})()`);
        else if (typeof values === "function") values = values();
        const id8 = this.getId(key);
        const isCustomizeValues = items?.length > 0 && values?.length === items?.length;
        return {
            type: "view",
            props: {
                id: id8,
                selectable: true
            },
            views: [
                this.createLineLabel(title16, icon),
                {
                    type: "tab",
                    props: {
                        items: items ?? [],
                        index: isCustomizeValues ? values.indexOf(this.get(key)) : this.get(key),
                        dynamicWidth: true
                    },
                    layout: (make29, view31)=>{
                        make29.right.inset(this.edgeOffset);
                        make29.centerY.equalTo(view31.prev);
                    },
                    events: {
                        changed: (sender)=>{
                            if (isCustomizeValues) this.set(key, values[sender.index]);
                            else this.set(key, sender.index);
                        }
                    }
                }
            ],
            layout: $layout.fill
        };
    }
    createMenu(key, icon, title17, items, values) {
        const id9 = this.getId(key);
        const labelId = `${id9}-label`;
        // 数据生成函数
        const getItems = ()=>{
            let res;
            if (typeof items === "string") res = eval(`(()=>{return ${items}()})()`);
            else if (typeof items === "function") res = items();
            else res = items ?? [];
            return res;
        };
        const getValues = ()=>{
            let res;
            if (typeof values === "string") res = eval(`(()=>{return ${values}()})()`);
            else if (typeof values === "function") res = values();
            else res = values;
            return res;
        };
        const tmpItems1 = getItems();
        const tmpValues1 = getValues();
        const isCustomizeValues = tmpItems1?.length > 0 && tmpValues1?.length === tmpItems1?.length;
        return {
            type: "view",
            props: {
                id: id9,
                selectable: true
            },
            views: [
                this.createLineLabel(title17, icon),
                {
                    type: "view",
                    views: [
                        {
                            type: "label",
                            props: {
                                text: isCustomizeValues ? tmpItems1[tmpValues1.indexOf(this.get(key))] : tmpItems1[this.get(key)],
                                color: $color("secondaryText"),
                                id: labelId
                            },
                            layout: (make30, view32)=>{
                                make30.right.inset(0);
                                make30.height.equalTo(view32.super);
                            }
                        }
                    ],
                    layout: (make31, view33)=>{
                        make31.right.inset(this.edgeOffset);
                        make31.height.equalTo(this.rowHeight);
                        make31.width.equalTo(view33.super);
                    }
                }
            ],
            events: {
                tapped: ()=>{
                    const tmpItems = getItems();
                    const tmpValues = getValues();
                    $ui.menu({
                        items: tmpItems,
                        handler: (title18, idx)=>{
                            if (isCustomizeValues) this.set(key, tmpValues[idx]);
                            else this.set(key, idx);
                            $(labelId).text = $l10n(title18);
                        }
                    });
                }
            },
            layout: $layout.fill
        };
    }
    createColor(key, icon, title19) {
        const id10 = this.getId(key);
        const colorId = `${id10}-color`;
        return {
            type: "view",
            props: {
                id: id10,
                selectable: true
            },
            views: [
                this.createLineLabel(title19, icon),
                {
                    type: "view",
                    views: [
                        {
                            // 颜色预览以及按钮功能
                            type: "view",
                            props: {
                                id: colorId,
                                bgcolor: this.getColor(this.get(key)),
                                circular: true,
                                borderWidth: 1,
                                borderColor: $color("#e3e3e3")
                            },
                            layout: (make32, view34)=>{
                                make32.centerY.equalTo(view34.super);
                                make32.right.inset(this.edgeOffset);
                                make32.size.equalTo(20);
                            }
                        },
                        {
                            // 用来监听点击事件，增大可点击面积
                            type: "view",
                            events: {
                                tapped: async ()=>{
                                    const color = await $picker.color({
                                        color: this.getColor(this.get(key))
                                    });
                                    this.set(key, color.components);
                                    $(colorId).bgcolor = $rgba(color.components.red, color.components.green, color.components.blue, color.components.alpha);
                                }
                            },
                            layout: (make33, view35)=>{
                                make33.right.inset(0);
                                make33.height.width.equalTo(view35.super.height);
                            }
                        }
                    ],
                    layout: (make34, view36)=>{
                        make34.height.equalTo(this.rowHeight);
                        make34.width.equalTo(view36.super);
                    }
                }
            ],
            layout: $layout.fill
        };
    }
    createDate(key, icon, title20, mode = 2) {
        const id11 = this.getId(key);
        const getFormatDate = (date)=>{
            let str = "";
            if (typeof date === "number") date = new Date(date);
            switch(mode){
                case 0:
                    str = date.toLocaleTimeString();
                    break;
                case 1:
                    str = date.toLocaleDateString();
                    break;
                case 2:
                    str = date.toLocaleString();
                    break;
            }
            return str;
        };
        return {
            type: "view",
            props: {
                id: id11,
                selectable: true
            },
            views: [
                this.createLineLabel(title20, icon),
                {
                    type: "view",
                    views: [
                        {
                            type: "label",
                            props: {
                                id: `${id11}-label`,
                                color: $color("secondaryText"),
                                text: this.get(key) ? getFormatDate(this.get(key)) : "None"
                            },
                            layout: (make35, view37)=>{
                                make35.right.inset(0);
                                make35.height.equalTo(view37.super);
                            }
                        }
                    ],
                    events: {
                        tapped: async ()=>{
                            const settingData = this.get(key);
                            const date = await $picker.date({
                                props: {
                                    mode: mode,
                                    date: settingData ? settingData : Date.now()
                                }
                            });
                            this.set(key, date.getTime());
                            $(`${id11}-label`).text = getFormatDate(date);
                        }
                    },
                    layout: (make36, view38)=>{
                        make36.right.inset(this.edgeOffset);
                        make36.height.equalTo(this.rowHeight);
                        make36.width.equalTo(view38.super);
                    }
                }
            ],
            layout: $layout.fill
        };
    }
    createInput(key, icon, title21) {
        const id12 = this.getId(key);
        return {
            type: "view",
            props: {
                id: id12,
                selectable: true
            },
            views: [
                this.createLineLabel(title21, icon),
                {
                    type: "view",
                    views: [
                        {
                            type: "input",
                            props: {
                                align: $align.right,
                                bgcolor: $color("clear"),
                                textColor: $color("secondaryText"),
                                text: this.get(key)
                            },
                            layout: function(make37, view39) {
                                make37.right.inset(0);
                                make37.size.equalTo(view39.super);
                            },
                            events: {
                                didBeginEditing: ()=>{
                                    // 防止键盘遮挡
                                    if (!$app.autoKeyboardEnabled) $app.autoKeyboardEnabled = true;
                                },
                                returned: (sender)=>{
                                    // 结束编辑，由 didEndEditing 进行保存
                                    sender.blur();
                                },
                                didEndEditing: (sender)=>{
                                    this.set(key, sender.text);
                                    sender.blur();
                                }
                            }
                        }
                    ],
                    layout: (make38, view40)=>{
                        // 与标题间距 this.edgeOffset
                        make38.left.equalTo(view40.prev.get("label").right).offset(this.edgeOffset);
                        make38.right.inset(this.edgeOffset);
                        make38.height.equalTo(view40.super);
                    }
                }
            ],
            layout: $layout.fill
        };
    }
    /**
     *
     * @param {string} key
     * @param {string} icon
     * @param {string} title
     * @param {Object} events
     * @param {string|Object} bgcolor 指定预览时的背景色，默认 "#000000"
     * @returns {Object}
     */ createIcon(key, icon1, title22, bgcolor = "#000000") {
        const id13 = this.getId(key);
        const imageId = `${id13}-image`;
        return {
            type: "view",
            props: {
                id: id13,
                selectable: true
            },
            views: [
                this.createLineLabel(title22, icon1),
                {
                    type: "view",
                    views: [
                        {
                            type: "image",
                            props: {
                                cornerRadius: 8,
                                bgcolor: typeof bgcolor === "string" ? $color(bgcolor) : bgcolor,
                                smoothCorners: true
                            },
                            layout: (make39, view41)=>{
                                make39.right.inset(this.edgeOffset);
                                make39.centerY.equalTo(view41.super);
                                make39.size.equalTo($size(30, 30));
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: imageId,
                                image: $image(this.get(key)),
                                icon: $icon(this.get(key).slice(5, this.get(key).indexOf(".")), $color("#ffffff")),
                                tintColor: $color("#ffffff")
                            },
                            layout: (make40, view42)=>{
                                make40.right.equalTo(view42.prev).offset(-5);
                                make40.centerY.equalTo(view42.super);
                                make40.size.equalTo($size(20, 20));
                            }
                        }
                    ],
                    events: {
                        tapped: ()=>{
                            $ui.menu({
                                items: [
                                    $l10n("JSBOX_ICON"),
                                    $l10n("SF_SYMBOLS"),
                                    $l10n("IMAGE_BASE64")
                                ],
                                handler: async (title23, idx)=>{
                                    if (idx === 0) {
                                        const icon = await $ui.selectIcon();
                                        this.set(key, icon);
                                        $(imageId).icon = $icon(icon.slice(5, icon.indexOf(".")), $color("#ffffff"));
                                    } else if (idx === 1 || idx === 2) $input.text({
                                        text: "",
                                        placeholder: title23,
                                        handler: (text)=>{
                                            if (text === "") {
                                                $ui.toast($l10n("INVALID_VALUE"));
                                                return;
                                            }
                                            this.set(key, text);
                                            if (idx === 1) $(imageId).symbol = text;
                                            else $(imageId).image = $image(text);
                                        }
                                    });
                                }
                            });
                        }
                    },
                    layout: (make41, view43)=>{
                        make41.right.inset(0);
                        make41.height.equalTo(this.rowHeight);
                        make41.width.equalTo(view43.super);
                    }
                }
            ],
            layout: $layout.fill
        };
    }
    createChild(key, icon, title24, children) {
        const id14 = this.getId(key);
        return {
            type: "view",
            layout: $layout.fill,
            props: {
                id: id14,
                selectable: true
            },
            views: [
                this.createLineLabel(title24, icon),
                {
                    // 仅用于显示图片
                    type: "image",
                    props: {
                        symbol: "chevron.right",
                        tintColor: $color("secondaryText")
                    },
                    layout: (make42, view44)=>{
                        make42.centerY.equalTo(view44.super);
                        make42.right.inset(this.edgeOffset);
                        make42.size.equalTo(15);
                    }
                }
            ],
            events: {
                tapped: ()=>{
                    setTimeout(()=>{
                        if (this.events?.onChildPush) this.callEvent("onChildPush", this.getListView(children, {
                        }), title24);
                        else if (this.isUseJsboxNav) UIKit.push({
                            title: title24,
                            bgcolor: UIKit.scrollViewBackgroundColor,
                            views: [
                                this.getListView(children, {
                                })
                            ]
                        });
                        else {
                            const pageController3 = new PageController();
                            pageController3.setView(this.getListView(children, {
                            })).navigationItem.setTitle(title24).addPopButton().setLargeTitleDisplayMode(NavigationItem.largeTitleDisplayModeNever);
                            if (this.hasSectionTitle(children)) pageController3.navigationController.navigationBar.setContentViewHeightOffset(-10);
                            this.viewController.push(pageController3);
                        }
                    });
                }
            }
        };
    }
    createImage(key, icon, title25) {
        const id15 = this.getId(key);
        const imageId = `${id15}-image`;
        return {
            type: "view",
            props: {
                id: id15,
                selectable: true
            },
            views: [
                this.createLineLabel(title25, icon),
                {
                    type: "view",
                    views: [
                        {
                            type: "image",
                            props: {
                                id: imageId,
                                image: this.getImage(key, true) ?? $image("questionmark.square.dashed")
                            },
                            layout: (make43, view45)=>{
                                make43.right.inset(this.edgeOffset);
                                make43.centerY.equalTo(view45.super);
                                make43.size.equalTo($size(30, 30));
                            }
                        }
                    ],
                    events: {
                        tapped: ()=>{
                            this.#touchHighlightStart(id15);
                            $ui.menu({
                                items: [
                                    $l10n("PREVIEW"),
                                    $l10n("SELECT_IMAGE"),
                                    $l10n("CLEAR_IMAGE")
                                ],
                                handler: (title, idx)=>{
                                    if (idx === 0) {
                                        const image = this.getImage(key);
                                        if (image) $quicklook.open({
                                            image: image
                                        });
                                        else $ui.toast($l10n("NO_IMAGE"));
                                    } else if (idx === 1) $photo.pick({
                                        format: "data"
                                    }).then((resp)=>{
                                        $ui.toast($l10n("LOADING"));
                                        if (!resp.status || !resp.data) {
                                            if (resp?.error?.description !== "canceled") $ui.toast($l10n("ERROR"));
                                            return;
                                        }
                                        // 控制压缩图片大小
                                        const image = compressImage(resp.data.image);
                                        this.fileStorage.write(this.imagePath, this.getImageName(key, true), image.jpg(0.8));
                                        this.fileStorage.write(this.imagePath, this.getImageName(key), resp.data);
                                        $(imageId).image = image;
                                        $ui.success($l10n("SUCCESS"));
                                    });
                                    else if (idx === 2) {
                                        this.fileStorage.delete(this.imagePath, this.getImageName(key, true));
                                        this.fileStorage.delete(this.imagePath, this.getImageName(key));
                                        $(imageId).image = $image("questionmark.square.dashed");
                                        $ui.success($l10n("SUCCESS"));
                                    }
                                },
                                finished: ()=>{
                                    this.#touchHighlightEnd(id15);
                                }
                            });
                        }
                    },
                    layout: (make44, view46)=>{
                        make44.right.inset(0);
                        make44.height.equalTo(this.rowHeight);
                        make44.width.equalTo(view46.super);
                    }
                }
            ],
            layout: $layout.fill
        };
    }
     #getSections(structure) {
        const sections = [];
        for (let section of structure){
            const rows = [];
            for (let item1 of section.items){
                const value = this.get(item1.key);
                let row = null;
                if (!item1.icon) item1.icon = [
                    "square.grid.2x2.fill",
                    "#00CC00"
                ];
                if (typeof item1.items === "object") item1.items = item1.items.map((item3)=>$l10n(item3)
                );
                // 更新标题值
                item1.title = $l10n(item1.title);
                switch(item1.type){
                    case "switch":
                        row = this.createSwitch(item1.key, item1.icon, item1.title);
                        break;
                    case "stepper":
                        row = this.createStepper(item1.key, item1.icon, item1.title, item1.min ?? 1, item1.max ?? 12);
                        break;
                    case "string":
                        row = this.createString(item1.key, item1.icon, item1.title);
                        break;
                    case "number":
                        row = this.createNumber(item1.key, item1.icon, item1.title);
                        break;
                    case "info":
                        row = this.createInfo(item1.icon, item1.title, value);
                        break;
                    case "script":
                        row = this.createScript(item1.key, item1.icon, item1.title, value);
                        break;
                    case "tab":
                        row = this.createTab(item1.key, item1.icon, item1.title, item1.items, item1.values);
                        break;
                    case "menu":
                        row = this.createMenu(item1.key, item1.icon, item1.title, item1.items, item1.values);
                        break;
                    case "color":
                        row = this.createColor(item1.key, item1.icon, item1.title);
                        break;
                    case "date":
                        row = this.createDate(item1.key, item1.icon, item1.title, item1.mode);
                        break;
                    case "input":
                        row = this.createInput(item1.key, item1.icon, item1.title);
                        break;
                    case "icon":
                        row = this.createIcon(item1.key, item1.icon, item1.title, item1.bgcolor);
                        break;
                    case "child":
                        row = this.createChild(item1.key, item1.icon, item1.title, item1.children);
                        break;
                    case "image":
                        row = this.createImage(item1.key, item1.icon, item1.title);
                        break;
                    default:
                        continue;
                }
                rows.push(row);
            }
            sections.push({
                title: $l10n(section.title ?? ""),
                rows: rows
            });
        }
        return sections;
    }
    getListView(structure1, footer = this.footer) {
        return {
            type: "list",
            props: {
                id: this.name,
                style: 2,
                separatorInset: $insets(0, this.iconSize + this.edgeOffset * 2, 0, this.edgeOffset),
                bgcolor: UIKit.scrollViewBackgroundColor,
                footer: footer,
                data: this.#getSections(structure1 ?? this.structure)
            },
            layout: $layout.fill,
            events: {
                rowHeight: (sender, indexPath)=>{
                    const info = sender.object(indexPath)?.props?.info ?? {
                    };
                    return info.rowHeight ?? this.rowHeight;
                }
            }
        };
    }
    getPageView() {
        if (!this.viewController.hasRootPageController()) {
            const pageController4 = new PageController();
            pageController4.setView(this.getListView(this.structure)).navigationItem.setTitle($l10n("SETTING"));
            if (this.hasSectionTitle(this.structure)) pageController4.navigationController.navigationBar.setContentViewHeightOffset(-10);
            this.viewController.setRootPageController(pageController4);
        }
        return this.viewController.getRootPageController().getPage();
    }
}
module.exports = {
    VERSION,
    versionCompare,
    compressImage,
    objectEqual,
    // class
    View,
    UIKit,
    ViewController,
    Matrix,
    Sheet,
    NavigationBar,
    BarButtonItem,
    FixedFooterView,
    SearchBar,
    SearchBarController,
    NavigationItem,
    NavigationController,
    PageView,
    PageController,
    TabBarCellView,
    TabBarHeaderView,
    TabBarController,
    Kernel,
    UILoading,
    FileStorage,
    Setting
};

});

parcelRequire.register("6QERS", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $4fc74cf5b95fa1d3$require$compressImage = $1cJLV.compressImage;
/**
 * @typedef {import("./app").AppKernel} AppKernel
 */ class $4fc74cf5b95fa1d3$var$Storage {
    /**
     *
     * @param {boolean} sync
     * @param {AppKernel} kernel
     */ constructor(sync = false, kernel){
        this.sync = sync;
        this.kernel = kernel;
        this.dbName = "CAIO.db";
        this.localDb = `${this.kernel.fileStorage.basePath}/${this.dbName}`;
        this.syncInfoFile = `${this.kernel.fileStorage.basePath}/sync.json`;
        this.imagePath = `${this.kernel.fileStorage.basePath}/image`;
        this.imageOriginalPath = `${this.imagePath}/original`;
        this.imagePreviewPath = `${this.imagePath}/preview`;
        this.iCloudPath = "drive://CAIO";
        this.iCloudSyncInfoFile = `${this.iCloudPath}/sync.json`;
        this.iCloudDbFile = `${this.iCloudPath}/${this.dbName}`;
        this.iCloudImagePath = `${this.iCloudPath}/image`;
        this.tempPath = `${this.kernel.fileStorage.basePath}/temp`;
        this.tempSyncInfoFile = `${this.tempPath}/sync.json`;
        this.tempDbFile = `${this.tempPath}/${this.dbName}`;
        this.tempImagePath = `${this.tempPath}/image`;
        this.init();
        if (this.sync) this.syncByiCloud();
    }
    init() {
        // 初始化表
        this.sqlite = $sqlite.open(this.localDb);
        this.sqlite.update("CREATE TABLE IF NOT EXISTS clipboard(uuid TEXT PRIMARY KEY NOT NULL, text TEXT, md5 TEXT, prev TEXT, next TEXT)");
        this.sqlite.update("CREATE TABLE IF NOT EXISTS pin(uuid TEXT PRIMARY KEY NOT NULL, text TEXT, md5 TEXT, prev TEXT, next TEXT)");
        // 初始化目录
        const pathList = [
            this.tempPath,
            this.iCloudPath,
            this.imagePath,
            this.imagePreviewPath,
            this.imageOriginalPath
        ];
        pathList.forEach((path)=>{
            if (!$file.isDirectory(path)) $file.mkdir(path);
        });
    }
    rebuild() {
        const db = this.tempPath + "/rebuild.db";
        $file.delete(db);
        const storage = new $4fc74cf5b95fa1d3$var$Storage(false, this.kernel);
        storage.localDb = db;
        storage.init();
        const action = (data2, flag = true)=>{
            const rebuildData = [];
            data2.forEach((item)=>{
                const data = {
                    uuid: item.uuid,
                    text: item.text,
                    md5: item.md5,
                    image: item.image,
                    prev: null,
                    next: rebuildData[0]?.uuid ?? null
                };
                storage.beginTransaction();
                try {
                    if (flag) storage.insert(data);
                    else storage.insertPin(data);
                    if (data.next) {
                        // 更改指针
                        rebuildData[0].prev = data.uuid;
                        if (flag) storage.update(rebuildData[0]);
                        else storage.updatePin(rebuildData[0]);
                    }
                    storage.commit();
                    rebuildData.unshift(data);
                } catch (error) {
                    storage.rollback();
                    this.kernel.error(error);
                    throw error;
                }
            });
        };
        let data1;
        try {
            data1 = this.all();
            const sorted = this.sort(JSON.parse(JSON.stringify(data1)));
            if (sorted.length > data1.length) throw new Error();
            action(sorted.reverse());
        } catch  {
            action(this.all());
        }
        try {
            data1 = this.allPin();
            const sorted = this.sort(JSON.parse(JSON.stringify(data1)));
            if (sorted.length > data1.length) throw new Error();
            action(sorted.reverse(), false);
        } catch  {
            action(this.allPin(), false);
        }
        $file.copy({
            src: db,
            dst: this.localDb
        });
    }
    clearTemp() {
        $file.delete(this.tempPath);
        $file.mkdir(this.tempPath);
    }
    async export(callback) {
        $file.copy({
            src: this.syncInfoFile,
            dst: this.tempSyncInfoFile
        });
        $file.copy({
            src: this.localDb,
            dst: this.tempDbFile
        });
        $file.copy({
            src: this.imagePath,
            dst: this.tempImagePath
        });
        const exportFile = this.tempPath + "/" + this.iCloudZipFileName;
        await $archiver.zip({
            directory: this.tempPath,
            dest: exportFile
        });
        $share.sheet({
            items: [
                {
                    name: this.iCloudZipFileName,
                    data: $data({
                        path: exportFile
                    })
                }
            ],
            handler: (success)=>{
                $file.delete(exportFile);
                callback(success);
            }
        });
    }
    async import(data) {
        if (data.fileName.slice(-2) === "db") {
            if (!$file.write({
                data: data,
                path: this.localDb
            })) throw new Error("WRITE_DB_FILE_FAILED");
        } else if (data.fileName.slice(-3) === "zip") {
            if (!await $archiver.unzip({
                file: data,
                dest: this.tempPath
            })) throw new Error("UNZIP_FAILED");
            $file.write({
                data: $data({
                    path: this.tempDbFile
                }),
                path: this.localDb
            });
            // image
            $file.move({
                src: this.tempImagePath,
                dst: this.imagePath
            });
        }
        $sqlite.close(this.sqlite);
        this.sqlite = $sqlite.open(this.localDb);
        await this.upload();
    }
    async upload(manual) {
        if (!this.sync && !manual) return;
        if (this.all().length === 0) return;
        const fileWrite = async (obj)=>{
            // 加读写锁
            const lock = obj.path + ".lock";
            await $file.download(lock);
            if (await $file.exists(lock)) {
                // 文件被锁，等待 500ms 重试
                await new Promise((resolve)=>{
                    setTimeout(()=>resolve()
                    , 500);
                });
                await fileWrite(obj);
                return;
            } else {
                await $file.write({
                    data: $data({
                        string: ""
                    }),
                    path: lock
                });
                this.kernel.print("file locked: " + obj.path);
            }
            try {
                // 清除多余文件
                const dir = obj.path.substring(0, obj.path.lastIndexOf("/"));
                const filename = obj.path.substring(obj.path.lastIndexOf("/") + 1, obj.path.lastIndexOf("."));
                for (let val of $file.list(dir) ?? []){
                    let valName = val.substring(0, val.lastIndexOf("."));
                    if (valName === filename || valName.startsWith(filename + " ")) $file.delete(obj.path);
                }
                // 写入文件
                const status = await $file.write(obj);
                if (!status) throw new Error("FILE_WRITE_ERROR: " + obj.path);
            } catch (error) {
                this.kernel.error(error);
                throw error;
            } finally{
                // 解除缩
                await $file.delete(lock);
                this.kernel.print("file unlocked: " + obj.path);
            }
        };
        const now = Date.now();
        await fileWrite({
            data: $data({
                string: JSON.stringify({
                    timestamp: now
                })
            }),
            path: this.iCloudSyncInfoFile
        });
        await fileWrite({
            data: $data({
                path: this.localDb
            }),
            path: this.iCloudDbFile
        });
        if (!$file.exists(this.iCloudImagePath)) $file.mkdir(this.iCloudImagePath);
        await $file.copy({
            src: this.imagePath,
            dst: this.iCloudImagePath
        });
        // 更新同步信息
        await $file.write({
            data: $data({
                string: JSON.stringify({
                    timestamp: now
                })
            }),
            path: this.syncInfoFile
        });
    }
    async syncByiCloud(manual = false) {
        if (!$file.exists(this.iCloudSyncInfoFile)) {
            this.upload(manual);
            return;
        }
        const syncInfoLocal = $file.exists(this.syncInfoFile) ? JSON.parse($file.read(this.syncInfoFile).string) : {
        };
        const data = await $file.download(this.iCloudSyncInfoFile);
        const syncInfoICloud = JSON.parse(data.string);
        if (!syncInfoLocal.timestamp || syncInfoLocal.timestamp < syncInfoICloud.timestamp) {
            await $file.write({
                data: await $file.download(this.iCloudSyncInfoFile),
                path: this.syncInfoFile
            });
            await $file.write({
                data: await $file.download(this.iCloudDbFile),
                path: this.localDb
            });
            // image
            await $file.copy({
                src: this.iCloudImagePath,
                dst: this.imagePath
            });
            // Update
            $sqlite.close(this.sqlite);
            this.sqlite = $sqlite.open(this.localDb);
            $app.notify({
                name: "syncByiCloud",
                object: {
                    status: true
                }
            });
        }
    }
    deleteICloudData() {
        return $file.delete(this.iCloudSyncInfoFile) && $file.delete(this.iCloudDbFile) && $file.delete(this.iCloudImagePath);
    }
    sort(data, maxLoop = 9000) {
        const dataObj = {
        };
        let length = 0;
        let header = null;
        data.forEach((item)=>{
            // 构建结构
            dataObj[item.uuid] = item;
            // 寻找头节点
            if (item.prev === null) header = item.uuid;
            // 统计长度
            length++;
        });
        // 排序
        const sorted = [];
        if (length > 0) try {
            let p = dataObj[header];
            while(p.next !== null && maxLoop > 0){
                maxLoop--;
                sorted.push(p);
                p = dataObj[p.next];
            }
            sorted.push(p) // 将最后一个元素推入
            ;
        } catch (error) {
            throw "Unable to sort: " + error;
        }
        return sorted;
    }
    parse(result) {
        if (result.error !== null) throw result.error;
        const data = [];
        while(result.result.next())data.push({
            uuid: result.result.get("uuid"),
            section: result.result.get("section"),
            text: result.result.get("text"),
            md5: result.result.get("md5"),
            prev: result.result.get("prev") ?? null,
            next: result.result.get("next") ?? null
        });
        result.result.close();
        return data;
    }
    beginTransaction() {
        this.sqlite.beginTransaction();
    }
    commit() {
        this.sqlite.commit();
        this.upload();
    }
    rollback() {
        this.sqlite.rollback();
    }
    getByText(text) {
        const result = this.sqlite.query({
            sql: "SELECT *, 'clipboard' AS section FROM clipboard WHERE text = ? UNION SELECT *, 'pin' AS section FROM pin WHERE text = ?",
            args: [
                text,
                text
            ]
        });
        return this.parse(result)[0];
    }
    getByUUID(uuid) {
        const result = this.sqlite.query({
            sql: "SELECT *, 'clipboard' AS section FROM clipboard a WHERE uuid = ? UNION SELECT *, 'pin' AS section FROM pin a WHERE uuid = ?",
            args: [
                uuid,
                uuid
            ]
        });
        return this.parse(result)[0];
    }
    getByMD5(md5) {
        const result = this.sqlite.query({
            sql: "SELECT *, 'clipboard' AS section FROM clipboard WHERE md5 = ? UNION SELECT *, 'pin' AS section FROM pin WHERE md5 = ?",
            args: [
                md5,
                md5
            ]
        });
        return this.parse(result)[0];
    }
    search(kw) {
        const result = this.sqlite.query({
            sql: "SELECT *, 'clipboard' AS section FROM clipboard WHERE text like ? UNION SELECT *, 'pin' AS section FROM pin WHERE text like ?",
            args: [
                `%${kw}%`,
                `%${kw}%`
            ]
        });
        return this.parse(result);
    }
    pathToKey(path) {
        path = JSON.stringify(path);
        return `@image=${path}`;
    }
    keyToPath(key) {
        if (key.startsWith("@image=")) return JSON.parse(key.slice(7));
        return false;
    }
    _all(table) {
        const result = this.sqlite.query(`SELECT *, '${table}' AS section FROM ${table}`);
        return this.parse(result);
    }
    // 分页无法排序
    _page(table, page, size) {
        const result = this.sqlite.query(`SELECT *, '${table}' AS section FROM ${table} LIMIT ${page * size},${size}`);
        return this.parse(result);
    }
    _insert(table, clipboard) {
        if (clipboard.image) {
            const image = clipboard.image;
            const fileName = $text.uuid;
            const path = {
                original: `${this.imageOriginalPath}/${fileName}.png`,
                preview: `${this.imagePreviewPath}/${fileName}.jpg`
            };
            $file.write({
                data: image.png,
                path: path.original
            });
            $file.write({
                data: $4fc74cf5b95fa1d3$require$compressImage(image).jpg(0.8),
                path: path.preview
            });
            clipboard.text = this.pathToKey(path);
        }
        const result = this.sqlite.update({
            sql: `INSERT INTO ${table} (uuid, text, md5, prev, next) values (?, ?, ?, ?, ?)`,
            args: [
                clipboard.uuid,
                clipboard.text,
                $text.MD5(clipboard.text),
                clipboard.prev,
                clipboard.next
            ]
        });
        if (result.result) this.upload();
        else throw result.error;
    }
    _update(table, clipboard) {
        if (Object.keys(clipboard).length < 4 || typeof clipboard.uuid !== "string") return;
        const result = this.sqlite.update({
            sql: `UPDATE ${table} SET text = ?, md5 = ?, prev = ?, next = ? WHERE uuid = ?`,
            args: [
                clipboard.text,
                $text.MD5(clipboard.text),
                clipboard.prev,
                clipboard.next,
                clipboard.uuid
            ]
        });
        if (result.result) this.upload();
        else throw result.error;
    }
    _updateText(table, uuid, text) {
        if (typeof uuid !== "string") return;
        const result = this.sqlite.update({
            sql: `UPDATE ${table} SET text = ?, md5 = ? WHERE uuid = ?`,
            args: [
                text,
                $text.MD5(text),
                uuid
            ]
        });
        if (result.result) this.upload();
        else throw result.error;
    }
    _delete(table, uuid) {
        const clipboard = this.getByUUID(uuid);
        const result = this.sqlite.update({
            sql: `DELETE FROM ${table} WHERE uuid = ?`,
            args: [
                uuid
            ]
        });
        // delete image file
        const path = this.keyToPath(clipboard.text);
        if (path) {
            $file.delete(path.original);
            $file.delete(path.preview);
        }
        if (result.result) this.upload();
        else throw result.error;
    }
    all() {
        return this._all("clipboard");
    }
    page(page, size) {
        return this._page("clipboard", page, size);
    }
    insert(clipboard) {
        return this._insert("clipboard", clipboard);
    }
    update(clipboard) {
        return this._update("clipboard", clipboard);
    }
    updateText(uuid, text) {
        return this._updateText("clipboard", uuid, text);
    }
    delete(uuid) {
        return this._delete("clipboard", uuid);
    }
    allPin() {
        return this._all("pin");
    }
    pagePin(page, size) {
        return this._page("pin", page, size);
    }
    insertPin(clipboard) {
        return this._insert("pin", clipboard);
    }
    updatePin(clipboard) {
        return this._update("pin", clipboard);
    }
    updateTextPin(uuid, text) {
        return this._updateText("pin", uuid, text);
    }
    deletePin(uuid) {
        return this._delete("pin", uuid);
    }
    getPinByMD5(md5) {
        const result = this.sqlite.query({
            sql: "SELECT * FROM pin WHERE md5 = ?",
            args: [
                md5
            ]
        });
        return this.parse(result)[0];
    }
}
module.exports = $4fc74cf5b95fa1d3$var$Storage;

});

parcelRequire.register("2Ygkq", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $229dd9dd444bc99f$require$UIKit = $1cJLV.UIKit;
var $229dd9dd444bc99f$require$ViewController = $1cJLV.ViewController;
var $229dd9dd444bc99f$require$PageController = $1cJLV.PageController;
var $229dd9dd444bc99f$require$SearchBar = $1cJLV.SearchBar;

var $dgvQV = parcelRequire("dgvQV");
/**
 * @typedef {import("../app").AppKernel} AppKernel
 */ class $229dd9dd444bc99f$var$Clipboard {
    copied = $cache.get("clipboard.copied") ?? {
    };
    #singleLine = false;
    reorder = {
    };
    #savedClipboard = [];
    savedClipboardIndex = {
    };
    /**
     * @param {AppKernel} kernel
     */ constructor(kernel){
        this.kernel = kernel;
        this.listId = "clipboard-list";
        // 剪贴板列个性化设置
        this.edges = 20 // 列表边距
        ;
        this.fontSize = 16 // 字体大小
        ;
        this.copiedIndicatorSize = 7 // 已复制指示器（小绿点）大小
        ;
        this.imageContentHeight = 50;
        this.viewController = new $229dd9dd444bc99f$require$ViewController();
    }
    get savedClipboard() {
        if (this.#savedClipboard.length === 0) this.loadSavedClipboard();
        return this.#savedClipboard;
    }
    set savedClipboard(savedClipboard) {
        this.#savedClipboard = savedClipboard;
    }
    getSingleLineHeight() {
        return $text.sizeThatFits({
            text: "A",
            width: this.fontSize,
            font: $font(this.fontSize)
        }).height;
    }
    setSingleLine() {
        // 图片高度与文字一致
        this.imageContentHeight = this.getSingleLineHeight();
        this.#singleLine = true;
    }
    loadDataWithSingleLine() {
        this.setSingleLine();
        this.loadSavedClipboard();
    }
    static updateMenu(kernel) {
    // TODO 更新 menu 中的动作
    }
    setClipboardText(text) {
        if (this.kernel.setting.get("clipboard.universal")) $clipboard.text = text;
        else $clipboard.setTextLocalOnly(text);
    }
    /**
     * list view
     */ listReady() {
        // check url scheme
        $delay(0.5, ()=>{
            if ($context.query["copy"]) {
                const uuid = $context.query["copy"];
                const content = this.kernel.storage.getByUUID(uuid);
                this.setClipboardText(content.text);
                this.setCopied(uuid, this.getIndexPathByUUID(uuid));
                $ui.success($l10n("COPIED"));
            } else if ($context.query["add"]) this.getAddTextView();
            else if ($context.query["actions"]) {
                if (this.kernel.isUseJsboxNav) this.kernel.actionManager.present();
                else this.kernel.tabBarController.switchPageTo("actions");
            }
        });
        // readClipboard
        $delay(0.5, ()=>{
            this.readClipboard();
        });
        $app.listen({
            // iCloud
            syncByiCloud: (object)=>{
                if (object.status) {
                    this.loadSavedClipboard();
                    const view = $(this.listId);
                    if (view) view.data = this.savedClipboard;
                }
            },
            resume: ()=>{
                // 在应用恢复响应后调用
                $delay(0.5, ()=>{
                    this.loadSavedClipboard();
                    this.updateList();
                    this.readClipboard();
                });
            }
        });
    }
    updateList() {
        // 直接重置数据，解决小绿点滚动到屏幕外后消失问题
        $(this.listId).data = this.savedClipboard;
    }
    /**
     *
     * @param {string} uuid
     * @param {$indexPath} indexPath
     * @param {boolean} isUpdateIndicator
     * @returns
     */ setCopied(uuid, indexPath, isUpdateIndicator = true) {
        if (uuid === this.copied.uuid && indexPath?.section === this.copied.indexPath?.section && indexPath?.row === this.copied.indexPath?.row) return;
        if (!uuid) {
            if (isUpdateIndicator) {
                if (this.copied.indexPath) this.savedClipboard[this.copied.indexPath.section].rows[this.copied.indexPath.row].copied.hidden = true;
                $delay(0.3, ()=>this.updateList()
                );
            }
            this.copied = {
            };
            $clipboard.clear();
        } else {
            if (isUpdateIndicator) {
                if (this.copied.indexPath) this.savedClipboard[this.copied.indexPath.section].rows[this.copied.indexPath.row].copied.hidden = true;
                this.savedClipboard[indexPath.section].rows[indexPath.row].copied.hidden = false;
                $delay(0.3, ()=>this.updateList()
                );
            }
            if (this.copied.uuid !== uuid) this.copied = Object.assign(this.copied, this.kernel.storage.getByUUID(uuid) ?? {
            });
            this.copied.indexPath = indexPath;
        }
        $cache.set("clipboard.copied", this.copied);
    }
    /**
     * 警告！该方法可能消耗大量资源
     * @param {String} uuid
     */ getIndexPathByUUID(uuid) {
        const data = $(this.listId).data;
        let length = data[0].rows.length;
        for(let index = 0; index < length; index++){
            if (data[0].rows[index].content.info.uuid === uuid) return $indexPath(0, index);
        }
        length = data[1].rows.length;
        for(let index1 = 0; index1 < length; index1++){
            if (data[1].rows[index1].content.info.uuid === uuid) return $indexPath(1, index1);
        }
        return false;
    }
    readClipboard(manual = false) {
        if (manual || this.kernel.setting.get("clipboard.autoSave")) {
            this.kernel.print("read clipboard");
            // 仅手动模式下保存图片
            if (manual && $clipboard.images?.length > 0) {
                $clipboard.images.forEach((image)=>{
                    this.add(image);
                });
                return true;
            }
            const text = $clipboard.text;
            if (!text || text === "") {
                this.setCopied() // 清空剪切板
                ;
                return false;
            }
            $clipboard.text = text // 防止重复弹窗提示从其他 App 读取剪切板
            ;
            // 判断 copied 是否和剪切板一致
            if (this.copied.text === text) return false;
            const md5 = $text.MD5(text);
            const res = this.kernel.storage.getByMD5(md5);
            if (this.copied.uuid && this.copied.uuid === res?.uuid) this.setCopied(res.uuid, this.getIndexPathByUUID(res.uuid));
            else if (!this.savedClipboardIndex[md5]) {
                const data = this.add(text);
                this.copy(text, data.uuid, data.indexPath);
            }
            return true;
        }
        return false;
    }
    add(item, uiUpdate) {
        // 元数据
        const data = {
            uuid: this.kernel.uuid(),
            text: item,
            md5: null,
            image: null,
            prev: null,
            next: this.savedClipboard[1].rows[0] ? this.savedClipboard[1].rows[0].content.info.uuid : null
        };
        if (typeof item === "string") {
            if (item.trim() === "") return;
            data.md5 = $text.MD5(item);
        } else if (typeof item === "object") {
            data.text = "";
            data.image = item;
        } else return;
        // 写入数据库
        this.kernel.storage.beginTransaction();
        try {
            this.kernel.storage.insert(data);
            if (data.next) {
                // 更改指针
                this.savedClipboard[1].rows[0].content.info.prev = data.uuid;
                this.kernel.storage.update(this.savedClipboard[1].rows[0].content.info);
            }
            this.kernel.storage.commit();
            // 格式化数据
            const lineData = this.lineData(data);
            // 保存到内存中
            this.savedClipboard[1].rows.unshift(lineData);
            this.savedClipboardIndex[$text.MD5(data.text)] = 1;
            if (typeof uiUpdate === "function") uiUpdate(data);
            else {
                // 在列表中插入行
                data.indexPath = $indexPath(1, 0);
                $(this.listId).insert({
                    indexPath: data.indexPath,
                    value: lineData
                });
                // 被复制的元素向下移动了一个单位
                if (this.copied?.indexPath?.section === 1) this.setCopied(this.copied.uuid, $indexPath(this.copied?.indexPath?.section, this.copied?.indexPath?.row + 1), false);
                return data;
            }
        } catch (error) {
            this.kernel.storage.rollback();
            this.kernel.error(error);
            $ui.alert(error);
        }
    }
    delete(uuid, indexPath) {
        const section = indexPath.section;
        const index = indexPath.row;
        // 删除数据库中的值
        this.kernel.storage.beginTransaction();
        try {
            section === 0 ? this.kernel.storage.deletePin(uuid) : this.kernel.storage.delete(uuid);
            // 更改指针
            if (this.savedClipboard[section].rows[index - 1]) {
                const prevItem = {
                    uuid: this.savedClipboard[section].rows[index - 1].content.info.uuid,
                    text: this.savedClipboard[section].rows[index - 1].content.info.text,
                    prev: this.savedClipboard[section].rows[index - 1].content.info.prev,
                    next: this.savedClipboard[section].rows[index].content.info.next // next 指向被删除元素的 next
                };
                section === 0 ? this.kernel.storage.updatePin(prevItem) : this.kernel.storage.update(prevItem);
                this.savedClipboard[section].rows[index - 1] = this.lineData(prevItem);
            }
            if (this.savedClipboard[section].rows[index + 1]) {
                const nextItem = {
                    uuid: this.savedClipboard[section].rows[index + 1].content.info.uuid,
                    text: this.savedClipboard[section].rows[index + 1].content.info.text,
                    prev: this.savedClipboard[section].rows[index].content.info.prev,
                    next: this.savedClipboard[section].rows[index + 1].content.info.next
                };
                section === 0 ? this.kernel.storage.updatePin(nextItem) : this.kernel.storage.update(nextItem);
                this.savedClipboard[section].rows[index + 1] = this.lineData(nextItem);
            }
            this.kernel.storage.commit();
            // update index
            delete this.savedClipboardIndex[this.savedClipboard[section].rows[index].content.info.md5];
            // 删除内存中的值
            this.savedClipboard[section].rows.splice(index, 1);
            // 删除列表中的行
            if (this.copied.uuid === uuid) // 删除剪切板信息
            this.setCopied(null);
        } catch (error) {
            this.kernel.storage.rollback();
            this.kernel.error(error);
            $ui.alert(error);
        }
    }
    update(uuid, text, indexPath) {
        const info = $(this.listId).cell(indexPath).get("content").info;
        const newMD5 = $text.MD5(text);
        // 更新索引
        delete this.savedClipboardIndex[info.md5];
        this.savedClipboardIndex[newMD5] = 1;
        // 更新内存数据
        const lineData = this.lineData(Object.assign(info, {
            text: text,
            md5: newMD5
        }), info.uuid === this.copied.uuid);
        this.savedClipboard[indexPath.section].rows[indexPath.row] = lineData;
        // 更新列表
        this.updateList();
        if (uuid === this.copied.uuid) this.setClipboardText(text);
        try {
            indexPath.section === 0 ? this.kernel.storage.updateTextPin(uuid, text) : this.kernel.storage.updateText(uuid, text);
            return true;
        } catch (error) {
            this.kernel.error(error);
            return false;
        }
    }
    /**
     * 将from位置的元素移动到to位置
     * @param {Number} from
     * @param {Number} to
     */ move(from, to, section, copiedIndex = true) {
        if (from === to) return;
        if (from < to) to++ // 若向下移动则 to 增加 1，因为代码为移动到 to 位置的上面
        ;
        if (!this.savedClipboard[section].rows[to]) this.savedClipboard[section].rows[to] = this.lineData({
            uuid: null,
            text: "",
            next: null,
            prev: this.savedClipboard[section].rows[to - 1].content.info.uuid
        });
        this.kernel.storage.beginTransaction() // 开启事务
        ;
        try {
            const oldFromItem = {
                uuid: this.savedClipboard[section].rows[from].content.info.uuid,
                text: this.savedClipboard[section].rows[from].content.info.text
            };
            const oldToItem = {
                uuid: this.savedClipboard[section].rows[to].content.info.uuid,
                text: this.savedClipboard[section].rows[to].content.info.text
            };
            // 删除元素
            if (this.savedClipboard[section].rows[from - 1]) {
                const fromPrevItem = {
                    // from 位置的上一个元素
                    uuid: this.savedClipboard[section].rows[from - 1].content.info.uuid,
                    text: this.savedClipboard[section].rows[from - 1].content.info.text,
                    prev: this.savedClipboard[section].rows[from - 1].content.info.prev,
                    next: this.savedClipboard[section].rows[from].content.info.next
                };
                section === 0 ? this.kernel.storage.updatePin(fromPrevItem) : this.kernel.storage.update(fromPrevItem);
                this.savedClipboard[section].rows[from - 1] = this.lineData(fromPrevItem);
            }
            if (this.savedClipboard[section].rows[from + 1]) {
                const fromNextItem = {
                    // from 位置的下一个元素
                    uuid: this.savedClipboard[section].rows[from + 1].content.info.uuid,
                    text: this.savedClipboard[section].rows[from + 1].content.info.text,
                    prev: this.savedClipboard[section].rows[from].content.info.prev,
                    next: this.savedClipboard[section].rows[from + 1].content.info.next
                };
                section === 0 ? this.kernel.storage.updatePin(fromNextItem) : this.kernel.storage.update(fromNextItem);
                this.savedClipboard[section].rows[from + 1] = this.lineData(fromNextItem);
            }
            {
                // 在 to 上方插入元素
                if (this.savedClipboard[section].rows[to - 1]) {
                    const toPrevItem = {
                        // 原来 to 位置的上一个元素
                        uuid: this.savedClipboard[section].rows[to - 1].content.info.uuid,
                        text: this.savedClipboard[section].rows[to - 1].content.info.text,
                        prev: this.savedClipboard[section].rows[to - 1].content.info.prev,
                        next: oldFromItem.uuid // 指向即将被移动元素的uuid
                    };
                    section === 0 ? this.kernel.storage.updatePin(toPrevItem) : this.kernel.storage.update(toPrevItem);
                    this.savedClipboard[section].rows[to - 1] = this.lineData(toPrevItem);
                }
                const toItem = {
                    // 原来 to 位置的元素
                    uuid: oldToItem.uuid,
                    text: oldToItem.text,
                    prev: oldFromItem.uuid,
                    next: this.savedClipboard[section].rows[to].content.info.next // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                };
                section === 0 ? this.kernel.storage.updatePin(toItem) : this.kernel.storage.update(toItem);
                const fromItem = {
                    // 被移动元素
                    uuid: oldFromItem.uuid,
                    text: oldFromItem.text,
                    prev: this.savedClipboard[section].rows[to].content.info.prev,
                    next: oldToItem.uuid
                };
                section === 0 ? this.kernel.storage.updatePin(fromItem) : this.kernel.storage.update(fromItem);
                // 修改内存中的值
                this.savedClipboard[section].rows[to] = this.lineData(toItem);
                this.savedClipboard[section].rows[from] = this.lineData(fromItem);
            }
            // 移动位置
            this.savedClipboard[section].rows.splice(to, 0, this.savedClipboard[section].rows[from]);
            this.savedClipboard[section].rows.splice(from > to ? from + 1 : from, 1);
            this.kernel.storage.commit() // 提交事务
            ;
            // 去掉补位元素
            if (this.savedClipboard[section].rows[to].content.info.uuid === null) this.savedClipboard[section].rows.splice(to, 1);
            {
                // 操作 UI
                // 去除偏移
                const _to = from < to ? to - 1 : to;
                const listView = $(this.listId);
                // 移动列表
                if (from < _to) {
                    // 从上往下移动
                    listView.insert({
                        indexPath: $indexPath(section, to),
                        value: this.savedClipboard[section].rows[_to]
                    });
                    listView.delete($indexPath(section, from));
                } else {
                    // 从下往上移动
                    listView.delete($indexPath(section, from));
                    listView.insert({
                        indexPath: $indexPath(section, to),
                        value: this.savedClipboard[section].rows[to]
                    });
                }
                // 修正指示器
                if (copiedIndex && this.copied.indexPath) {
                    const copiedIndex = this.copied.indexPath;
                    if (copiedIndex.section === section) {
                        const copiedUUID = this.copied.uuid;
                        if (copiedIndex.row === from) // 被移动的行是被复制的行
                        this.setCopied(copiedUUID, $indexPath(section, _to));
                        else if (copiedIndex.row > from && copiedIndex.row < _to || copiedIndex.row < from && copiedIndex.row > _to || copiedIndex.row === _to) // 被复制的行介于 from 和 _to 之间或等于 _to
                        // 从上往下移动则 -1 否则 +1
                        this.setCopied(copiedUUID, $indexPath(section, from < _to ? copiedIndex.row - 1 : copiedIndex.row + 1));
                    }
                }
            }
        } catch (error) {
            this.kernel.storage.rollback();
            this.kernel.error(error);
            $ui.alert(error);
        }
    }
    pin(item, indexPath) {
        if (item?.section === "pin") return;
        const res = this.kernel.storage.getPinByMD5(item.md5);
        if (res) {
            $ui.warning("Already exists");
            return;
        }
        item.next = this.savedClipboard[0].rows[0]?.content?.info?.uuid ?? null;
        item.prev = null;
        // 写入数据库
        this.kernel.storage.beginTransaction();
        try {
            this.kernel.storage.insertPin(item);
            if (item.next) {
                // 更改指针
                this.savedClipboard[0].rows[0].content.info.prev = item.uuid;
                this.kernel.storage.updatePin(this.savedClipboard[0].rows[0].content.info);
            }
            this.kernel.storage.commit();
            // 删除原表数据
            this.delete(item.uuid, indexPath);
            const listUI = $(this.listId);
            const lineData = this.lineData(item);
            // 保存到内存中
            this.savedClipboard[0].rows.unshift(lineData);
            this.savedClipboardIndex[item.md5] = 1;
            // UI insert
            listUI.insert({
                indexPath: $indexPath(0, 0),
                value: lineData
            });
            listUI.delete(indexPath);
        } catch (error) {
            this.kernel.storage.rollback();
            this.kernel.error(error);
            $ui.alert(error);
        }
    }
    /**
     * 复制
     * @param {*} text
     * @param {*} uuid
     * @param {Number} index 被复制的行的索引
     */ copy(text, uuid, indexPath) {
        const path = this.kernel.storage.keyToPath(text);
        if (path && $file.exists(path.original)) $clipboard.image = $file.read(path.original).image;
        else this.setClipboardText(text);
        const isMoveToTop = indexPath.section === 1;
        // 将被复制的行移动到最前端
        if (isMoveToTop) this.move(indexPath.row, 0, indexPath.section);
        // 写入缓存并更新数据
        this.setCopied(uuid, isMoveToTop ? $indexPath(indexPath.section, 0) : indexPath);
    }
    edit(text, callback) {
        const editor = new $dgvQV(this.kernel);
        const navButtons = [
            {
                symbol: "square.and.arrow.up",
                tapped: ()=>{
                    if (editor.text) $share.sheet(editor.text);
                    else $ui.warning($l10n("NONE"));
                }
            }
        ];
        if (this.kernel.isUseJsboxNav) editor.uikitPush(text, ()=>callback(editor.text)
        , navButtons);
        else {
            const pageController = editor.getPageController(text, navButtons);
            this.viewController.setEvent("onPop", ()=>callback(editor.text)
            );
            this.viewController.push(pageController);
        }
    }
    getAddTextView() {
        this.edit("", (text)=>{
            if (text !== "") this.add(text);
        });
    }
    loadSavedClipboard() {
        this.kernel.print("load clipboard");
        const initData = (data1)=>{
            try {
                const sorted = this.kernel.storage.sort(data1, this.kernel.setting.get("clipboard.maxItemLength"));
                return sorted.map((data)=>{
                    this.savedClipboardIndex[data.md5] = 1;
                    return this.lineData(data, this.copied.uuid === data.uuid);
                });
            } catch (error) {
                $ui.alert({
                    title: $l10n("REBUILD_DATABASE"),
                    message: $l10n("CLIPBOARD_STRUCTURE_ERROR"),
                    actions: [
                        {
                            title: $l10n("OK"),
                            handler: ()=>{
                                const loading = $229dd9dd444bc99f$require$UIKit.loading();
                                loading.start();
                                this.kernel.storage.rebuild();
                                loading.end();
                                $delay(0.8, ()=>$addin.restart()
                                );
                            }
                        },
                        {
                            title: $l10n("CANCEL")
                        }
                    ]
                });
                this.kernel.error(error);
            }
        };
        this.savedClipboard = [
            {
                rows: initData(this.kernel.storage.allPin()) ?? []
            },
            {
                rows: initData(this.kernel.storage.all()) ?? []
            }
        ];
    }
    searchAction(text) {
        try {
            if (text === "") this.updateList();
            else {
                const res = this.kernel.storage.search(text);
                if (res && res.length > 0) $(this.listId).data = res.map((data)=>this.lineData(data)
                );
            }
        } catch (error) {
            this.updateList();
            throw error;
        }
    }
    menuItems(withDefaultButtons = true) {
        const handlerRewrite = (handler)=>{
            return (sender, indexPath)=>{
                const item = sender.object(indexPath);
                const data = {
                    text: item.content.info.text,
                    uuid: item.content.info.uuid
                };
                handler(data);
            };
        };
        const actions = this.kernel.actionManager.getActions("clipboard").map((action)=>{
            const actionHandler = this.kernel.actionManager.getActionHandler(action.type, action.dir);
            action.handler = handlerRewrite(actionHandler);
            action.title = action.name;
            action.symbol = action.icon;
            return action;
        });
        const defaultButtons = [
            {
                inline: true,
                items: [
                    {
                        title: $l10n("SHARE"),
                        symbol: "square.and.arrow.up",
                        handler: (sender, indexPath)=>{
                            const text = sender.object(indexPath).content.info.text;
                            let shareContent = text;
                            const path = this.kernel.storage.keyToPath(text);
                            if (path && $file.exists(path.original)) {
                                const image = $file.read(path.original)?.image?.png;
                                shareContent = {
                                    name: image.fileName,
                                    data: image
                                };
                            }
                            $share.sheet([
                                shareContent
                            ]);
                        }
                    },
                    {
                        title: $l10n("COPY"),
                        symbol: "square.on.square",
                        handler: (sender, indexPath)=>{
                            const data = sender.object(indexPath);
                            this.copy(data.content.info.text, data.content.info.uuid, indexPath);
                        }
                    },
                    {
                        title: $l10n("DELETE"),
                        symbol: "trash",
                        destructive: true,
                        handler: (sender, indexPath)=>{
                            this.kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), ()=>{
                                const data = sender.object(indexPath);
                                this.delete(data.content.info.uuid, indexPath);
                                sender.delete(indexPath);
                            });
                        }
                    }
                ]
            }
        ];
        return actions.concat(withDefaultButtons ? defaultButtons : []);
    }
    lineData(data, indicator = false) {
        const path = this.kernel.storage.keyToPath(data.text);
        if (path) return {
            copied: {
                hidden: !indicator
            },
            image: {
                src: path.preview,
                hidden: false
            },
            content: {
                info: {
                    text: data.text,
                    section: data.section,
                    uuid: data.uuid,
                    md5: data.md5,
                    height: this.imageContentHeight,
                    prev: data.prev,
                    next: data.next
                }
            }
        };
        else {
            const sliceText = (text)=>{
                // 显示最大长度
                const textMaxLength = this.kernel.setting.get("clipboard.textMaxLength");
                return text.length > textMaxLength ? text.slice(0, textMaxLength) + "..." : text;
            };
            const text1 = sliceText(data.text);
            const height = $text.sizeThatFits({
                text: text1,
                width: $229dd9dd444bc99f$require$UIKit.windowSize.width - this.edges * 2,
                font: $font(this.fontSize)
            }).height;
            return {
                copied: {
                    hidden: !indicator
                },
                image: {
                    hidden: true
                },
                content: {
                    text: text1,
                    info: {
                        text: data.text,
                        section: data.section,
                        uuid: data.uuid,
                        md5: data.md5,
                        height: height,
                        prev: data.prev,
                        next: data.next
                    }
                }
            };
        }
    }
    listTemplate(lines = 0) {
        return {
            props: {
                bgcolor: $color("clear")
            },
            views: [
                {
                    type: "view",
                    props: {
                        id: "copied",
                        circular: this.copiedIndicatorSize,
                        hidden: true,
                        bgcolor: $color("green")
                    },
                    layout: (make, view)=>{
                        make.centerY.equalTo(view.super);
                        make.size.equalTo(this.copiedIndicatorSize);
                        // 放在前面小缝隙的中间 `this.copyedIndicatorSize / 2` 指大小的一半
                        make.left.inset(this.edges / 2 - this.copiedIndicatorSize / 2);
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "content",
                        lines: lines,
                        font: $font(this.fontSize)
                    },
                    layout: (make, view)=>{
                        make.centerY.equalTo(view.super);
                        make.left.right.inset(this.edges);
                    }
                },
                {
                    type: "image",
                    props: {
                        id: "image",
                        hidden: true
                    },
                    layout: $layout.fill
                }
            ]
        };
    }
    getListView() {
        this.loadSavedClipboard();
        return {
            // 剪切板列表
            type: "list",
            props: {
                id: this.listId,
                menu: {
                    items: this.menuItems(this.kernel)
                },
                bgcolor: $229dd9dd444bc99f$require$UIKit.primaryViewBackgroundColor,
                separatorInset: $insets(0, this.edges, 0, 0),
                data: this.savedClipboard,
                template: this.listTemplate(),
                actions: [
                    {
                        // 复制
                        title: $l10n("COPY"),
                        color: $color("systemLink"),
                        handler: (sender, indexPath)=>{
                            const data = sender.object(indexPath);
                            this.copy(data.content.info.text, data.content.info.uuid, indexPath);
                        }
                    },
                    {
                        // 置顶
                        title: $l10n("PIN"),
                        color: $color("orange"),
                        handler: (sender, indexPath)=>{
                            const content = sender.object(indexPath).content.info;
                            delete content.height;
                            this.pin(content, indexPath);
                        }
                    },
                    {
                        // 删除
                        title: " " + $l10n("DELETE") + " ",
                        color: $color("red"),
                        handler: (sender, indexPath)=>{
                            this.kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), ()=>{
                                const data = sender.object(indexPath);
                                this.delete(data.content.info.uuid, indexPath);
                                sender.delete(indexPath);
                            });
                        }
                    }
                ]
            },
            layout: $layout.fill,
            events: {
                ready: ()=>this.listReady()
                ,
                rowHeight: (sender, indexPath)=>{
                    const content = sender.object(indexPath).content;
                    return content.info.height + this.edges * 2;
                },
                didSelect: (sender, indexPath, data)=>{
                    const content = data.content;
                    const text3 = content.info.text;
                    const path = this.kernel.storage.keyToPath(text3);
                    if (path && $file.exists(path.original)) $quicklook.open({
                        image: $file.read(path.original)?.image
                    });
                    else this.edit(content.info.text, (text)=>{
                        if (content.info.md5 !== $text.MD5(text)) this.update(content.info.uuid, text, indexPath);
                    });
                }
            }
        };
    }
    getPageController() {
        const searchBar = new $229dd9dd444bc99f$require$SearchBar();
        // 初始化搜索功能
        searchBar.controller.setEvent("onChange", (text)=>this.searchAction(text)
        );
        const pageController = new $229dd9dd444bc99f$require$PageController();
        pageController.navigationItem.setTitle($l10n("CLIPBOARD")).setTitleView(searchBar).pinTitleView().setRightButtons([
            {
                symbol: "plus.circle",
                tapped: ()=>this.getAddTextView()
            }
        ]).setLeftButtons([
            {
                symbol: "arrow.up.arrow.down.circle",
                tapped: (animate, sender1)=>{
                    $ui.popover({
                        sourceView: sender1,
                        directions: $popoverDirection.up,
                        size: $size(200, 300),
                        views: [
                            {
                                type: "label",
                                props: {
                                    text: $l10n("SORT"),
                                    color: $color("secondaryText"),
                                    font: $font(14)
                                },
                                layout: (make, view)=>{
                                    make.top.equalTo(view.super.safeArea).offset(0);
                                    make.height.equalTo(40);
                                    make.left.inset(20);
                                }
                            },
                            $229dd9dd444bc99f$require$UIKit.separatorLine(),
                            {
                                type: "list",
                                props: {
                                    id: "clipboard-list-sort",
                                    reorder: true,
                                    crossSections: false,
                                    bgcolor: $color("clear"),
                                    data: this.savedClipboard,
                                    template: this.listTemplate(1),
                                    actions: [
                                        {
                                            // 删除
                                            title: "delete",
                                            handler: (sender, indexPath)=>{
                                                const listView = $(this.listId);
                                                const data = listView.object(indexPath);
                                                this.delete(data.content.info.uuid, indexPath);
                                                listView.delete(indexPath);
                                            }
                                        }
                                    ]
                                },
                                events: {
                                    rowHeight: (sender, indexPath)=>{
                                        const obj = sender.object(indexPath);
                                        if (obj.image !== undefined && !obj.image.hidden) // image height
                                        return obj.content?.info?.height;
                                        else // no image
                                        return this.fontSize + this.edges;
                                    },
                                    reorderBegan: (indexPath)=>{
                                        // 用于纠正 rowHeight 高度计算
                                        this.reorder.content = this.savedClipboard[indexPath.section].rows[indexPath.row].content;
                                        this.reorder.image = this.savedClipboard[indexPath.section].rows[indexPath.row].image;
                                        this.reorder.section = indexPath.section;
                                        this.reorder.from = indexPath.row;
                                        this.reorder.to = undefined;
                                    },
                                    reorderMoved: (fromIndexPath, toIndexPath)=>{
                                        this.reorder.section = toIndexPath.section;
                                        this.reorder.to = toIndexPath.row;
                                    },
                                    reorderFinished: ()=>{
                                        if (this.reorder.to === undefined) return;
                                        this.move(this.reorder.from, this.reorder.to, this.reorder.section);
                                    }
                                },
                                layout: (make, view)=>{
                                    make.width.equalTo(view.super);
                                    make.top.equalTo(view.prev.bottom);
                                    make.bottom.inset(0);
                                }
                            }
                        ]
                    });
                }
            },
            {
                symbol: "square.and.arrow.down.on.square",
                tapped: (animate)=>{
                    animate.start();
                    this.readClipboard(true);
                    animate.done();
                }
            }
        ]);
        pageController.navigationController.navigationBar.setBackgroundColor($229dd9dd444bc99f$require$UIKit.primaryViewBackgroundColor);
        if (this.kernel.isUseJsboxNav) pageController.navigationController.navigationBar.withoutStatusBarHeight();
        pageController.setView(this.getListView());
        return pageController;
    }
}
module.exports = $229dd9dd444bc99f$var$Clipboard;

});
parcelRequire.register("dgvQV", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $9a857a42b9a18390$require$UIKit = $1cJLV.UIKit;
var $9a857a42b9a18390$require$NavigationItem = $1cJLV.NavigationItem;
var $9a857a42b9a18390$require$PageController = $1cJLV.PageController;
var $9a857a42b9a18390$require$Sheet = $1cJLV.Sheet;
/**
 * @typedef {import("../../app").AppKernel} AppKernel
 */ class $9a857a42b9a18390$var$Editor {
    /**
     * @param {AppKernel} kernel
     */ constructor(kernel){
        this.kernel = kernel;
        this.id = "editor";
        // 原始数据
        this.originalContent = undefined;
    }
    /**
     * 编辑器内容
     * @param {string} text
     */ set text(text = "") {
        if (this.originalContent === undefined) // 原始内容
        this.originalContent = text;
        this._text = text;
    }
    get text() {
        return this._text;
    }
    getActionButton() {
        return {
            symbol: "bolt.circle",
            tapped: (sender, senderMaybe)=>{
                // senderMaybe 处理 Sheet addNavBar 中的按钮
                if (senderMaybe) sender = senderMaybe;
                const range = $(this.id).selectedRange;
                const content = {
                    text: this.text,
                    selectedRange: range,
                    selectedText: this.text.slice(range.location, range.location + range.length)
                };
                const popover = $ui.popover({
                    sourceView: sender,
                    directions: $popoverDirection.up,
                    size: $size(200, 300),
                    views: [
                        this.kernel.actionManager.getActionListView({
                        }, {
                            didSelect: (sender, indexPath, data)=>{
                                popover.dismiss();
                                const action = this.kernel.actionManager.getActionHandler(data.info.info.type, data.info.info.dir);
                                setTimeout(()=>action(content)
                                , 500);
                            }
                        })
                    ]
                });
            }
        };
    }
    setContent(text) {
        this.text = text;
        $(this.id).text = text;
    }
    getView(type = "text") {
        return {
            type: type,
            layout: $layout.fill,
            props: {
                id: this.id,
                lineNumbers: this.kernel.setting.get("editor.code.lineNumbers"),
                theme: this.kernel.setting.get($device.isDarkMode ? "editor.code.darkTheme" : "editor.code.lightTheme"),
                text: this.text,
                insets: $insets(15, 15, type === "text" ? this.kernel.setting.get("editor.text.insets") : 15, 15)
            },
            events: {
                ready: (sender)=>{
                    if (this.text === "") // 自动弹出键盘
                    setTimeout(()=>sender.focus()
                    , 500);
                },
                didChange: (sender)=>{
                    this.text = sender.text;
                }
            }
        };
    }
    pageSheet(text = "", callback, title, navButtons = [], type = "text") {
        this.text = text;
        navButtons.unshift(this.getActionButton());
        const sheet = new $9a857a42b9a18390$require$Sheet();
        sheet.setView(this.getView(type)).addNavBar({
            title: title,
            popButton: {
                title: $l10n("DONE"),
                tapped: ()=>callback(this.text)
            },
            rightButtons: navButtons
        });
        sheet.pageController.navigationController.navigationBar.contentViewHeightOffset = 0;
        sheet.init().present();
    }
    /**
     *
     * @param {*} text
     * @param {*} callback
     * @param {Array} navButtons 可通过 Editor.text 属性访问内容，如 editor.text
     * @param {*} type
     */ uikitPush(text = "", callback, navButtons = [], type = "text") {
        this.text = text;
        navButtons.unshift(this.getActionButton());
        $9a857a42b9a18390$require$UIKit.push({
            title: "",
            navButtons: navButtons.map((button)=>{
                button.handler = button.tapped;
                button.tapped = undefined;
                return button;
            }),
            views: [
                this.getView(type)
            ],
            // dealloc: () => callback(this.text),
            disappeared: ()=>callback(this.text)
        });
    }
    /**
     *
     * @param {*} text
     * @param {*} callback
     * @param {Array} navButtons 可通过 Editor.text 属性访问内容，如 editor.text
     * @param {*} type
     */ getPageController(text = "", navButtons = [], type = "text") {
        this.text = text;
        navButtons.unshift(this.getActionButton());
        const pageController = new $9a857a42b9a18390$require$PageController();
        pageController.navigationController.navigationBar.contentViewHeightOffset = 0;
        pageController.setView(this.getView(type));
        pageController.navigationItem.setTitle("").setLargeTitleDisplayMode($9a857a42b9a18390$require$NavigationItem.largeTitleDisplayModeNever).setRightButtons(navButtons);
        return pageController;
    }
}
module.exports = $9a857a42b9a18390$var$Editor;

});


parcelRequire.register("cMkik", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $94d9b5cbbb0c4c47$require$Matrix = $1cJLV.Matrix;
var $94d9b5cbbb0c4c47$require$Setting = $1cJLV.Setting;
var $94d9b5cbbb0c4c47$require$PageController = $1cJLV.PageController;
var $94d9b5cbbb0c4c47$require$BarButtonItem = $1cJLV.BarButtonItem;
var $94d9b5cbbb0c4c47$require$Sheet = $1cJLV.Sheet;
var $94d9b5cbbb0c4c47$require$UIKit = $1cJLV.UIKit;

var $dgvQV = parcelRequire("dgvQV");

var $2uLFK = parcelRequire("2uLFK");

/**
 * @typedef {import("../../app").AppKernel} AppKernel
 */ class $94d9b5cbbb0c4c47$var$ActionManager {
    matrixId = "actions";
    matrix;
    reorder = {
    };
    /**
     * @param {AppKernel} kernel
     */ constructor(kernel){
        this.kernel = kernel;
        // path
        this.actionPath = "scripts/action";
        this.actionOrderFile = "order.json";
        this.userActionPath = `${this.kernel.fileStorage.basePath}/user_action`;
        // 用来存储被美化的 Action 分类名称
        this.typeNameMap = {
        };
        // checkUserAction
        this.checkUserAction();
    }
    importExampleAction() {
        try {
            Object.keys(__ACTIONS__).forEach((type)=>{
                const userActionTypePath = `${this.userActionPath}/${type}`;
                Object.keys(__ACTIONS__[type]).forEach((name)=>{
                    if (!$file.exists(`${userActionTypePath}/${name}/main.js`)) {
                        $file.mkdir(userActionTypePath);
                        $file.mkdir(`${userActionTypePath}/${name}`);
                        $file.write({
                            data: $data({
                                string: __ACTIONS__[type][name]["main.js"]
                            }),
                            path: `${userActionTypePath}/${name}/main.js`
                        });
                        $file.write({
                            data: $data({
                                string: __ACTIONS__[type][name]["config.json"]
                            }),
                            path: `${userActionTypePath}/${name}/config.json`
                        });
                        $file.write({
                            data: $data({
                                string: __ACTIONS__[type][name]["README.md"]
                            }),
                            path: `${userActionTypePath}/${name}/README.md`
                        });
                    }
                });
            });
        } catch  {
            $file.list(this.actionPath).forEach((type)=>{
                const actionTypePath = `${this.actionPath}/${type}`;
                if ($file.isDirectory(actionTypePath)) {
                    const userActionTypePath = `${this.userActionPath}/${type}`;
                    $file.list(actionTypePath).forEach((name)=>{
                        if (!$file.exists(`${userActionTypePath}/${name}/main.js`)) {
                            $file.mkdir(userActionTypePath);
                            $file.copy({
                                src: `${actionTypePath}/${name}`,
                                dst: `${userActionTypePath}/${name}`
                            });
                        }
                    });
                }
            });
        }
    }
    checkUserAction() {
        if (!$file.exists(this.userActionPath) || $file.list(this.userActionPath).length === 0) {
            $file.mkdir(this.userActionPath);
            this.importExampleAction();
        }
    }
    getActionTypes() {
        const type = [
            "clipboard",
            "editor"
        ] // 保证 "clipboard", "editor" 排在前面
        ;
        return type.concat($file.list(this.userActionPath).filter((dir)=>{
            // 获取 type.indexOf(dir) < 0 的文件夹名
            if ($file.isDirectory(`${this.userActionPath}/${dir}`) && type.indexOf(dir) < 0) return dir;
        }));
    }
    getActionOrder(type) {
        const path = `${this.userActionPath}/${type}/${this.actionOrderFile}`;
        if ($file.exists(path)) return JSON.parse($file.read(path).string);
        else return [];
    }
    getActionHandler(type, name, basePath) {
        if (!basePath) basePath = `${this.userActionPath}/${type}/${name}`;
        const config = JSON.parse($file.read(`${basePath}/config.json`).string);
        return async (data)=>{
            try {
                const script = $file.read(`${basePath}/main.js`).string;
                const MyAction = new Function("Action", `${script}\n return MyAction`)($2uLFK);
                const action = new MyAction(this.kernel, config, data);
                return await action.do();
            } catch (error) {
                $ui.error(error);
                this.kernel.error(error);
            }
        };
    }
    getActions(type) {
        const actions = [];
        const typePath = `${this.userActionPath}/${type}`;
        if (!$file.exists(typePath)) return [];
        const pushAction = (item)=>{
            const basePath = `${typePath}/${item}/`;
            if ($file.isDirectory(basePath)) {
                const config = JSON.parse($file.read(basePath + "config.json").string);
                actions.push(Object.assign(config, {
                    dir: item,
                    type: type,
                    name: config.name ?? item,
                    icon: config.icon
                }));
            }
        };
        // push 有顺序的 Action
        const order = this.getActionOrder(type);
        order.forEach((item)=>pushAction(item)
        );
        // push 剩下的 Action
        $file.list(typePath).forEach((item)=>{
            if (order.indexOf(item) === -1) pushAction(item);
        });
        return actions;
    }
    getTypeName(type) {
        const typeUpperCase = type.toUpperCase();
        const l10n = $l10n(typeUpperCase);
        const name = l10n === typeUpperCase ? type : l10n;
        this.typeNameMap[name] = type;
        return name;
    }
    getTypeDir(name) {
        return this.typeNameMap[name] ?? name;
    }
    actionToData(action) {
        return {
            name: {
                text: action.name
            },
            icon: action.icon.slice(0, 5) === "icon_" ? {
                icon: $icon(action.icon.slice(5, action.icon.indexOf(".")), $color("#ffffff"))
            } : {
                image: $image(action.icon)
            },
            color: {
                bgcolor: this.kernel.setting.getColor(action.color)
            },
            info: {
                info: action
            } // 此处实际上是 info 模板的 props，所以需要 { info: action }
        };
    }
    titleView(title) {
        return {
            name: {
                hidden: true
            },
            icon: {
                hidden: true
            },
            color: {
                hidden: true
            },
            button: {
                hidden: true
            },
            bgcolor: {
                hidden: true
            },
            info: {
                hidden: false,
                info: {
                    title: title
                }
            }
        };
    }
    getActionListView(props = {
    }, events = {
    }) {
        const data = [];
        this.getActionTypes().forEach((type)=>{
            const section = {
                title: this.getTypeName(type),
                rows: []
            };
            this.getActions(type).forEach((action)=>{
                section.rows.push(this.actionToData(action));
            });
            data.push(section);
        });
        return {
            type: "list",
            layout: (make, view)=>{
                make.top.width.equalTo(view.super.safeArea);
                make.bottom.inset(0);
            },
            events: events,
            props: Object.assign({
                reorder: false,
                bgcolor: $color("clear"),
                rowHeight: 60,
                sectionTitleHeight: 30,
                stickyHeader: true,
                data: data,
                template: {
                    props: {
                        bgcolor: $color("clear")
                    },
                    views: [
                        {
                            type: "image",
                            props: {
                                id: "color",
                                cornerRadius: 8,
                                smoothCorners: true
                            },
                            layout: (make, view)=>{
                                make.centerY.equalTo(view.super);
                                make.left.inset(15);
                                make.size.equalTo($size(30, 30));
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: "icon",
                                tintColor: $color("#ffffff")
                            },
                            layout: (make, view)=>{
                                make.centerY.equalTo(view.super);
                                make.left.inset(20);
                                make.size.equalTo($size(20, 20));
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "name",
                                lines: 1,
                                font: $font(16)
                            },
                            layout: (make, view)=>{
                                make.height.equalTo(30);
                                make.centerY.equalTo(view.super);
                                make.left.equalTo(view.prev.right).offset(15);
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "info"
                            }
                        }
                    ]
                }
            }, props)
        };
    }
    editActionInfoPageSheet(info, done) {
        const actionTypes = this.getActionTypes();
        const actionTypesIndex = {
        } // 用于反查索引
        ;
        actionTypes.forEach((key, index)=>{
            actionTypesIndex[key] = index;
        });
        this.editingActionInfo = info ?? {
            dir: this.kernel.uuid(),
            type: "clipboard",
            name: "MyAction",
            color: "#CC00CC",
            icon: "icon_062.png",
            description: ""
        };
        const SettingUI = new $94d9b5cbbb0c4c47$require$Setting({
            structure: {
            },
            set: (key, value)=>{
                if (key === "type") this.editingActionInfo[key] = value[1];
                else this.editingActionInfo[key] = value;
                return true;
            },
            get: (key, _default = null)=>{
                if (key === "type") return actionTypesIndex[this.editingActionInfo.type];
                if (Object.prototype.hasOwnProperty.call(this.editingActionInfo, key)) return this.editingActionInfo[key];
                else return _default;
            }
        });
        const nameInput = SettingUI.createInput("name", [
            "pencil.circle",
            "#FF3366"
        ], $l10n("NAME"));
        const createColor = SettingUI.createColor("color", [
            "pencil.tip.crop.circle",
            "#0066CC"
        ], $l10n("COLOR"));
        const iconInput = SettingUI.createIcon("icon", [
            "star.circle",
            "#FF9933"
        ], $l10n("ICON"), this.kernel.setting.getColor(this.editingActionInfo.color));
        const typeMenu = SettingUI.createMenu("type", [
            "tag.circle",
            "#33CC33"
        ], $l10n("TYPE"), actionTypes, true);
        const description = {
            type: "view",
            views: [
                {
                    type: "text",
                    props: {
                        id: "action-text",
                        textColor: $color("#000000", "secondaryText"),
                        bgcolor: $color("systemBackground"),
                        text: this.editingActionInfo.description,
                        insets: $insets(10, 10, 10, 10)
                    },
                    layout: $layout.fill,
                    events: {
                        tapped: (sender)=>{
                            $("actionInfoPageSheetList").scrollToOffset($point(0, info ? 230 : 280));
                            setTimeout(()=>sender.focus()
                            , 200);
                        },
                        didChange: (sender)=>{
                            this.editingActionInfo.description = sender.text;
                        }
                    }
                }
            ],
            layout: $layout.fill
        };
        const data = [
            {
                title: $l10n("INFORMATION"),
                rows: [
                    nameInput,
                    createColor,
                    iconInput
                ]
            },
            {
                title: $l10n("DESCRIPTION"),
                rows: [
                    description
                ]
            }
        ];
        // 只有新建时才可选择类型
        if (!info) data[0].rows = data[0].rows.concat(typeMenu);
        const sheet = new $94d9b5cbbb0c4c47$require$Sheet();
        sheet.setView({
            type: "list",
            props: {
                id: "actionInfoPageSheetList",
                bgcolor: $color("insetGroupedBackground"),
                style: 2,
                separatorInset: $insets(0, 50, 0, 10),
                data: data
            },
            layout: $layout.fill,
            events: {
                rowHeight: (sender, indexPath)=>indexPath.section === 1 ? 120 : 50
            }
        }).addNavBar({
            title: "",
            popButton: {
                title: "Done",
                tapped: ()=>{
                    this.saveActionInfo(this.editingActionInfo);
                    // 更新 clipboard 中的 menu
                    const Clipboard = (parcelRequire("2Ygkq"));
                    Clipboard.updateMenu(this.kernel);
                    if (done) done(this.editingActionInfo);
                }
            }
        }).init().present();
    }
    editActionMainJs(text = "", info) {
        const editor = new $dgvQV(this.kernel);
        editor.pageSheet(text, (content)=>{
            this.saveMainJs(info, content);
        }, info.name, [
            {
                symbol: "book.circle",
                tapped: ()=>{
                    const content = $file.read("scripts/action/README.md").string;
                    const sheet = new $94d9b5cbbb0c4c47$require$Sheet();
                    sheet.setView({
                        type: "markdown",
                        props: {
                            content: content
                        },
                        layout: (make, view)=>{
                            make.size.equalTo(view.super);
                        }
                    }).init().present();
                }
            }
        ], "code");
    }
    saveActionInfo(info) {
        const path = `${this.userActionPath}/${info.type}/${info.dir}`;
        if (!$file.exists(path)) $file.mkdir(path);
        $file.write({
            data: $data({
                string: JSON.stringify({
                    icon: info.icon,
                    color: info.color,
                    name: info.name,
                    description: info.description
                })
            }),
            path: `${path}/config.json`
        });
    }
    saveMainJs(info, content) {
        const path = `${this.userActionPath}/${info.type}/${info.dir}`;
        const mainJsPath = `${path}/main.js`;
        if (!$file.exists(path)) $file.mkdir(path);
        if ($text.MD5(content) === $text.MD5($file.read(mainJsPath)?.string ?? "")) return;
        $file.write({
            data: $data({
                string: content
            }),
            path: mainJsPath
        });
    }
    saveOrder(type, order) {
        $file.write({
            data: $data({
                string: JSON.stringify(order)
            }),
            path: `${this.userActionPath}/${type}/${this.actionOrderFile}`
        });
    }
    move(from, to, data) {
        if (from.section === to.section && from.row === to.row) return;
        // 处理 data 数据
        data = data.map((section)=>{
            section.rows = section.rows.map((item)=>item.info.info
            );
            return section;
        });
        const fromSection = data[from.section], toSection = data[to.section];
        const getOrder = (section)=>{
            const order = [];
            data[section].rows.forEach((item)=>order.push(item.dir)
            );
            return order;
        };
        const updateUI = (insertFirst = true, type)=>{
            const actionsView = this.matrix;
            const toData = this.actionToData(Object.assign(toSection.rows[to.row], {
                type: type
            }));
            if (insertFirst) {
                actionsView.insert({
                    indexPath: $indexPath(to.section, to.row + 1),
                    value: toData
                }, false);
                actionsView.delete(from, false);
            } else {
                actionsView.delete(from, false);
                actionsView.insert({
                    indexPath: to,
                    value: toData
                }, false);
            }
        };
        const fromType = this.getTypeDir(fromSection.title);
        const toType = this.getTypeDir(toSection.title);
        // 判断是否跨 section
        if (from.section === to.section) this.saveOrder(fromType, getOrder(from.section));
        else {
            // 跨 section 则同时移动 Action 目录
            this.saveOrder(fromType, getOrder(from.section));
            this.saveOrder(toType, getOrder(to.section));
            $file.move({
                src: `${this.userActionPath}/${fromType}/${toSection.rows[to.row].dir}`,
                dst: `${this.userActionPath}/${toType}/${toSection.rows[to.row].dir}`
            });
        }
        // 跨 section 时先插入或先删除无影响，type 永远是 to 的 type
        updateUI(from.row < to.row, toType);
    }
    delete(info) {
        $file.delete(`${this.userActionPath}/${info.type}/${info.dir}`);
    }
    menuItems() {
        // 卡片长按菜单
        return [
            {
                // 编辑信息
                title: $l10n("EDIT_DETAILS"),
                symbol: "slider.horizontal.3",
                handler: (sender, indexPath)=>{
                    const view = sender.cell(indexPath);
                    const oldInfo = view.get("info").info;
                    this.editActionInfoPageSheet(oldInfo, (info)=>{
                        // 更新视图信息
                        view.get("info").info = info;
                        view.get("color").bgcolor = this.kernel.setting.getColor(info.color);
                        view.get("name").text = info.name;
                        if (info.icon.slice(0, 5) === "icon_") view.get("icon").icon = $icon(info.icon.slice(5, info.icon.indexOf(".")), $color("#ffffff"));
                        else view.get("icon").image = $image(info.icon);
                    });
                }
            },
            {
                // 编辑脚本
                title: $l10n("EDIT_SCRIPT"),
                symbol: "square.and.pencil",
                handler: (sender, indexPath, data)=>{
                    const info = data.info.info;
                    if (!info) return;
                    const path = `${this.userActionPath}/${info.type}/${info.dir}/main.js`;
                    const main = $file.read(path).string;
                    this.editActionMainJs(main, info);
                }
            },
            {
                // 删除
                title: $l10n("DELETE"),
                symbol: "trash",
                destructive: true,
                handler: (sender, indexPath, data)=>{
                    this.kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), ()=>{
                        this.delete(data.info.info);
                        sender.delete(indexPath);
                    });
                }
            }
        ];
    }
    getNavButtons() {
        return [
            {
                // 添加
                symbol: "plus.circle",
                menu: {
                    pullDown: true,
                    asPrimary: true,
                    items: [
                        {
                            title: $l10n("CREATE_NEW_ACTION"),
                            handler: ()=>{
                                this.editActionInfoPageSheet(null, (info)=>{
                                    this.matrix.insert({
                                        indexPath: $indexPath(this.getActionTypes().indexOf(info.type), 0),
                                        value: this.actionToData(info)
                                    });
                                    const MainJsTemplate = $file.read(`${this.actionPath}/template.js`).string;
                                    this.saveMainJs(info, MainJsTemplate);
                                    this.editActionMainJs(MainJsTemplate, info);
                                });
                            }
                        },
                        {
                            title: $l10n("CREATE_NEW_TYPE"),
                            handler: ()=>{
                                $input.text({
                                    text: "",
                                    placeholder: $l10n("CREATE_NEW_TYPE"),
                                    handler: (text)=>{
                                        text = text.trim();
                                        if (text === "") {
                                            $ui.toast($l10n("INVALID_VALUE"));
                                            return;
                                        }
                                        const path = `${this.userActionPath}/${text}`;
                                        if ($file.isDirectory(path)) $ui.warning($l10n("TYPE_ALREADY_EXISTS"));
                                        else {
                                            $file.mkdir(path);
                                            $ui.success($l10n("SUCCESS"));
                                        }
                                    }
                                });
                            }
                        }
                    ]
                }
            },
            {
                // 排序
                symbol: "arrow.up.arrow.down.circle",
                tapped: (animate, sender)=>{
                    $ui.popover({
                        sourceView: sender,
                        directions: $popoverDirection.up,
                        size: $size(200, 300),
                        views: [
                            this.getActionListView({
                                reorder: true,
                                actions: [
                                    {
                                        // 删除
                                        title: "delete",
                                        handler: (sender, indexPath)=>{
                                            const matrixView = this.matrix;
                                            const info = matrixView.object(indexPath, false).info.info;
                                            this.delete(info);
                                            matrixView.delete(indexPath, false);
                                        }
                                    }
                                ]
                            }, {
                                reorderBegan: (indexPath)=>{
                                    this.reorder.from = indexPath;
                                    this.reorder.to = undefined;
                                },
                                reorderMoved: (fromIndexPath, toIndexPath)=>{
                                    this.reorder.to = toIndexPath;
                                },
                                reorderFinished: (data)=>{
                                    if (this.reorder.to === undefined) return;
                                    this.move(this.reorder.from, this.reorder.to, data);
                                }
                            })
                        ]
                    });
                }
            }
        ];
    }
    actionsToData() {
        // 格式化数据供 matrix 使用
        const data = [];
        this.getActionTypes().forEach((type)=>{
            const section = {
                title: this.getTypeName(type),
                items: []
            };
            this.getActions(type).forEach((action)=>{
                section.items.push(this.actionToData(action));
            });
            data.push(section);
        });
        return data;
    }
    getMatrixView({ columns: columns = 2 , spacing: spacing = 15 , itemHeight: itemHeight = 100  } = {
    }) {
        this.matrix = $94d9b5cbbb0c4c47$require$Matrix.create({
            type: "matrix",
            props: {
                id: this.matrixId,
                columns: columns,
                itemHeight: itemHeight,
                spacing: spacing,
                bgcolor: $94d9b5cbbb0c4c47$require$UIKit.scrollViewBackgroundColor,
                menu: {
                    items: this.menuItems()
                },
                data: this.actionsToData(),
                template: {
                    props: {
                        smoothCorners: true,
                        cornerRadius: 10,
                        bgcolor: $color("#ffffff", "#242424")
                    },
                    views: [
                        {
                            type: "image",
                            props: {
                                id: "color",
                                cornerRadius: 8,
                                smoothCorners: true
                            },
                            layout: (make)=>{
                                make.top.left.inset(10);
                                make.size.equalTo($size(30, 30));
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: "icon",
                                tintColor: $color("#ffffff")
                            },
                            layout: (make)=>{
                                make.top.left.inset(15);
                                make.size.equalTo($size(20, 20));
                            }
                        },
                        {
                            // button
                            type: "button",
                            props: {
                                bgcolor: $color("clear"),
                                tintColor: $94d9b5cbbb0c4c47$require$UIKit.textColor,
                                titleColor: $94d9b5cbbb0c4c47$require$UIKit.textColor,
                                contentEdgeInsets: $insets(0, 0, 0, 0),
                                titleEdgeInsets: $insets(0, 0, 0, 0),
                                imageEdgeInsets: $insets(0, 0, 0, 0)
                            },
                            views: [
                                {
                                    type: "image",
                                    props: {
                                        symbol: "ellipsis.circle"
                                    },
                                    layout: (make, view)=>{
                                        make.center.equalTo(view.super);
                                        make.size.equalTo($94d9b5cbbb0c4c47$require$BarButtonItem.iconSize);
                                    }
                                }
                            ],
                            events: {
                                tapped: (sender)=>{
                                    const info = sender.next.info;
                                    if (!info) return;
                                    const path = `${this.userActionPath}/${info.type}/${info.dir}/main.js`;
                                    const main = $file.read(path).string;
                                    this.editActionMainJs(main, info);
                                }
                            },
                            layout: (make)=>{
                                make.top.right.inset(0);
                                make.size.equalTo($94d9b5cbbb0c4c47$require$BarButtonItem.size);
                            }
                        },
                        {
                            // 用来保存信息
                            type: "view",
                            props: {
                                id: "info",
                                hidden: true
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "name",
                                font: $font(16)
                            },
                            layout: (make, view)=>{
                                make.bottom.left.inset(10);
                                make.width.equalTo(view.super);
                            }
                        }
                    ]
                }
            },
            layout: $layout.fill,
            events: {
                didSelect: (sender, indexPath, data)=>{
                    const info = data.info.info;
                    this.getActionHandler(info.type, info.dir)({
                        text: info.type === "clipboard" || info.type === "uncategorized" ? $clipboard.text : null,
                        uuid: null
                    });
                },
                pulled: (sender)=>{
                    $delay(0.5, ()=>{
                        sender.endRefreshing();
                        this.matrix.update(this.actionsToData());
                    });
                }
            }
        });
        return this.matrix.definition;
    }
    getPageView() {
        const pageController = new $94d9b5cbbb0c4c47$require$PageController();
        pageController.navigationItem.setTitle($l10n("ACTIONS")).setRightButtons(this.getNavButtons());
        pageController.setView(this.getMatrixView());
        return pageController.getPage();
    }
    present() {
        const actionSheet = new $94d9b5cbbb0c4c47$require$Sheet();
        actionSheet.setView(this.getMatrixView()).addNavBar({
            title: $l10n("ACTIONS"),
            popButton: {
                symbol: "xmark.circle"
            },
            rightButtons: this.getNavButtons()
        }).init().present();
    }
}
module.exports = $94d9b5cbbb0c4c47$var$ActionManager;

});
parcelRequire.register("2uLFK", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $1d135cd4f734fd97$require$Sheet = $1cJLV.Sheet;
/**
 * @typedef {import("../app").AppKernel} AppKernel
 */ /**
 * @typedef {Action} Action
 */ class $1d135cd4f734fd97$var$Action {
    /**
     *
     * @param {AppKernel} kernel
     * @param {*} config
     * @param {*} data
     */ constructor(kernel, config, data){
        this.kernel = kernel;
        this.config = config;
        Object.assign(this, data);
        const l10n = this.l10n();
        Object.keys(l10n).forEach((language)=>{
            this.kernel.l10n(language, l10n[language]);
        });
    }
    l10n() {
        return {
        };
    }
    push(args) {
        this.pageSheet(args);
    }
    /**
     * page sheet
     * @param {*} args 
     *  {
            view: 视图对象
            title: 中间标题
            done: 点击左上角按钮后的回调函数
            doneText: 左上角文本
        }
     */ pageSheet({ view: view , title: title = "" , done: done , doneText: doneText = $l10n("DONE")  }) {
        const sheet = new $1d135cd4f734fd97$require$Sheet();
        sheet.setView(view).addNavBar({
            title: title,
            popButton: {
                title: doneText,
                tapped: ()=>{
                    if (done) done();
                }
            }
        }).init().present();
    }
    /**
     * 获取所有剪切板数据
     * @returns Array
     */ getAllClipboard() {
        return this.kernel.storage.all().map((item)=>item.text
        );
    }
    getAllContent() {
        return this.getAllClipboard();
    }
    setContent(text) {
        this.text = text;
        this.kernel.editor.setContent(text);
    }
    get originalContent() {
        return this.kernel.editor.originalContent;
    }
    async runAction(type, name) {
        const handler = this.kernel.actionManager.getActionHandler(type, name);
        return new Promise(async (resolve, reject)=>{
            if (typeof handler === "function") {
                const result = await handler();
                resolve(result);
            } else reject(`No such Action: ${type}/${name}`);
        });
    }
}
module.exports = $1d135cd4f734fd97$var$Action;

});


parcelRequire.register("4lgvP", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $3295ee9f84916aa3$require$versionCompare = $1cJLV.versionCompare;
var $3295ee9f84916aa3$require$UIKit = $1cJLV.UIKit;
var $3295ee9f84916aa3$require$Sheet = $1cJLV.Sheet;

var $iRMmt = parcelRequire("iRMmt");

var $5oABG = parcelRequire("5oABG");
/**
 * @typedef {import("./app").AppKernel} AppKernel
 */ /**
 * @type {AppKernel}
 */ let $3295ee9f84916aa3$var$kernel;
function $3295ee9f84916aa3$var$clipboard() {
    $3295ee9f84916aa3$var$kernel.setting.method.exportClipboard = (animate)=>{
        animate.actionStart();
        $3295ee9f84916aa3$var$kernel.storage.export((success)=>{
            if (success) animate.actionDone();
            else animate.actionCancel();
        });
    };
    $3295ee9f84916aa3$var$kernel.setting.method.importClipboard = (animate)=>{
        animate.actionStart();
        $ui.alert({
            title: $l10n("ALERT_INFO"),
            message: $l10n("OVERWRITE_ALERT"),
            actions: [
                {
                    title: $l10n("OK"),
                    handler: ()=>{
                        $drive.open({
                            handler: (data)=>{
                                if (data === undefined) {
                                    animate.actionCancel();
                                    return;
                                }
                                if (data.fileName.slice(-2) === "db" || data.fileName.slice(-3) === "zip") $3295ee9f84916aa3$var$kernel.storage.import(data).then(()=>{
                                    animate.actionDone();
                                    $delay(0.3, ()=>{
                                        $addin.restart();
                                    });
                                }).catch((error)=>{
                                    $ui.error(error);
                                    $3295ee9f84916aa3$var$kernel.print(error);
                                    animate.actionCancel();
                                });
                                else {
                                    $ui.warning($l10n("FILE_TYPE_ERROR"));
                                    animate.actionCancel();
                                }
                            }
                        });
                    }
                },
                {
                    title: $l10n("CANCEL"),
                    handler: ()=>animate.actionCancel()
                }
            ]
        });
    };
    $3295ee9f84916aa3$var$kernel.setting.method.sync = (animate)=>{
        $ui.alert({
            title: $l10n("SYNC_NOW"),
            message: $l10n("SYNC_ALERT_INFO"),
            actions: [
                {
                    title: $l10n("CANCEL")
                },
                {
                    title: $l10n("OK"),
                    handler: ()=>{
                        animate.actionStart();
                        setTimeout(()=>{
                            $3295ee9f84916aa3$var$kernel.storage.syncByiCloud(true).then(()=>{
                                animate.actionDone();
                            }).catch((error)=>{
                                $ui.error(error);
                                $3295ee9f84916aa3$var$kernel.print(error);
                                animate.actionCancel();
                            });
                        }, 200);
                    }
                }
            ]
        });
    };
    $3295ee9f84916aa3$var$kernel.setting.method.deleteICloudData = (animate)=>{
        $3295ee9f84916aa3$var$kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), ()=>{
            if ($3295ee9f84916aa3$var$kernel.storage.deleteICloudData()) animate.actionDone();
            else $ui.toast($l10n("DELETE_ERROR"));
        });
    };
    $3295ee9f84916aa3$var$kernel.setting.method.rebuildDatabase = (animate)=>{
        animate.actionStart();
        const rebuildDatabase = ()=>{
            try {
                $3295ee9f84916aa3$var$kernel.storage.rebuild();
                animate.actionDone();
                $delay(0.8, ()=>$addin.restart()
                );
            } catch (error) {
                animate.actionCancel();
                $ui.alert(error);
            }
        };
        $ui.alert({
            title: $l10n("REBUILD_DATABASE_ALERT"),
            actions: [
                {
                    title: $l10n("REBUILD"),
                    style: $alertActionType.destructive,
                    handler: ()=>{
                        rebuildDatabase();
                    }
                },
                {
                    title: $l10n("CANCEL")
                }
            ]
        });
    };
}
function $3295ee9f84916aa3$var$action() {
    $3295ee9f84916aa3$var$kernel.setting.method.exportAction = (animate)=>{
        animate.actionStart();
        // 备份动作
        const fileName = "actions.zip";
        const tempPath = `${$3295ee9f84916aa3$var$kernel.fileStorage.basePath}/${fileName}`;
        $archiver.zip({
            directory: $3295ee9f84916aa3$var$kernel.actionManager.userActionPath,
            dest: tempPath,
            handler: ()=>{
                $share.sheet({
                    items: [
                        {
                            name: fileName,
                            data: $data({
                                path: tempPath
                            })
                        }
                    ],
                    handler: (success)=>{
                        if (success) animate.actionDone();
                        else animate.actionCancel();
                        $file.delete(tempPath);
                    }
                });
            }
        });
    };
    $3295ee9f84916aa3$var$kernel.setting.method.importAction = (animate)=>{
        animate.actionStart();
        $drive.open({
            handler: (data)=>{
                if (data === undefined) {
                    animate.actionCancel();
                    return;
                }
                if (data.fileName.slice(-3) === "zip") {
                    const path = `${$3295ee9f84916aa3$var$kernel.fileStorage.basePath}/action_import`;
                    $archiver.unzip({
                        file: data,
                        dest: path,
                        handler: ()=>{
                            $file.list(path).forEach((item)=>{
                                if ($file.isDirectory(`${path}/${item}`)) $file.copy({
                                    src: `${path}/${item}`,
                                    dst: `${$3295ee9f84916aa3$var$kernel.actionManager.userActionPath}${item}`
                                });
                            });
                            $file.delete(path);
                            animate.actionDone();
                        }
                    });
                } else {
                    $ui.warning($l10n("FILE_TYPE_ERROR"));
                    animate.actionCancel();
                }
            }
        });
    };
    $3295ee9f84916aa3$var$kernel.setting.method.importExampleAction = (animate)=>{
        animate.actionStart();
        $3295ee9f84916aa3$var$kernel.actionManager.importExampleAction();
        animate.actionDone();
    };
    $3295ee9f84916aa3$var$kernel.setting.method.rebuildAction = (animate)=>{
        animate.actionStart();
        $ui.alert({
            title: $l10n("REBUILD_ACTION_DATABASE_ALERT"),
            actions: [
                {
                    title: $l10n("REBUILD"),
                    style: $alertActionType.destructive,
                    handler: ()=>{
                        $file.delete($3295ee9f84916aa3$var$kernel.actionManager.userActionPath);
                        animate.actionDone();
                        $delay(0.8, ()=>$addin.restart()
                        );
                    }
                },
                {
                    title: $l10n("CANCEL")
                }
            ]
        });
    };
}

function $3295ee9f84916aa3$var$keyboard() {
    $3295ee9f84916aa3$var$kernel.setting.method.previewKeyboard = (animate)=>{
        animate.touchHighlightStart();
        const Keyboard = (parcelRequire("ehiE8"));
        const keyboard = new Keyboard($3295ee9f84916aa3$var$kernel).getView();
        $3295ee9f84916aa3$require$UIKit.push({
            views: [
                keyboard
            ],
            disappeared: ()=>animate.touchHighlightEnd()
        });
    };
    $3295ee9f84916aa3$var$kernel.setting.method.setKeyboardQuickStart = (animate)=>{
        $iRMmt.sheet();
    };
}

function $3295ee9f84916aa3$var$todayWidget() {
    $3295ee9f84916aa3$var$kernel.setting.method.previewTodayWidget = (animate)=>{
        animate.touchHighlightStart();
        const Today = (parcelRequire("knL6n"));
        const today = new Today($3295ee9f84916aa3$var$kernel).getView();
        $3295ee9f84916aa3$require$UIKit.push({
            views: [
                today
            ],
            disappeared: ()=>animate.touchHighlightEnd()
        });
    };
    $3295ee9f84916aa3$var$kernel.setting.method.setTodayWidgetActions = (animate)=>{
        $5oABG.sheet($3295ee9f84916aa3$var$kernel);
    };
}

/**
 * 注入设置中的脚本类型方法
 * @param {AppKernel} kernel
 */ function $3295ee9f84916aa3$var$settingMethods(appKernel) {
    $3295ee9f84916aa3$var$kernel = appKernel;
    $3295ee9f84916aa3$var$kernel.setting.method.readme = (animate)=>{
        const content = (()=>{
            const file = $device.info?.language?.startsWith("zh") ? "README_CN.md" : "README.md";
            try {
                return __README__[file];
            } catch  {
                return $file.read(file).string;
            }
        })();
        const sheet = new $3295ee9f84916aa3$require$Sheet();
        sheet.setView({
            type: "markdown",
            props: {
                content: content
            },
            layout: (make, view)=>{
                make.size.equalTo(view.super);
            }
        }).init().present();
    };
    $3295ee9f84916aa3$var$kernel.setting.method.checkUpdate = (animate)=>{
        animate.actionStart();
        $3295ee9f84916aa3$var$kernel.checkUpdate((content)=>{
            $file.write({
                data: $data({
                    string: content
                }),
                path: "scripts/libs/easy-jsbox.js"
            });
            $ui.toast("The framework has been updated.");
        });
        $http.get({
            url: "https://raw.githubusercontent.com/ipuppet/CAIO/master/config.json",
            handler: (resp)=>{
                const version = resp.data?.info.version;
                const config = JSON.parse($file.read("config.json").string);
                if ($3295ee9f84916aa3$require$versionCompare(version, config.info.version) > 0) $ui.alert({
                    title: "New Version",
                    message: `New version found: ${version}\nUpdate via Github or click the button to open Erots.`,
                    actions: [
                        {
                            title: $l10n("CANCEL")
                        },
                        {
                            title: "Erots",
                            handler: ()=>{
                                $addin.run({
                                    name: "Erots",
                                    query: {
                                        q: "show",
                                        objectId: "603e6eaaca0dd64fcef93e2d"
                                    }
                                });
                            }
                        }
                    ]
                });
                else $ui.toast("No need to update");
                animate.actionDone();
            }
        });
    };
    $3295ee9f84916aa3$var$kernel.setting.method.previewWidget = (animate)=>{
        const { Widget: Widget  } = (parcelRequire("l35Ko"));
        const widgets = {
        };
        try {
            JSON.parse($file.read("widget-options.json").string).forEach((item)=>{
                widgets[item.name] = item.value;
            });
        } catch (error) {
            $ui.error(error);
            return;
        }
        $ui.menu({
            items: Object.keys(widgets),
            handler: (name)=>{
                Widget.render(widgets[name]);
            }
        });
    };
    $3295ee9f84916aa3$var$clipboard();
    $3295ee9f84916aa3$var$action();
    $3295ee9f84916aa3$var$keyboard();
    $3295ee9f84916aa3$var$todayWidget();
}
module.exports = $3295ee9f84916aa3$var$settingMethods;

});
parcelRequire.register("iRMmt", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $dbc2b0d4164c0529$require$UIKit = $1cJLV.UIKit;
var $dbc2b0d4164c0529$require$Sheet = $1cJLV.Sheet;
var $dbc2b0d4164c0529$require$NavigationItem = $1cJLV.NavigationItem;
var $dbc2b0d4164c0529$require$PageController = $1cJLV.PageController;
class $dbc2b0d4164c0529$var$KeyboardScripts {
    constructor(){
        this.listId = "keyboard-script-list";
    }
    static getAddins() {
        const addins = $cache.get("keyboard.addins");
        if (addins === undefined) {
            this.setAddins();
            return [];
        }
        return JSON.parse(addins);
    }
    static setAddins(list = []) {
        list.map((item, i)=>{
            if (item === null) list.splice(i, 1);
        });
        $cache.set("keyboard.addins", JSON.stringify(list));
    }
    getUnsetAddins() {
        const current = $addin.current.name // 用于排除自身
        ;
        const addins = $dbc2b0d4164c0529$var$KeyboardScripts.getAddins();
        const res = [];
        $addin.list?.forEach((addin)=>{
            const name = addin.displayName;
            if (addins.indexOf(name) === -1 && current !== name) res.push(name);
        });
        return res;
    }
    add() {
        const view = {
            type: "list",
            props: {
                data: this.getUnsetAddins()
            },
            events: {
                didSelect: (sender, indexPath, data)=>{
                    const addins = $dbc2b0d4164c0529$var$KeyboardScripts.getAddins();
                    addins.unshift(data);
                    $dbc2b0d4164c0529$var$KeyboardScripts.setAddins(addins);
                    $(this.listId).insert({
                        indexPath: $indexPath(0, 0),
                        value: data
                    });
                    sender.delete(indexPath);
                }
            },
            layout: $layout.fill
        };
        const sheet = new $dbc2b0d4164c0529$require$Sheet();
        sheet.setView(view).addNavBar({
            title: $l10n("ADD")
        }).init().present();
    }
    getNavButtons() {
        return [
            {
                symbol: "plus",
                tapped: ()=>this.add()
            }
        ];
    }
    getListView() {
        return {
            type: "list",
            props: {
                id: this.listId,
                reorder: true,
                data: $dbc2b0d4164c0529$var$KeyboardScripts.getAddins(),
                actions: [
                    {
                        title: "delete",
                        handler: (sender, indexPath)=>{
                            $dbc2b0d4164c0529$var$KeyboardScripts.setAddins(sender.data);
                        }
                    }
                ]
            },
            events: {
                reorderFinished: (data)=>{
                    $dbc2b0d4164c0529$var$KeyboardScripts.setAddins(data);
                }
            },
            layout: $layout.fill
        };
    }
    static sheet() {
        const sheet = new $dbc2b0d4164c0529$require$Sheet();
        const keyboardScripts = new $dbc2b0d4164c0529$var$KeyboardScripts();
        sheet.setView(keyboardScripts.getListView()).addNavBar({
            title: $l10n("QUICK_START_SCRIPTS"),
            popButton: {
                title: $l10n("CANCEL")
            },
            rightButtons: keyboardScripts.getNavButtons()
        });
        sheet.init().present();
    }
}
module.exports = $dbc2b0d4164c0529$var$KeyboardScripts;

});

parcelRequire.register("5oABG", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $3edb96f81f4b31ed$require$UIKit = $1cJLV.UIKit;
var $3edb96f81f4b31ed$require$Sheet = $1cJLV.Sheet;
var $3edb96f81f4b31ed$require$NavigationItem = $1cJLV.NavigationItem;
var $3edb96f81f4b31ed$require$PageController = $1cJLV.PageController;
/**
 * @typedef {import("../../app").AppKernel} AppKernel
 */ class $3edb96f81f4b31ed$var$TodayActions {
    /**
     * @param {AppKernel} kernel
     */ constructor(kernel){
        this.listId = "today-action-list";
        this.kernel = kernel;
    }
    getActions() {
        let cache = $cache.get("today.actions") ?? [];
        if (typeof cache === "string") {
            cache = JSON.parse(cache);
            this.setActions(cache);
        }
        const actions = {
        };
        this.kernel.actionManager.getActionTypes().forEach((type)=>{
            this.kernel.actionManager.getActions(type).forEach((action)=>{
                actions[action.type + action.dir] = action;
            });
        });
        const savedActions = [];
        cache.forEach((action)=>{
            savedActions.push(actions[action.type + action.dir]);
        });
        return savedActions;
    }
    setActions(list = []) {
        list.map((item, i)=>{
            if (item === null) list.splice(i, 1);
        });
        $cache.set("today.actions", list);
    }
    getAllActions() {
        let actions = [];
        this.kernel.actionManager.getActionTypes().forEach((type)=>{
            actions = actions.concat(this.kernel.actionManager.getActions(type));
        });
        return actions;
    }
    getUnsetActions() {
        const actions = this.getActions().map((action)=>action.name
        );
        const res = [];
        this.getAllActions().forEach((action)=>{
            const name = action.name;
            if (actions.indexOf(name) === -1) res.push(action);
        });
        return res;
    }
    getListData(actions) {
        return actions.map((action)=>{
            return {
                action: {
                    text: action.name,
                    info: action
                },
                icon: action.icon.slice(0, 5) === "icon_" ? {
                    icon: $icon(action.icon.slice(5, action.icon.indexOf(".")), $color("#ffffff"))
                } : {
                    image: $image(action.icon)
                },
                color: {
                    bgcolor: this.kernel.setting.getColor(action.color)
                }
            };
        });
    }
    getListTemplate() {
        return {
            views: [
                {
                    type: "image",
                    props: {
                        id: "color",
                        cornerRadius: 8,
                        smoothCorners: true
                    },
                    layout: (make)=>{
                        make.top.left.inset(10);
                        make.size.equalTo($size(30, 30));
                    }
                },
                {
                    type: "image",
                    props: {
                        id: "icon",
                        tintColor: $color("#ffffff")
                    },
                    layout: (make)=>{
                        make.top.left.inset(15);
                        make.size.equalTo($size(20, 20));
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "action"
                    },
                    layout: (make, view)=>{
                        make.bottom.top.inset(10);
                        make.left.equalTo(view.prev.prev.right).offset(10);
                        make.right.inset(10);
                    }
                }
            ]
        };
    }
    add() {
        const view = {
            type: "list",
            props: {
                data: this.getListData(this.getUnsetActions()),
                template: this.getListTemplate(),
                rowHeight: 50
            },
            events: {
                didSelect: (sender, indexPath, data)=>{
                    const action = data.action.info;
                    const actions = this.getActions();
                    actions.unshift(action);
                    this.setActions(actions);
                    $(this.listId).insert({
                        indexPath: $indexPath(0, 0),
                        value: this.getListData([
                            action
                        ])[0]
                    });
                    sender.delete(indexPath);
                }
            },
            layout: $layout.fill
        };
        const sheet = new $3edb96f81f4b31ed$require$Sheet();
        sheet.setView(view).addNavBar({
            title: $l10n("ADD")
        }).init().present();
    }
    getNavButtons() {
        return [
            {
                symbol: "plus",
                tapped: ()=>this.add()
            }
        ];
    }
    getListView() {
        return {
            type: "list",
            props: {
                id: this.listId,
                data: this.getListData(this.getActions()),
                template: this.getListTemplate(),
                rowHeight: 50,
                reorder: true,
                actions: [
                    {
                        title: "delete",
                        handler: (sender, indexPath)=>{
                            this.setActions(sender.data.map((data)=>data.action.info
                            ));
                        }
                    }
                ]
            },
            events: {
                reorderFinished: (data1)=>{
                    const actions = [];
                    data1.forEach((data)=>{
                        actions.push(data.action.info);
                    });
                    this.setActions(actions);
                }
            },
            layout: $layout.fill
        };
    }
    static sheet(kernel) {
        const sheet = new $3edb96f81f4b31ed$require$Sheet();
        const todayActions = new $3edb96f81f4b31ed$var$TodayActions(kernel);
        sheet.setView(todayActions.getListView()).addNavBar({
            title: $l10n("ACTIONS"),
            popButton: {
                title: $l10n("CANCEL")
            },
            rightButtons: todayActions.getNavButtons()
        });
        sheet.init().present();
    }
}
module.exports = $3edb96f81f4b31ed$var$TodayActions;

});

parcelRequire.register("ehiE8", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $a6511e02841ff728$require$UIKit = $1cJLV.UIKit;
var $a6511e02841ff728$require$BarButtonItem = $1cJLV.BarButtonItem;
var $a6511e02841ff728$require$NavigationItem = $1cJLV.NavigationItem;
var $a6511e02841ff728$require$NavigationBar = $1cJLV.NavigationBar;

var $2Ygkq = parcelRequire("2Ygkq");

var $iRMmt = parcelRequire("iRMmt");
/**
 * @typedef {import("../app").AppKernel} AppKernel
 */ class $a6511e02841ff728$var$Keyboard extends $2Ygkq {
    #readClipboardTimer;
    /**
     * @param {AppKernel} kernel
     */ constructor(kernel){
        super(kernel);
        this.listId = "keyboard-clipboard-list";
        // 剪贴板列个性化设置
        this.left_right = 20 // 列表边距
        ;
        this.top_bottom = 10 // 列表边距
        ;
        this.fontSize = 14 // 字体大小
        ;
        this.navHeight = 50;
        this.navBarSeparatorId = "navBarSeparator";
        this.keyboardSetting();
        this.taptic = 1;
        this.deleteTimer = undefined;
        this.continuousDeleteTimer = undefined;
        this.deleteDelay = this.kernel.setting.get("keyboard.deleteDelay");
        this.continuousDeleteDelay = 0.5;
        this.loadDataWithSingleLine();
    }
    listReady() {
        // readClipboard
        if (this.kernel.setting.get("clipboard.autoSave") && $app.env === $env.keyboard) this.#readClipboardTimer = $timer.schedule({
            interval: 1,
            handler: ()=>{
                this.readClipboard();
            }
        });
    }
    keyboardSetting() {
        if (!this.kernel.setting.get("keyboard.showJSBoxToolbar")) $keyboard.barHidden = true;
    }
    keyboardTapped(tapped, tapticEngine = true) {
        return (...args)=>{
            if (tapticEngine && this.kernel.setting.get("keyboard.tapticEngine")) $device.taptic(this.taptic);
            tapped(...args);
        };
    }
    navButtons() {
        const buttons = [
            {
                // 关闭键盘
                symbol: "keyboard.chevron.compact.down",
                tapped: this.keyboardTapped(()=>$keyboard.dismiss()
                )
            },
            {
                // 手动读取剪切板
                symbol: "square.and.arrow.down.on.square",
                tapped: this.keyboardTapped((animate)=>{
                    animate.start();
                    this.readClipboard(true);
                    animate.done();
                })
            },
            {
                // Action
                symbol: "bolt.circle",
                tapped: this.keyboardTapped((animate, sender)=>{
                    const popover = $ui.popover({
                        sourceView: sender,
                        directions: $popoverDirection.up,
                        size: $size(200, 300),
                        views: [
                            this.kernel.actionManager.getActionListView({
                            }, {
                                didSelect: (sender, indexPath, data)=>{
                                    popover.dismiss();
                                    const action = this.kernel.actionManager.getActionHandler(data.info.info.type, data.info.info.dir);
                                    setTimeout(()=>action({
                                            text: $clipboard.text
                                        })
                                    , 500);
                                }
                            })
                        ]
                    });
                })
            }
        ];
        return buttons.map((button)=>{
            const barButtonItem = new $a6511e02841ff728$require$BarButtonItem();
            return barButtonItem.setAlign($a6511e02841ff728$require$UIKit.align.right).setSymbol(button.symbol).setEvent("tapped", button.tapped).definition;
        });
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
                            layout: (make, view)=>{
                                make.centerY.equalTo(view.super);
                                make.left.equalTo(view.super).offset(this.left_right);
                            }
                        }
                    ].concat(this.navButtons())
                }
            ],
            layout: (make, view)=>{
                make.top.width.equalTo(view.super);
                make.height.equalTo(this.navHeight);
            }
        };
    }
    getBottomBarView() {
        const navigationBar = new $a6511e02841ff728$require$NavigationBar();
        const navigationItem = new $a6511e02841ff728$require$NavigationItem();
        navigationItem.setLeftButtons([
            {
                symbol: "paperplane",
                menu: {
                    pullDown: true,
                    asPrimary: true,
                    items: $iRMmt.getAddins().reverse().map((addin)=>{
                        return {
                            title: addin,
                            handler: this.keyboardTapped(()=>$addin.run(addin)
                            )
                        };
                    })
                }
            }
        ]);
        if (!$device.isIphoneX) // TODO 切换键盘
        navigationItem.addLeftButton({
            symbol: "globe",
            tapped: this.keyboardTapped(()=>$keyboard.next()
            ),
            menu: {
                pullDown: true,
                items: [
                    {
                        title: "Next Keyboard",
                        handler: this.keyboardTapped(()=>$keyboard.next()
                        )
                    }
                ]
            }
        });
        navigationItem.setRightButtons([
            {
                // send
                title: "Send",
                tapped: this.keyboardTapped(()=>$keyboard.send()
                )
            },
            {
                // delete
                symbol: "delete.left",
                events: {
                    touchesBegan: this.keyboardTapped(()=>{
                        $keyboard.delete();
                        this.continuousDeleteTimer = $delay(this.continuousDeleteDelay, ()=>{
                            this.deleteTimer = $timer.schedule({
                                interval: this.deleteDelay,
                                handler: this.keyboardTapped(()=>$keyboard.delete()
                                , this.kernel.setting.get("keyboard.tapticEngineForDelete"))
                            });
                        });
                    }),
                    touchesEnded: ()=>{
                        this.deleteTimer?.invalidate();
                        this.continuousDeleteTimer?.cancel();
                    }
                }
            }
        ]);
        navigationBar.setNavigationItem(navigationItem);
        const view1 = navigationBar.getNavigationBarView();
        view1.layout = (make, view)=>{
            make.bottom.left.right.equalTo(view.super.safeArea);
            make.top.equalTo(view.prev.bottom).offset(3);
        };
        return view1;
    }
    getListView() {
        return {
            // 剪切板列表
            type: "list",
            props: {
                id: this.listId,
                bgcolor: $color("clear"),
                menu: {
                    items: this.menuItems()
                },
                separatorInset: $insets(0, this.left_right, 0, this.left_right),
                separatorColor: $color("lightGray"),
                data: this.savedClipboard,
                template: this.listTemplate(1)
            },
            events: {
                ready: ()=>this.listReady()
                ,
                rowHeight: (sender, indexPath)=>{
                    const content = sender.object(indexPath).content;
                    return content.info.height + this.top_bottom * 2 + 1;
                },
                didSelect: this.keyboardTapped((sender, indexPath, data)=>{
                    const content = data.content;
                    const text = content.info.text;
                    const path = this.kernel.storage.keyToPath(text);
                    if (path && $file.exists(path.original)) {
                        $clipboard.image = $file.read(path.original).image;
                        $ui.toast($l10n("COPIED"));
                    } else $keyboard.insert(data.content.info.text);
                }),
                didScroll: (sender)=>{
                    if (sender.contentOffset.y > 0) $(this.navBarSeparatorId).hidden = false;
                    else $(this.navBarSeparatorId).hidden = true;
                }
            },
            layout: (make, view)=>{
                make.top.equalTo(this.navHeight);
                make.width.equalTo(view.super);
                make.bottom.equalTo(view.super).offset(-this.navHeight);
            }
        };
    }
    getView() {
        let backgroundImage = this.kernel.setting.getImage("keyboard.background.image");
        const backgroundColor = this.kernel.setting.getColor(this.kernel.setting.get("keyboard.background.color"));
        const backgroundColorDark = this.kernel.setting.getColor(this.kernel.setting.get("keyboard.background.color.dark"));
        return {
            type: "view",
            props: {
                id: "keyboard.main",
                bgcolor: $color(backgroundColor, backgroundColorDark)
            },
            views: [
                backgroundImage !== null ? {
                    type: "image",
                    props: {
                        image: backgroundImage
                    },
                    layout: $layout.fill
                } : {
                },
                this.getNavBarView(),
                $a6511e02841ff728$require$UIKit.separatorLine({
                    id: this.navBarSeparatorId,
                    hidden: true,
                    bgcolor: $color("lightGray")
                }),
                this.getListView(),
                $a6511e02841ff728$require$UIKit.separatorLine({
                    bgcolor: $color("lightGray")
                }),
                this.getBottomBarView()
            ],
            layout: $layout.fill
        };
    }
}
module.exports = $a6511e02841ff728$var$Keyboard;

});

parcelRequire.register("knL6n", function(module, exports) {

var $1cJLV = parcelRequire("1cJLV");
var $ed6a7e18b44bee46$require$UIKit = $1cJLV.UIKit;
var $ed6a7e18b44bee46$require$BarButtonItem = $1cJLV.BarButtonItem;
var $ed6a7e18b44bee46$require$NavigationItem = $1cJLV.NavigationItem;
var $ed6a7e18b44bee46$require$NavigationBar = $1cJLV.NavigationBar;

var $2Ygkq = parcelRequire("2Ygkq");

var $5oABG = parcelRequire("5oABG");
/**
 * @typedef {import("../app").AppKernel} AppKernel
 */ class $ed6a7e18b44bee46$var$Today extends $2Ygkq {
    /**
     * @param {AppKernel} kernel
     */ constructor(kernel){
        super(kernel);
        this.actionsId = "today-list-actions";
        this.listContainerId = "today-list-container";
        this.readClipboardButtonId = "today-nav-readClipboard";
        this.listId = "today-list";
        this.bottomBar = new $ed6a7e18b44bee46$require$NavigationBar();
        // 剪贴板列个性化设置
        this.left_right = 20 // 列表边距
        ;
        this.top_bottom = 10 // 列表边距
        ;
        this.fontSize = 14 // 字体大小
        ;
        this.navHeight = 38;
        this.taptic = 1;
        this.setSingleLine();
        // 剪切板分页显示
        this.setClipboarPageSize($widget.mode);
        this.listPageNow = [
            0,
            0
        ] // 剪切板当前页
        ;
        this.listSection = Math.min(this.tabIndex, 1) // 当前选中列表，只取 0 或 1，默认 1
        ;
        this.todayActions = new $5oABG(this.kernel);
        // 监听展开状态
        $widget.modeChanged = (mode)=>{
            this.setClipboarPageSize(mode);
            this.updateList();
        };
    }
    get isActionPage() {
        return this.tabIndex === 2;
    }
    set tabIndex(index) {
        $cache.set("caio.today.tab.index", index);
    }
    get tabIndex() {
        return $cache.get("caio.today.tab.index") ?? 0;
    }
    get tabItems() {
        return [
            $l10n("PIN"),
            $l10n("CLIPBOARD"),
            $l10n("ACTIONS")
        ];
    }
    listReady() {
        this.updateList();
        $delay(0.5, ()=>this.readClipboard()
        );
    }
    readClipboard(manual = false) {
        if (!this.isActionPage) {
            if (super.readClipboard(manual)) {
                this.listSection = 1;
                this.listPageNow[this.listSection] = 0;
                this.updateList();
            }
            return true;
        }
        return false;
    }
    setClipboarPageSize(mode) {
        if (mode === 0) this.listPageSize = 1;
        else {
            const viewHeight = $app.env === $env.app ? $ed6a7e18b44bee46$require$UIKit.windowSize.height : $widget.height;
            const height = viewHeight - this.navHeight * 2;
            const f_line = height / (this.getSingleLineHeight() + this.top_bottom * 2);
            const floor = Math.floor(f_line);
            this.listPageSize = floor;
            if (f_line - floor >= 0.6) this.listPageSize++;
        }
    }
    buttonTapped(tapped, tapticEngine = true) {
        return (...args)=>{
            if (tapticEngine && this.kernel.setting.get("keyboard.tapticEngine")) $device.taptic(this.taptic);
            tapped(...args);
        };
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
                tapped: this.buttonTapped((animate)=>{
                    animate.start();
                    if (this.readClipboard(true)) animate.done();
                    else animate.cancel();
                })
            }
        ];
        return buttons.map((button)=>{
            const barButtonItem = new $ed6a7e18b44bee46$require$BarButtonItem();
            barButtonItem.setAlign($ed6a7e18b44bee46$require$UIKit.align.right).setSymbol(button.symbol).setEvent("tapped", button.tapped).setProps(button.props ?? {
            });
            return barButtonItem.definition;
        });
    }
    tabView() {
        const switchTab = (index)=>{
            this.tabIndex = index;
            if (index === 2) {
                $(this.listContainerId).hidden = true;
                $(this.actionsId).hidden = false;
                $(this.readClipboardButtonId).hidden = true;
            } else {
                this.listSection = index;
                $(this.actionsId).hidden = true;
                $(this.listContainerId).hidden = false;
                $(this.readClipboardButtonId).hidden = false;
                this.updateList();
            }
        };
        return {
            type: "tab",
            props: {
                items: this.tabItems,
                index: this.tabIndex,
                dynamicWidth: true
            },
            events: {
                changed: (sender)=>{
                    switchTab(sender.index);
                }
            },
            layout: (make, view)=>{
                make.centerY.equalTo(view.super);
                make.left.equalTo(view.super.saveArea).offset(10);
            }
        };
    }
    getNavBarView() {
        return {
            // 顶部按钮栏
            type: "view",
            views: [
                {
                    type: "view",
                    layout: $layout.fill,
                    views: [
                        this.tabView(),
                        {
                            type: "label"
                        },
                        ...this.navButtons()
                    ]
                }
            ],
            layout: (make, view)=>{
                make.top.width.equalTo(view.super);
                make.height.equalTo(this.navHeight);
            }
        };
    }
    getBottomBarView() {
        const navigationItem = new $ed6a7e18b44bee46$require$NavigationItem();
        navigationItem.setLeftButtons([
            {
                title: $l10n("PREV_PAGE"),
                tapped: this.buttonTapped(()=>{
                    this.clipboardPrevPage();
                })
            }
        ]).setRightButtons([
            {
                title: $l10n("NEXT_PAGE"),
                tapped: this.buttonTapped(()=>{
                    this.clipboardNextPage();
                })
            }
        ]).setTitle(this.listPageNow[this.listSection] + 1).setLargeTitleDisplayMode($ed6a7e18b44bee46$require$NavigationItem.largeTitleDisplayModeNever);
        this.bottomBar.setNavigationItem(navigationItem);
        const view1 = this.bottomBar.getNavigationBarView();
        view1.layout = (make, view)=>{
            make.bottom.left.right.equalTo(view.super.safeArea);
            make.top.equalTo(view.prev.bottom);
        };
        return view1;
    }
    updateList() {
        $(this.listId).data = this.getClipboardPage();
        $(this.bottomBar.id + "-small-title").text = this.listPageNow[this.listSection] + 1;
    }
    clipboardPrevPage() {
        if (this.listPageNow[this.listSection] > 0) {
            this.listPageNow[this.listSection]--;
            this.updateList();
        }
    }
    clipboardNextPage() {
        const maxPage = Math.ceil(this.savedClipboard[this.listSection].rows.length / this.listPageSize);
        if (this.listPageNow[this.listSection] < maxPage - 1) {
            this.listPageNow[this.listSection]++;
            this.updateList();
        }
    }
    getClipboardPage() {
        const start = this.listPageNow[this.listSection] * this.listPageSize;
        const end = start + this.listPageSize;
        return this.savedClipboard[this.listSection].rows.slice(start, end);
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
                        ready: ()=>this.listReady()
                        ,
                        didSelect: this.buttonTapped((sender, indexPath, data)=>{
                            const content = data.content;
                            const text = content.info.text;
                            const path = this.kernel.storage.keyToPath(text);
                            if (path && $file.exists(path.original)) $clipboard.image = $file.read(path.original).image;
                            else {
                                this.setCopied(data.content.info.uuid, $indexPath(this.listSection, indexPath.row));
                                this.setClipboardText(data.content.info.text);
                            }
                            $ui.toast($l10n("COPIED"));
                        })
                    },
                    layout: (make, view)=>{
                        make.top.width.equalTo(view.super);
                        make.bottom.equalTo(view.super).offset(-this.navHeight);
                    }
                },
                this.getBottomBarView()
            ],
            layout: (make, view)=>{
                make.top.equalTo(this.navHeight);
                make.bottom.left.right.equalTo(view.super.safeArea);
            }
        };
    }
    getMatrixView() {
        let data1 = this.todayActions.getActions();
        if (data1.length === 0) data1 = this.todayActions.getAllActions();
        return {
            type: "matrix",
            props: {
                id: this.matrixId,
                columns: 2,
                itemHeight: 50,
                spacing: 8,
                data: data1.map((action)=>{
                    return this.kernel.actionManager.actionToData(action);
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
                            layout: (make)=>{
                                make.top.left.inset(10);
                                make.size.equalTo($size(30, 30));
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: "icon",
                                tintColor: $color("#ffffff")
                            },
                            layout: (make)=>{
                                make.top.left.inset(15);
                                make.size.equalTo($size(20, 20));
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "name",
                                font: $font(14)
                            },
                            layout: (make, view)=>{
                                make.bottom.top.inset(10);
                                make.left.equalTo(view.prev.prev.right).offset(10);
                                make.right.inset(10);
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
                didSelect: (sender, indexPath, data)=>{
                    const info = data.info.info;
                    this.kernel.actionManager.getActionHandler(info.type, info.dir)({
                        text: info.type === "clipboard" || info.type === "uncategorized" ? $clipboard.text : null,
                        uuid: null
                    });
                }
            }
        };
    }
    getActionView() {
        return {
            type: "view",
            props: {
                id: this.actionsId,
                hidden: this.tabIndex !== 2
            },
            views: [
                this.getMatrixView()
            ],
            layout: (make, view)=>{
                make.top.equalTo(this.navHeight);
                make.bottom.left.right.equalTo(view.super.safeArea);
            }
        };
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
        };
    }
}
module.exports = $ed6a7e18b44bee46$var$Today;

});



$app.strings = {
    "en": {
        "ALERT_INFO": "Alert",
        "NONE": "None",
        "FAILED_TO_LOAD_VIEW": "Faild to load view",
        "VIEW_NOT_PROVIDED": "The view is not provided",
        "UNCATEGORIZED": "Uncategorized",
        "SHARE": "Share",
        "CLIPBOARD": "Clipboard",
        "UNIVERSAL_CLIPBOARD": "Universal Clipboard",
        "UNIVERSAL_CLIPBOARD_TIPS": "Universal Clipboard allows you to copy something on your iPhone, and paste it on your Mac–or vice-versa–using iCloud.",
        "CLIPBOARD_STRUCTURE_ERROR": "Clipboard data structure is abnormal",
        "ADD": "Add",
        "EDIT": "Edit",
        "SEARCH": "Search",
        "PIN": "Pin",
        "COPY": "Copy",
        "COPIED": "Copied",
        "SORT": "Sort",
        "ACTIONS": "Actions",
        "PREVIEW": "Preview",
        "MAX_ITEM_LENGTH": "Line Limit",
        "TEXT_MAX_LENGTH": "Display Character Length",
        "AUTO_SAVE": "Auto Save",
        "AUTO_SYNC": "Auto Sync",
        "SYNC_NOW": "Sync Now",
        "UNZIP_FAILED": "Unzip file failed",
        "SYNC_ALERT_INFO": "If it has not been synced locally, the iCloud data will be pulled directly. \\nDo you want to continue?",
        "DELETE_ICLOUD_DATA": "Delete iCloud Data",
        "REBUILD": "Rebuild",
        "REBUILD_DATABASE": "Rebuild Database",
        "REBUILD_DATABASE_ALERT": "Rebuilding the database will lose the order information, do you want to confirm the rebuild?",
        "EDITOR": "Editor",
        "CREATE_NEW": "Create New",
        "CREATE_NEW_ACTION": "New Action",
        "CREATE_NEW_TYPE": "New Category",
        "TYPE_ALREADY_EXISTS": "This category already exists",
        "EDIT_DETAILS": "Edit Details",
        "EDIT_SCRIPT": "Edit Script",
        "INFORMATION": "Information",
        "NAME": "Name",
        "ICON": "Icon",
        "TYPE": "Category",
        "DESCRIPTION": "Description",
        "CODE": "Code",
        "TEXT_INSETS": "Text bottom margin",
        "SHOW_LINE_NUMBER": "Show line number",
        "LIGHT_MODE_THEME": "Light Mode Theme",
        "DARK_MODE_THEME": "Dark Mode Theme",
        "SAVE": "Save",
        "SAVE_SUCCESS": "Save success",
        "SAVE_ERROR": "Save failed",
        "DELETE": "Delete",
        "CONFIRM_DELETE_MSG": "Are you sure you want to delete?",
        "DELETE_SUCCESS": "Delete success",
        "DELETE_ERROR": "Delete failed",
        "IMPORT_EXAMPLE_ACTIONS": "Import example actions",
        "REBUILD_ACTION_DATABASE": "Rebuild Action Database",
        "REBUILD_ACTION_DATABASE_ALERT": "Are you sure you want to rebuild?",
        "EXPORT": "Export",
        "IMPORT": "Import",
        "FILE_TYPE_ERROR": "File type does not match",
        "OVERWRITE_ALERT": "This operation will overwrite the current data. Do you want to continue?",
        "KEYBOARD": "Keyboard",
        "BACKGROUND_COLOR": "Background Color",
        "BACKGROUND_COLOR_DARK": "Dark Background Color",
        "BACKGROUND_IMAGE": "Background Image",
        "DELETE_DELAY": "Delete Delay",
        "JSBOX_TOOLBAR": "JSBox Toolbar",
        "QUICK_START_SCRIPTS": "Quick Start Scripts",
        "CHECK_UPDATE": "Check Update",
        "UPDATE": "Update",
        "WIDGET": "Widget",
        "RECENT": "Recent",
        "CLICK_ACTION": "Click Action",
        "TODAY_WIDGET": "Today Widget",
        "PREV_PAGE": "Prev",
        "NEXT_PAGE": "Next",
        "DISPLAY_MODE": "Display Mode",
        "CLASSIC": "Classic",
        "MODERN": "Modern"
    },
    "zh-Hans": {
        "ALERT_INFO": "提示",
        "NONE": "什么都没有",
        "FAILED_TO_LOAD_VIEW": "加载视图失败",
        "VIEW_NOT_PROVIDED": "未提供该视图",
        "UNCATEGORIZED": "未分类",
        "SHARE": "分享",
        "CLIPBOARD": "剪切板",
        "UNIVERSAL_CLIPBOARD": "通用剪贴板",
        "UNIVERSAL_CLIPBOARD_TIPS": "用剪贴板允许您在iPhone上复制某些内容，然后使用iCloud将其粘贴到Mac上(反之亦然)。",
        "CLIPBOARD_STRUCTURE_ERROR": "剪切板数据结构异常",
        "ADD": "添加",
        "EDIT": "编辑",
        "SEARCH": "搜索",
        "PIN": "置顶",
        "COPY": "复制",
        "COPIED": "已复制",
        "SORT": "排序",
        "ACTIONS": "动作",
        "PREVIEW": "预览",
        "MAX_ITEM_LENGTH": "行数限制",
        "TEXT_MAX_LENGTH": "显示字符长度",
        "AUTO_SAVE": "自动保存",
        "AUTO_SYNC": "自动同步",
        "SYNC_NOW": "立即同步",
        "UNZIP_FAILED": "解压文件失败",
        "SYNC_ALERT_INFO": "若未在本机进行过同步则会直接拉取 iCloud 数据。\\n是否继续？",
        "DELETE_ICLOUD_DATA": "删除 iCloud 数据",
        "REBUILD": "重建",
        "REBUILD_DATABASE": "重建数据库",
        "REBUILD_DATABASE_ALERT": "重建数据库将会丢失顺序信息，是否确认重建？",
        "EDITOR": "编辑器",
        "CREATE_NEW": "新建",
        "CREATE_NEW_ACTION": "新建动作",
        "CREATE_NEW_TYPE": "新建分类",
        "TYPE_ALREADY_EXISTS": "该类别已经存在",
        "EDIT_DETAILS": "编辑信息",
        "EDIT_SCRIPT": "编辑脚本",
        "INFORMATION": "信息",
        "NAME": "名称",
        "ICON": "图标",
        "TYPE": "分类",
        "DESCRIPTION": "描述",
        "CODE": "代码",
        "TEXT_INSETS": "文本下边距",
        "SHOW_LINE_NUMBER": "显示行号",
        "LIGHT_MODE_THEME": "浅色模式主题",
        "DARK_MODE_THEME": "深色模式主题",
        "SAVE": "保存",
        "SAVE_SUCCESS": "保存成功",
        "SAVE_ERROR": "保存失败",
        "DELETE": "删除",
        "CONFIRM_DELETE_MSG": "确认要删除吗？",
        "DELETE_SUCCESS": "删除成功",
        "DELETE_ERROR": "删除失败",
        "IMPORT_EXAMPLE_ACTIONS": "导入示例动作",
        "REBUILD_ACTION_DATABASE": "重建动作库",
        "REBUILD_ACTION_DATABASE_ALERT": "您确认要重建？",
        "EXPORT": "导出",
        "IMPORT": "导入",
        "FILE_TYPE_ERROR": "文件类型不符",
        "OVERWRITE_ALERT": "该操作将会覆盖当前数据，是否继续？",
        "KEYBOARD": "键盘",
        "BACKGROUND_COLOR": "背景色",
        "BACKGROUND_COLOR_DARK": "深色模式背景色",
        "BACKGROUND_IMAGE": "背景图片",
        "DELETE_DELAY": "删除延时",
        "JSBOX_TOOLBAR": "JSBox 工具栏",
        "QUICK_START_SCRIPTS": "快速启动脚本",
        "CHECK_UPDATE": "检查更新",
        "UPDATE": "更新",
        "WIDGET": "小组件",
        "RECENT": "最近内容",
        "CLICK_ACTION": "点击事件",
        "TODAY_WIDGET": "通知中心小组件",
        "PREV_PAGE": "上一页",
        "NEXT_PAGE": "下一页",
        "DISPLAY_MODE": "显示模式",
        "CLASSIC": "经典",
        "MODERN": "现代"
    }
};
$app.theme = "auto";
$app.minSDKVer = "2.19.0";
$app.minOSVer = "14.0.0";
$app.idleTimerDisabled = false;
$app.keyboardToolbarEnabled = true;
$app.rotateDisabled = false;
__README__ = {
    "README.md": "# CAIO\n\n> Clipboard all in one.\n> \n> A Clipboard tool based on JSBox.\n\n支持桌面小组件和通知中心小组件\n\n## Actions\n\n> 编写方式详见 `scripts/action/README.md` 或应用内 `Action` 编辑页面右上角图书按钮。\n\n### 不同环境中 `Action` 数据区别\n\n- 首页顶部 `Action` 按钮处理的数据为当前复制的内容\n- 长按列表弹出的 `Action` 菜单处理的数据为被选中的内容\n- 编辑器中顶部 `Action` 按钮（闪电图形按钮）处理的数据为正在编辑的所有内容\n\n\n## Today Widget\n\n> 点击复制，长按触发动作。\n\n请尽量避免在 JSBox 运行 CAIO 时使用 Today Widget",
    "README_CN.md": "# CAIO\n\n> Clipboard all in one.\n> \n> A Clipboard tool based on JSBox.\n\n支持桌面小组件和通知中心小组件\n\n## Actions\n\n> 编写方式详见 `scripts/action/README.md` 或应用内 `Action` 编辑页面右上角图书按钮。\n\n### 不同环境中 `Action` 数据区别\n\n- 首页顶部 `Action` 按钮处理的数据为当前复制的内容\n- 长按列表弹出的 `Action` 菜单处理的数据为被选中的内容\n- 编辑器中顶部 `Action` 按钮（闪电图形按钮）处理的数据为正在编辑的所有内容\n\n\n## Today Widget\n\n> 点击复制，长按触发动作。\n\n请尽量避免在 JSBox 运行 CAIO 时使用 Today Widget"
};
__SETTING__ = [
    {
        "items": [
            {
                "icon": [
                    "doc.on.clipboard",
                    "#FFCC66"
                ],
                "type": "child",
                "title": "CLIPBOARD",
                "key": "clipboard",
                "children": [
                    {
                        "items": [
                            {
                                "icon": [
                                    "link",
                                    "#FF6633"
                                ],
                                "title": "UNIVERSAL_CLIPBOARD",
                                "type": "switch",
                                "key": "clipboard.universal",
                                "value": true
                            },
                            {
                                "icon": [
                                    "cursorarrow.rays",
                                    "#FF6633"
                                ],
                                "title": "Tips",
                                "type": "script",
                                "key": "clipboard.tips.universal",
                                "value": "$ui.alert({title:$l10n('UNIVERSAL_CLIPBOARD'),message:$l10n('UNIVERSAL_CLIPBOARD_TIPS')})"
                            }
                        ]
                    },
                    {
                        "items": [
                            {
                                "icon": [
                                    "text.alignleft",
                                    "#FFCC66"
                                ],
                                "title": "MAX_ITEM_LENGTH",
                                "type": "number",
                                "key": "clipboard.maxItemLength",
                                "value": 100
                            },
                            {
                                "icon": [
                                    "pencil.and.ellipsis.rectangle",
                                    "#CC0099"
                                ],
                                "title": "TEXT_MAX_LENGTH",
                                "type": "number",
                                "key": "clipboard.textMaxLength",
                                "value": 35
                            },
                            {
                                "icon": [
                                    "square.and.arrow.down.on.square",
                                    "#FF6633"
                                ],
                                "title": "AUTO_SAVE",
                                "type": "switch",
                                "key": "clipboard.autoSave",
                                "value": true
                            }
                        ]
                    },
                    {
                        "items": [
                            {
                                "icon": [
                                    "arrow.2.circlepath"
                                ],
                                "title": "AUTO_SYNC",
                                "type": "switch",
                                "key": "clipboard.autoSync",
                                "value": false
                            },
                            {
                                "icon": [
                                    "arrow.2.circlepath",
                                    "#FFCC66"
                                ],
                                "title": "SYNC_NOW",
                                "type": "script",
                                "key": "clipboard.sync",
                                "value": "this.method.sync"
                            },
                            {
                                "icon": [
                                    "trash",
                                    "red"
                                ],
                                "title": "DELETE_ICLOUD_DATA",
                                "type": "script",
                                "key": "clipboard.deleteICloudData",
                                "value": "this.method.deleteICloudData"
                            }
                        ]
                    },
                    {
                        "items": [
                            {
                                "icon": [
                                    "arrow.2.circlepath",
                                    "red"
                                ],
                                "title": "REBUILD_DATABASE",
                                "type": "script",
                                "key": "clipboard.rebuildDatabase",
                                "value": "this.method.rebuildDatabase"
                            }
                        ]
                    },
                    {
                        "items": [
                            {
                                "icon": [
                                    "square.and.arrow.up"
                                ],
                                "title": "EXPORT",
                                "type": "script",
                                "key": "clipboard.export",
                                "value": "this.method.exportClipboard"
                            },
                            {
                                "icon": [
                                    "square.and.arrow.down",
                                    "#FFCC33"
                                ],
                                "title": "IMPORT",
                                "type": "script",
                                "key": "clipboard.import",
                                "value": "this.method.importClipboard"
                            }
                        ]
                    }
                ]
            },
            {
                "icon": [
                    "bolt.circle",
                    "#FF6633"
                ],
                "type": "child",
                "title": "ACTIONS",
                "key": "action",
                "children": [
                    {
                        "items": [
                            {
                                "icon": [
                                    "bolt.circle",
                                    "#FF6633"
                                ],
                                "title": "IMPORT_EXAMPLE_ACTIONS",
                                "type": "script",
                                "key": "action.importExampleAction",
                                "value": "this.method.importExampleAction"
                            }
                        ]
                    },
                    {
                        "items": [
                            {
                                "icon": [
                                    "arrow.2.circlepath",
                                    "red"
                                ],
                                "title": "REBUILD_ACTION_DATABASE",
                                "type": "script",
                                "key": "action.rebuildAction",
                                "value": "this.method.rebuildAction"
                            }
                        ]
                    },
                    {
                        "items": [
                            {
                                "icon": [
                                    "square.and.arrow.up"
                                ],
                                "title": "EXPORT",
                                "type": "script",
                                "key": "action.export",
                                "value": "this.method.exportAction"
                            },
                            {
                                "icon": [
                                    "square.and.arrow.down",
                                    "#FFCC33"
                                ],
                                "title": "IMPORT",
                                "type": "script",
                                "key": "action.import",
                                "value": "this.method.importAction"
                            }
                        ]
                    }
                ]
            },
            {
                "icon": [
                    "pencil.circle",
                    "#CC0099"
                ],
                "type": "child",
                "title": "EDITOR",
                "key": "editor",
                "children": [
                    {
                        "title": "CLIPBOARD",
                        "items": [
                            {
                                "icon": [
                                    "wand.and.stars",
                                    "#FF6633"
                                ],
                                "title": "TEXT_INSETS",
                                "type": "number",
                                "key": "editor.text.insets",
                                "value": 300
                            }
                        ]
                    },
                    {
                        "title": "CODE",
                        "items": [
                            {
                                "icon": [
                                    "list.number",
                                    "#6699CC"
                                ],
                                "title": "SHOW_LINE_NUMBER",
                                "type": "switch",
                                "key": "editor.code.lineNumbers",
                                "value": false
                            },
                            {
                                "icon": [
                                    "wand.and.stars",
                                    "#FF6633"
                                ],
                                "title": "LIGHT_MODE_THEME",
                                "type": "input",
                                "key": "editor.code.lightTheme",
                                "value": "atom-one-light"
                            },
                            {
                                "icon": [
                                    "wand.and.stars",
                                    "#FF6633"
                                ],
                                "title": "DARK_MODE_THEME",
                                "type": "input",
                                "key": "editor.code.darkTheme",
                                "value": "atom-one-dark"
                            }
                        ]
                    }
                ]
            },
            {
                "icon": [
                    "keyboard",
                    "#a2a5a6"
                ],
                "type": "child",
                "title": "KEYBOARD",
                "key": "keyboard",
                "children": [
                    {
                        "items": [
                            {
                                "icon": [
                                    "rectangle.3.offgrid.fill"
                                ],
                                "title": "PREVIEW",
                                "type": "script",
                                "key": "keyboard.preview",
                                "value": "this.method.previewKeyboard"
                            }
                        ]
                    },
                    {
                        "items": [
                            {
                                "icon": [
                                    "sun.min",
                                    "#A569BD"
                                ],
                                "title": "BACKGROUND_COLOR",
                                "type": "color",
                                "key": "keyboard.background.color",
                                "value": "#D1D3D9"
                            },
                            {
                                "icon": [
                                    "sun.min",
                                    "#A569BD"
                                ],
                                "title": "BACKGROUND_COLOR_DARK",
                                "type": "color",
                                "key": "keyboard.background.color.dark",
                                "value": "#313131"
                            },
                            {
                                "icon": [
                                    "photo",
                                    "#FFCC66"
                                ],
                                "title": "BACKGROUND_IMAGE",
                                "type": "image",
                                "key": "keyboard.background.image"
                            }
                        ]
                    },
                    {
                        "items": [
                            {
                                "icon": [
                                    "cursor.rays",
                                    "#FF8C00"
                                ],
                                "title": "Taptic Engine",
                                "type": "switch",
                                "key": "keyboard.tapticEngine",
                                "value": true
                            },
                            {
                                "icon": [
                                    "option",
                                    "#157EFB"
                                ],
                                "title": "JSBOX_TOOLBAR",
                                "type": "switch",
                                "key": "keyboard.showJSBoxToolbar",
                                "value": false
                            },
                            {
                                "icon": [
                                    "paperplane"
                                ],
                                "title": "QUICK_START_SCRIPTS",
                                "type": "script",
                                "key": "keyboard.setKeyboardQuickStart",
                                "value": "this.method.setKeyboardQuickStart"
                            }
                        ]
                    },
                    {
                        "items": [
                            {
                                "icon": [
                                    "cursor.rays",
                                    "#FF8C00"
                                ],
                                "title": "Taptic Engine For Delete",
                                "type": "switch",
                                "key": "keyboard.tapticEngineForDelete",
                                "value": true
                            },
                            {
                                "icon": [
                                    "rays",
                                    "#FFCC33"
                                ],
                                "title": "DELETE_DELAY",
                                "type": "number",
                                "key": "keyboard.deleteDelay",
                                "value": 0.05
                            }
                        ]
                    }
                ]
            },
            {
                "icon": [
                    "rectangle.3.offgrid.fill",
                    "#1899c4"
                ],
                "type": "child",
                "title": "WIDGET",
                "key": "widget",
                "children": [
                    {
                        "items": [
                            {
                                "icon": [
                                    "rectangle.3.offgrid.fill"
                                ],
                                "title": "PREVIEW",
                                "type": "script",
                                "key": "previewWidget",
                                "value": "this.method.previewWidget"
                            }
                        ]
                    },
                    {
                        "title": "2x2",
                        "items": [
                            {
                                "icon": [
                                    "link"
                                ],
                                "title": "CLICK_ACTION",
                                "type": "menu",
                                "key": "widget.2x2.widgetURL",
                                "items": [
                                    "ADD",
                                    "ACTIONS",
                                    "CLIPBOARD"
                                ],
                                "value": 2
                            }
                        ]
                    }
                ]
            },
            {
                "icon": [
                    "filemenu.and.selection",
                    "#ebcc34"
                ],
                "type": "child",
                "title": "TODAY_WIDGET",
                "key": "todayWidget",
                "children": [
                    {
                        "items": [
                            {
                                "icon": [
                                    "rectangle.3.offgrid.fill"
                                ],
                                "title": "PREVIEW",
                                "type": "script",
                                "key": "todayWidget.preview",
                                "value": "this.method.previewTodayWidget"
                            }
                        ]
                    },
                    {
                        "items": [
                            {
                                "icon": [
                                    "bolt.circle"
                                ],
                                "title": "ACTIONS",
                                "type": "script",
                                "key": "todayWidget.setTodayWidgetActions",
                                "value": "this.method.setTodayWidgetActions"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "items": [
            {
                "icon": [
                    "rectangle.topthird.inset.filled",
                    "#A569BD"
                ],
                "title": "DISPLAY_MODE",
                "type": "tab",
                "key": "mainUIDisplayMode",
                "items": [
                    "CLASSIC",
                    "MODERN"
                ],
                "value": 0
            }
        ]
    },
    {
        "items": [
            {
                "icon": [
                    "/assets/icon/github.com.jpeg",
                    "white"
                ],
                "title": "Github",
                "type": "info",
                "key": "github",
                "value": [
                    "ipuppet/CAIO",
                    "https://github.com/ipuppet/CAIO"
                ]
            },
            {
                "icon": [
                    "/assets/icon/telegram.png",
                    "white"
                ],
                "title": "Telegram",
                "type": "info",
                "key": "telegram",
                "value": [
                    "JSBoxTG",
                    "https://t.me/JSBoxTG"
                ]
            },
            {
                "icon": [
                    "person.fill",
                    "#FF9900"
                ],
                "title": "AUTHOR",
                "type": "info",
                "key": "author",
                "value": [
                    "ipuppet",
                    "https://blog.ultagic.com"
                ]
            },
            {
                "icon": [
                    "arrow.2.circlepath"
                ],
                "title": "CHECK_UPDATE",
                "type": "script",
                "key": "checkUpdate",
                "value": "this.method.checkUpdate"
            },
            {
                "icon": [
                    "book.fill",
                    "#A569BD"
                ],
                "title": "README",
                "type": "script",
                "key": "readme",
                "value": "this.method.readme"
            }
        ]
    }
];
__ACTIONS__ = {
    "clipboard": {
        "ClearClipboard": {
            "config.json": "{\n    \"icon\": \"trash\",\n    \"color\": \"#FF0000\",\n    \"name\": \"清除剪切板\",\n    \"description\": \"清除剪切板内容\"\n}",
            "main.js": "/**\n * @typedef {import(\"../../action\").Action} Action\n */\nclass MyAction extends Action {\n    l10n() {\n        return {\n            \"zh-Hans\": {\n                \"clipboard.clear.success\": \"剪切板已清空\"\n            },\n            en: {\n                \"clipboard.clear.success\": \"Clipboard is cleared\"\n            }\n        }\n    }\n\n    /**\n     * 系统会调用 do() 方法\n     */\n    do() {\n        $clipboard.clear()\n        $ui.success($l10n(\"clipboard.clear.success\"))\n    }\n}\n",
            "README.md": "## ClearClipboard"
        },
        "DownloadFromUrl": {
            "config.json": "{\n    \"icon\": \"square.and.arrow.down\",\n    \"color\": \"#FF0099\",\n    \"name\": \"从链接下载\",\n    \"description\": \"从链接下载内容，如 js 文件内容等\"\n}",
            "main.js": "class MyAction extends Action {\n    async downloadContent(url) {\n        const response = await $http.get({\n            url,\n            showsProgress: true\n        })\n        if (response.error) {\n            $ui.alert(response.error.localizedDescription)\n        } else {\n            return response\n        }\n    }\n\n    async do() {\n        const regex = /(https?:\\/\\/)([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([:0-9])*([\\/\\w\\#\\.\\-\\?\\=\\&])*\\s?/ig\n        const text = this.text ?? \"\"\n        const url = text.match(regex, text) ?? []\n        let response = undefined\n        if (url.length > 1) {\n            $ui.menu({\n                items: url,\n                handler: async (title, index) => {\n                    response = await this.downloadContent(url[index])\n                }\n            })\n        } else if (url.length === 1) {\n            response = await this.downloadContent(url[0])\n        } else {\n            $ui.warning(\"未检测到链接\")\n            return\n        }\n        $share.sheet([{\n            name: response.response.suggestedFilename,\n            data: response.data\n        }])\n        return response\n    }\n}\n",
            "README.md": "## DownloadFromUrl\n\n从链接下载内容，如 js 文件内容等"
        },
        "OpenUrl": {
            "config.json": "{\n    \"icon\": \"link\",\n    \"color\": \"#FF0099\",\n    \"name\": \"打开链接\",\n    \"description\": \"提取文本中的链接并打开\"\n}",
            "main.js": "class MyAction extends Action {\n    openUrl(url) {\n        $app.openURL(url.trim())\n    }\n\n    do() {\n        const regex = /(https?:\\/\\/)([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([:0-9])*([\\/\\w\\#\\.\\-\\?\\=\\&])*\\s?/ig\n        const text = this.text ?? \"\"\n        const url = text.match(regex, text) ?? []\n        if (url.length > 1) {\n            $ui.menu({\n                items: url,\n                handler: (title, index) => {\n                    this.openUrl(url[index])\n                }\n            })\n        } else if (url.length === 1) {\n            this.openUrl(url[0])\n        } else {\n            $ui.warning(\"未检测到链接\")\n        }\n    }\n}\n",
            "README.md": "## OpenUrl\n\n提取文本中的URL并打开"
        },
        "Tokenize": {
            "config.json": "{\n    \"icon\": \"pencil.and.ellipsis.rectangle\",\n    \"color\": \"#0099FF\",\n    \"name\": \"分词复制\",\n    \"description\": \"将文本分词处理后复制\"\n}",
            "main.js": "class MyAction extends Action {\n    getView() {\n        const color = {\n            background: {\n                normal: $color(\"#E7F2FF\", \"#E7F2FF\"),\n                highlight: $color(\"##074FF\", \"#BBDAFF\")\n            },\n            text: {\n                normal: $color(\"##074FF\", \"##074FF\"),\n                highlight: $color(\"#FFFFFF\", \"#ADADAD\")\n            }\n        }\n        const fontSize = 16\n        const edges = 10\n        return {\n            type: \"matrix\",\n            layout: $layout.fill,\n            props: {\n                spacing: edges,\n                data: this.results.map(item => ({ label: { text: item } })),\n                template: {\n                    views: [{\n                        type: \"label\",\n                        props: {\n                            id: \"label\",\n                            align: $align.center,\n                            cornerRadius: edges,\n                            bgcolor: color.background.normal,\n                            font: $font(fontSize),\n                            textColor: color.text.normal\n                        },\n                        layout: $layout.fill\n                    }]\n                }\n            },\n            events: {\n                highlighted: () => { },\n                itemSize: (sender, indexPath) => {\n                    const width = fontSize * this.results[indexPath.item].length + 1\n                    if (this.maxtrixItemHeight === undefined)\n                        this.maxtrixItemHeight = fontSize + edges * 2\n                    return $size(width + edges * 2, this.maxtrixItemHeight)\n                },\n                didSelect: (sender, indexPath) => {\n                    const index = this.selected.indexOf(indexPath.item)\n                    const label = sender.cell(indexPath).get(\"label\")\n                    if (index === -1) {\n                        this.selected.push(indexPath.item)\n                        label.bgcolor = color.background.highlight\n                        label.textColor = color.text.highlight\n                    } else {\n                        this.selected.splice(index, 1)\n                        label.bgcolor = color.background.normal\n                        label.textColor = color.text.normal\n                    }\n                }\n            }\n        }\n    }\n    /**\n     * 系统会调用 do() 方法\n     */\n    do() {\n        this.selected = []\n        this.results = []\n        $text.tokenize({\n            text: this.text,\n            handler: results => {\n                this.results = results\n                this.pageSheet({\n                    view: this.getView(),\n                    done: () => {\n                        const result = []\n                        this.selected.sort().forEach(i => {\n                            result.push(this.results[i])\n                        })\n                        if (result.length > 0) {\n                            const text = result.join(\"\")\n                            $clipboard.text = text\n                            $ui.alert({\n                                title: \"完成\",\n                                message: `已复制内容：${text}`\n                            })\n                        }\n                    }\n                })\n            }\n        })\n    }\n}\n",
            "README.md": "## Tokenize\n\n> 将文本分词处理后复制"
        }
    },
    "editor": {
        "PreviewMarkdown": {
            "config.json": "{\n    \"icon\": \"book\",\n    \"color\": \"#9900CC\",\n    \"name\": \"预览Markdown\",\n    \"description\": \"预览Markdown\"\n}",
            "main.js": "class MyAction extends Action {\n    do() {\n        this.pageSheet({\n            view: {\n                type: \"markdown\",\n                props: { content: this.text },\n                layout: $layout.fill\n            }\n        })\n    }\n}\n",
            "README.md": "## PreviewMarkdown\n\n> 预览Markdown"
        },
        "SelectedText": {
            "config.json": "{\n    \"icon\": \"crop\",\n    \"color\": \"#6699CC\",\n    \"name\": \"选中的文本\",\n    \"description\": \"这是个测试 Action, 将在控制台输出当前选中的文本\"\n}",
            "main.js": "class MyAction extends Action {\n    do() {\n        const selectedText = this.selectedText\n        $ui.alert(selectedText)\n    }\n}\n",
            "README.md": "## SelectedText\n\n> 显示选中的文本"
        }
    },
    "uncategorized": {
        "DisplayClipboard": {
            "config.json": "{\n    \"icon\": \"option\",\n    \"color\": \"#FF6633\",\n    \"name\": \"显示剪切板\",\n    \"description\": \"显示剪切板内容\"\n}",
            "main.js": "class MyAction extends Action {\n    /**\n     * 系统会调用 do() 方法\n     */\n    do() {\n        this.pageSheet({\n            view: {\n                type: \"label\",\n                props: {\n                    text: this.text,\n                    align: $align.center\n                },\n                layout: $layout.fill\n            }\n        })\n    }\n}\n",
            "README.md": "## DisplayClipboard"
        },
        "ExportAllContent": {
            "config.json": "{\n    \"icon\": \"square.and.arrow.up\",\n    \"color\": \"#FF3300\",\n    \"name\": \"导出数据\",\n    \"description\": \"导出所有保存的数据\"\n}",
            "main.js": "class MyAction extends Action {\n    do() {\n        const data = this.getAllContent().join(\"\\n\")\n        if (data) $share.sheet(data)\n        else $ui.alert(\"无数据\")\n    }\n}\n",
            "README.md": "## ExportAllContent\n\n导出所有保存的数据"
        },
        "Replace": {
            "config.json": "{\n    \"icon\": \"square.and.arrow.up\",\n    \"color\": \"#FF3300\",\n    \"name\": \"查找替换\",\n    \"description\": \"查找替换\"\n}",
            "main.js": "function HtmlTemplate(html) {\n    return `\n<html>\n<head>\n    <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n</head>\n<body>\n${html}\n</body>\n</html>\n`\n}\n\nclass MyAction extends Action {\n    do() {\n        $ui.menu({\n            items: [\"忽略大小写\", \"大小写敏感\", \"正则表达式\"],\n            handler: async (title, idx) => {\n                const patternText = await $input.text({\n                    placeholder: \"查找内容\"\n                })\n                const replaceString = await $input.text({\n                    placeholder: \"替换内容\"\n                })\n                let pattern = undefined\n                if (idx === 0) {\n                    pattern = new RegExp(`(${patternText})+`, \"gi\")\n                } else if (idx === 1) {\n                    pattern = new RegExp(`(${patternText})+`, \"g\")\n                } else if (idx === 2) {\n                    pattern = new RegExp(patternText, \"g\")\n                }\n\n                const matchResultPreview = this.text.replace(pattern, `<font color=red>${replaceString}</font>`)\n                const matchResult = this.text.replace(pattern, replaceString)\n                this.pageSheet({\n                    title: \"替换预览\",\n                    doneText: \"替换\",\n                    view: {\n                        type: \"web\",\n                        props: {\n                            html: HtmlTemplate(matchResultPreview)\n                        },\n                        layout: $layout.fill\n                    },\n                    done: () => {\n                        this.setContent(matchResult)\n                    }\n                })\n            }\n        })\n        // this.setContent(\"Hello world!\")\n    }\n}\n",
            "README.md": "## Replace\n\n查找替换"
        }
    }
};

var $l35Ko = parcelRequire("l35Ko");
$l35Ko.run();

})();
