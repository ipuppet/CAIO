const {
    versionCompare,
    UIKit,
    Sheet,
    TabBarController,
    Kernel,
    FileStorage,
    Setting
} = require("./libs/easy-jsbox")
const Storage = require("./storage")
const Clipboard = require("./ui/clipboard")
const ActionManager = require("./ui/components/action-manager")
const Editor = require("./ui/components/editor")

const KeyboardScripts = require("./ui/components/keyboard-scripts")
const TodayActions = require("./ui/components/today-actions")

const fileStorage = new FileStorage()

class AppKernel extends Kernel {
    constructor() {
        super()
        this.query = $context.query
        // FileStorage
        this.fileStorage = fileStorage
        // Setting
        this.setting = new Setting({ fileStorage: this.fileStorage })
        this.setting.loadConfig()
        this.initSettingMethods()
        // Storage
        this.storage = new Storage(this.setting.get("clipboard.autoSync"), this.fileStorage)
        this.initComponents()
    }

    initComponents() {
        // Clipboard
        this.clipboard = new Clipboard(this)
        // ActionManager
        this.actionManager = new ActionManager(this)
        // Editor
        this.editor = new Editor(this)
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

    /**
     * 注入设置中的脚本类型方法
     */
    initSettingMethods() {
        this.setting.method.readme = animate => {
            animate.touchHighlight()
            const content = $file.read("/README.md").string
            const sheet = new Sheet()
            sheet
                .setView({
                    type: "markdown",
                    props: { content: content },
                    layout: (make, view) => {
                        make.size.equalTo(view.super)
                    }
                })
                .init()
                .present()
        }

        this.setting.method.exportClipboard = animate => {
            animate.actionStart()
            this.storage.export(success => {
                if (success) {
                    animate.actionDone()
                } else {
                    animate.actionCancel()
                }
            })
        }

        this.setting.method.importClipboard = animate => {
            animate.actionStart()
            $ui.alert({
                title: $l10n("ALERT_INFO"),
                message: $l10n("OVERWRITE_ALERT"),
                actions: [
                    {
                        title: $l10n("OK"),
                        handler: () => {
                            $drive.open({
                                handler: data => {
                                    if (data === undefined) {
                                        animate.actionCancel()
                                        return
                                    }
                                    if (data.fileName.slice(-2) === "db" || data.fileName.slice(-3) === "zip") {
                                        this.storage.import(data)
                                            .then(() => {
                                                animate.actionDone()
                                                $delay(0.3, () => {
                                                    $addin.restart()
                                                })
                                            })
                                            .catch(error => {
                                                $ui.error(error)
                                                this.print(error)
                                                animate.actionCancel()
                                            })
                                    } else {
                                        $ui.warning($l10n("FILE_TYPE_ERROR"))
                                        animate.actionCancel()
                                    }
                                }
                            })
                        }
                    },
                    {
                        title: $l10n("CANCEL"),
                        handler: () => animate.actionCancel()
                    }
                ]
            })
        }

        this.setting.method.exportAction = animate => {
            animate.actionStart()
            // 备份动作
            const fileName = "actions.zip"
            const tempPath = `${this.fileStorage.basePath}/${fileName}`
            $archiver.zip({
                directory: this.actionManager.userActionPath,
                dest: tempPath,
                handler: () => {
                    $share.sheet({
                        items: [{
                            name: fileName,
                            data: $data({ path: tempPath })
                        }],
                        handler: success => {
                            if (success) {
                                animate.actionDone()
                            } else {
                                animate.actionCancel()
                            }
                            $file.delete(tempPath)
                        }
                    })
                }
            })
        }

        this.setting.method.importAction = animate => {
            animate.actionStart()
            $drive.open({
                handler: data => {
                    if (data === undefined) {
                        animate.actionCancel()
                        return
                    }
                    if (data.fileName.slice(-3) === "zip") {
                        const path = `${this.fileStorage.basePath}/action_import`
                        $archiver.unzip({
                            file: data,
                            dest: path,
                            handler: () => {
                                $file.list(path).forEach(item => {
                                    if ($file.isDirectory(`${path}/${item}`)) {
                                        $file.copy({
                                            src: `${path}/${item}`,
                                            dst: `${this.actionManager.userActionPath}${item}`
                                        })
                                    }
                                })
                                $file.delete(path)
                                animate.actionDone()
                            }
                        })
                    } else {
                        $ui.warning($l10n("FILE_TYPE_ERROR"))
                        animate.actionCancel()
                    }
                }
            })
        }

        this.setting.method.sync = animate => {
            $ui.alert({
                title: $l10n("SYNC_NOW"),
                message: $l10n("SYNC_ALERT_INFO"),
                actions: [
                    { title: $l10n("CANCEL") },
                    {
                        title: $l10n("OK"),
                        handler: () => {
                            animate.actionStart()
                            setTimeout(() => {
                                this.storage
                                    .syncByiCloud(true)
                                    .then(() => {
                                        animate.actionDone()
                                    })
                                    .catch(error => {
                                        $ui.error(error)
                                        this.print(error)
                                        animate.actionCancel()
                                    })
                            }, 200)
                        }
                    }
                ]
            })
        }

        this.setting.method.deleteICloudData = animate => {
            this.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), () => {
                if (this.storage.deleteICloudData()) {
                    animate.actionDone()
                } else {
                    $ui.toast($l10n("DELETE_ERROR"))
                }
            })
        }

