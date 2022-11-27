const {
    UIKit,
    ViewController,
    TabBarController,
    Kernel,
    FileStorage,
    Setting,
    FileManager
} = require("./libs/easy-jsbox")
const Storage = require("./storage")
const Clips = require("./ui/clipboard")
const ActionManager = require("./ui/components/action-manager")

const compatibility = require("./compatibility")
const settingMethods = require("./setting-methods")

const fileStorage = new FileStorage()

/**
 * @typedef {AppKernel} AppKernel
 */
class AppKernel extends Kernel {
    constructor() {
        super()
        this.query = $context.query
        // FileStorage
        this.fileStorage = fileStorage
        // Setting
        let structure
        try {
            structure = __SETTING__
        } catch {}
        this.setting = new Setting({
            fileStorage: this.fileStorage,
            structure
        })
        this.setting.loadConfig()
        // Storage
        this.storage = new Storage(this)
        this.initComponents()

        settingMethods(this)
    }

    addOpenInJsboxButton() {
        this.useJsboxNav()
        this.setNavButtons([
            {
                image: $image("assets/icon.png"),
                handler: () => this.openInJsbox()
            }
        ])
    }

    initComponents() {
        // Clips
        this.clips = new Clips(this)
        // ActionManager
        this.actionManager = new ActionManager(this)
        // FileManager
        this.fileManager = new FileManager()
    }

    deleteConfirm(message, conformAction) {
        $ui.alert({
            title: message,
            actions: [
                {
                    title: $l10n("DELETE"),
                    style: $alertActionType.destructive,
                    handler: () => {
                        conformAction()
                    }
                },
                { title: $l10n("CANCEL") }
            ]
        })
    }
}

class AppUI {
    // 小组件模式下不初始化 AppKernel
    static kernel = $app.env !== $env.widget ? new AppKernel() : undefined

    static renderMainUI() {
        const buttons = {
            clips: { icon: "doc.on.clipboard", title: $l10n("CLIPS") },
            actions: { icon: "command", title: $l10n("ACTIONS") },
            setting: { icon: "gear", title: $l10n("SETTING") }
        }
        this.kernel.setting.setEvent("onSet", key => {
            if (key === "mainUIDisplayMode") {
                $delay(0.3, () => $addin.restart())
            }
        })
        if (this.kernel.setting.get("mainUIDisplayMode") === 0) {
            this.kernel.useJsboxNav()
            this.kernel.setting.useJsboxNav()
            this.kernel.setNavButtons([
                {
                    symbol: buttons.setting.icon,
                    title: buttons.setting.title,
                    handler: () => {
                        UIKit.push({
                            title: buttons.setting.title,
                            views: [this.kernel.setting.getListView()]
                        })
                    }
                },
                {
                    symbol: buttons.actions.icon,
                    title: buttons.actions.title,
                    handler: () => {
                        this.kernel.actionManager.present()
                    }
                }
            ])

            this.kernel.UIRender(this.kernel.clips.getNavigationView().getPage())
        } else {
            this.kernel.fileManager.setViewController(new ViewController())

            this.kernel.tabBarController = new TabBarController()

            const clipsdNavigationView = this.kernel.clips.getNavigationView()

            this.kernel.tabBarController
                .setPages({
                    clips: clipsdNavigationView.getPage(),
                    actions: this.kernel.actionManager.getPage(),
                    setting: this.kernel.setting.getPage()
                })
                .setCells({
                    clips: buttons.clips,
                    actions: buttons.actions,
                    setting: buttons.setting
                })

            this.kernel.UIRender(this.kernel.tabBarController.generateView().definition)
        }
    }

    static renderKeyboardUI() {
        this.kernel.addOpenInJsboxButton()

        const Keyboard = require("./ui/keyboard")
        const keyboard = new Keyboard(this.kernel)

        this.kernel.UIRender(keyboard.getView())
    }

    static renderTodayUI() {
        this.kernel.addOpenInJsboxButton()

        const Today = require("./ui/today")
        const today = new Today(this.kernel)

        this.kernel.UIRender(today.getView())
    }

    static renderUnsupported() {
        $intents.finish("不支持在此环境中运行")
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
        })
    }
}

class Widget {
    static widgetInstance(widget, ...data) {
        if ($file.exists(`/scripts/widget/${widget}.js`)) {
            const { Widget } = require(`./widget/${widget}.js`)
            return new Widget(...data)
        } else {
            return false
        }
    }

    static renderError() {
        $widget.setTimeline({
            render: () => ({
                type: "text",
                props: {
                    text: "Invalid argument"
                }
            })
        })
    }

    static renderClipboard() {
        const setting = new Setting()
        setting.loadConfig().setReadonly()

        const widget = Widget.widgetInstance("Clipboard", setting, new Storage({ fileStorage }))

        widget.render()
    }

    static render(widgetName = $widget.inputValue) {
        widgetName = widgetName ?? "Clipboard"
        if (widgetName === "Clipboard") {
            Widget.renderClipboard()
        } else {
            Widget.renderError()
        }
    }
}

module.exports = {
    Widget,
    run: () => {
        //AppUI.renderTodayUI(); return
        //AppUI.renderKeyboardUI(); return
        //Widget.render(); return

        // 兼容性操作
        compatibility(AppUI.kernel)

        if ($app.env === $env.app || $app.env === $env.action) {
            AppUI.renderMainUI()
        } else if ($app.env === $env.keyboard) {
            AppUI.renderKeyboardUI()
        } else if ($app.env === $env.widget) {
            Widget.render()
        } else if ($app.env === $env.today) {
            AppUI.renderTodayUI()
        } else {
            AppUI.renderUnsupported()
        }
    }
}
