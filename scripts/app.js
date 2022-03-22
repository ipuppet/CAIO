const {
    versionCompare,
    UIKit,
    Sheet,
    TabBarController,
    Kernel,
    Setting
} = require("./lib/easy-jsbox")
const Storage = require("./storage")
const Clipboard = require("./ui/clipboard")
const ActionManager = require("./ui/components/action-manager")
const Editor = require("./ui/components/editor")

class AppKernel extends Kernel {
    constructor() {
        super()
        // this.debug()
        this.query = $context.query
        // Setting
        this.setting = new Setting()
        this.setting.loadConfig()
        this.initSettingMethods()
        // Storage
        this.storage = new Storage(this.setting.get("clipboard.autoSync"), this)
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

    /**
     * 压缩图片
     * @param {$image} image $image
     * @param {Number} maxSize 图片最大尺寸 单位：像素
     * @returns $image
     */
    compressImage(image, maxSize = 1280 * 720) {
        const info = $imagekit.info(image)
        if (info.height * info.width > maxSize) {
            const scale = maxSize / (info.height * info.width)
            image = $imagekit.scaleBy(image, scale)
        }
        return image
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
                                            .catch(() => animate.actionCancel())
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
            const tempPath = `/storage/${fileName}`
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
                        const path = "/storage/action_import"
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
                                        animate.actionCancel()
                                    })
                            }, 200)
                        }
                    }
                ]
            })
        }

        this.setting.method.deleteIcloudData = animate => {
            this.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), () => {
                if (this.storage.deleteIcloudData()) {
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
                    path: "scripts/lib/easy-jsbox.js"
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
            const widgets = []
            try {
                JSON.parse($file.read("widget-options.json").string).map(widget => widgets.push(widget.value))
            } catch (error) {
                $ui.error(error)
                return
            }
            $ui.menu({
                items: ["Clipboard"],
                handler: title => {
                    Widget.render(title)
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
            const KeyboardScripts = require("./ui/components/keyboard-scripts")
            if (this.isUseJsboxNav) {
                KeyboardScripts.push()
            } else {
                this.setting.viewController.push(KeyboardScripts.getPageController())
            }
        }
    }
}

class AppUI {
    static renderMainUI() {
        const kernel = new AppKernel()
        const buttons = {
            clipboard: {
                icon: ["house", "house.fill"],
                title: $l10n("CLIPBOARD")
            },
            action: {
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
                            bgcolor: Setting.bgcolor,
                            views: [kernel.setting.getListView()]
                        })
                    }
                },
                {
                    symbol: buttons.action.icon,
                    title: buttons.action.title,
                    handler: () => {
                        kernel.actionManager.present()
                    }
                }
            ])

            kernel.UIRender(kernel.clipboard.getPageView())
        } else {
            const tabBarController = new TabBarController()
            tabBarController.setPages({
                clipboard: kernel.clipboard.getPageView(),
                action: kernel.actionManager.getPageView(),
                setting: kernel.setting.getPageView()
            }).setCells({
                clipboard: buttons.clipboard,
                action: buttons.action,
                setting: buttons.setting
            })

            kernel.UIRender(tabBarController.generateView().definition)
        }
    }

    static renderKeyboardUI() {
        const kernel = new AppKernel()
        const Keyboard = require("./ui/keyboard")
        const keyboard = new Keyboard(kernel).getView()
        $ui.render({
            props: {
                clipsToSafeArea: true
            },
            views: [keyboard]
        })
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
    static widgetInstance(widget, data) {
        if ($file.exists(`/scripts/widget/${widget}.js`)) {
            const { Widget } = require(`./widget/${widget}.js`)
            return new Widget(data)
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
        const widget = Widget.widgetInstance("Clipboard", new Storage())
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
        if ($app.env === $env.app || $app.env === $env.action) {
            AppUI.renderMainUI()
        } else if ($app.env === $env.keyboard) {
            AppUI.renderKeyboardUI()
        } else if ($app.env === $env.widget) {
            Widget.render()
        } else {
            AppUI.renderUnsupported()
        }
    }
}