        this.setting.method.importExampleAction = animate => {
            animate.actionStart()
            this.actionManager.importExampleAction()
            animate.actionDone()
        }

        this.setting.method.checkUpdate = animate => {
            animate.actionStart()
            this.checkUpdate(content => {
                $file.write({
                    data: $data({ string: content }),
                    path: "scripts/libs/easy-jsbox.js"
                })
                $ui.toast("The framework has been updated.")
            })
            $http.get({
                url: "https://raw.githubusercontent.com/ipuppet/CAIO/master/config.json",
                handler: resp => {
                    const version = resp.data?.info.version
                    const config = JSON.parse($file.read("config.json").string)
                    if (versionCompare(version, config.info.version) > 0) {
                        $ui.alert({
                            title: "New Version",
                            message: `New version found: ${version}\nUpdate via Github or click the button to open Erots.`,
                            actions: [
                                { title: $l10n("CANCEL") },
                                {
                                    title: "Erots",
                                    handler: () => {
                                        $addin.run({
                                            name: "Erots",
                                            query: {
                                                "q": "show",
                                                "objectId": "603e6eaaca0dd64fcef93e2d"
                                            }
                                        })
                                    }
                                }
                            ]
                        })
                    } else {
                        $ui.toast("No need to update")
                    }
                    animate.actionDone()
                }
            })
        }

        this.setting.method.previewWidget = animate => {
            animate.touchHighlight()
            const widgets = {}
            try {
                JSON.parse($file.read("widget-options.json").string).forEach(item => {
                    widgets[item.name] = item.value
                })
            } catch (error) {
                $ui.error(error)
                return
            }
            $ui.menu({
                items: Object.keys(widgets),
                handler: name => {
                    Widget.render(widgets[name])
                }
            })
        }

        this.setting.method.previewKeyboard = animate => {
            animate.touchHighlightStart()
            const Keyboard = require("./ui/keyboard")
            const keyboard = new Keyboard(this).getView()
            UIKit.push({
                views: [keyboard],
                disappeared: () => animate.touchHighlightEnd()
            })
        }

        this.setting.method.setKeyboardQuickStart = animate => {
            animate.touchHighlight()
            if (this.isUseJsboxNav) {
                KeyboardScripts.push()
            } else {
                this.setting.viewController.push(KeyboardScripts.getPageController())
            }
        }

        this.setting.method.previewTodayWidget = animate => {
            animate.touchHighlightStart()
            const Today = require("./ui/today")
            const today = new Today(this).getView()
            UIKit.push({
                views: [today],
                disappeared: () => animate.touchHighlightEnd()
            })
        }

        this.setting.method.setTodayWidgetActions = animate => {
            animate.touchHighlight()
            if (this.isUseJsboxNav) {
                TodayActions.push(this)
            } else {
                this.setting.viewController.push(TodayActions.getPageController(this))
            }
        }
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
            kernel.editor.viewController.setRootPageController(clipboardPageController)
            kernel.tabBarController.setPages({
                clipboard: clipboardPageController.getPage(),
                actions: kernel.actionManager.getPageView(),
                setting: kernel.setting.getPageView()
            }).setCells({
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
            views: [{
                type: "label",
                props: {
                    text: "不支持在此环境中运行",
                    align: $align.center
                },
                layout: $layout.fill
            }]
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
        const widget = Widget.widgetInstance(
            "Clipboard",
            setting,
            new Storage(false, fileStorage)
        )
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