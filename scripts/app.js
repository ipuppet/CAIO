const { UIKit, TabBarController, Kernel, FileStorage, Setting } = require("./libs/easy-jsbox")
const Storage = require("./storage")
const Clipboard = require("./ui/clipboard")
const ActionManager = require("./ui/components/action-manager")

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
        this.setting = new Setting({ fileStorage: this.fileStorage })
        this.setting.loadConfig()
        // Storage
        this.storage = new Storage(this.setting.get("clipboard.autoSync"), this)
        this.initComponents()

        settingMethods(this)
    }

    initComponents() {
        // Clipboard
        this.clipboard = new Clipboard(this)
        // ActionManager
        this.actionManager = new ActionManager(this)
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
    static renderMainUI() {
        const kernel = new AppKernel()
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
        }
        kernel.setting.setEvent("onSet", key => {
            if (key === "mainUIDisplayMode") {
                $delay(0.3, () => $addin.restart())
            }
        })
        if (kernel.setting.get("mainUIDisplayMode") === 0) {
            kernel.useJsboxNav()
            kernel.setting.useJsboxNav()
            kernel.setNavButtons([
                {
                    symbol: buttons.setting.icon,
                    title: buttons.setting.title,
                    handler: () => {
                        UIKit.push({
                            title: buttons.setting.title,
                            views: [kernel.setting.getListView()]
                        })
                    }
                },
                {
                    symbol: buttons.actions.icon,
                    title: buttons.actions.title,
                    handler: () => {
                        kernel.actionManager.present()
                    }
                }
            ])

            kernel.UIRender(kernel.clipboard.getPageController().getPage())
        } else {
            kernel.tabBarController = new TabBarController()
            const clipboardPageController = kernel.clipboard.getPageController()
            kernel.tabBarController
                .setPages({
                    clipboard: clipboardPageController.getPage(),
                    actions: kernel.actionManager.getPageView(),
                    setting: kernel.setting.getPageView()
                })
                .setCells({
                    clipboard: buttons.clipboard,
                    actions: buttons.actions,
                    setting: buttons.setting
                })

            kernel.UIRender(kernel.tabBarController.generateView().definition)
        }
    }

    static renderKeyboardUI() {
        const kernel = new AppKernel()
        const Keyboard = require("./ui/keyboard")
        const keyboard = new Keyboard(kernel)
        $ui.render({ views: [keyboard.getView()] })
    }

    static renderTodayUI() {
        const kernel = new AppKernel()
        const Today = require("./ui/today")
        const today = new Today(kernel)
        $ui.render({ views: [today.getView()] })
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

        const widget = Widget.widgetInstance("Clipboard", setting, new Storage(false, { fileStorage }))

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
    run: () => {
        //AppUI.renderTodayUI(); return
        //AppUI.renderKeyboardUI(); return
        //Widget.render(); return
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
