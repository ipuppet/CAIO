const {
    versionCompare,
    UIKit,
    Sheet,
    Kernel,
    Setting
} = require("./lib/easy-jsbox")
const Storage = require("./storage")

class AppKernel extends Kernel {
    constructor() {
        super()
        const ActionManager = require("./ui/components/action-manager")
        const Editor = require("./ui/components/editor")
        this.query = $context.query
        // 初始化必要路径
        if (!$file.exists("storage")) $file.mkdir("storage")
        // Setting
        this.setting = new Setting()
        this.setting.loadConfig().useJsboxNav()
        this.initSettingMethods()
        // Storage
        this.storage = new Storage(this.setting.get("clipboard.autoSync"))
        // ActionManager
        this.actionManager = new ActionManager(this)
        this.actionManager.checkUserAction()
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
                                    if (data.fileName.slice(-2) === "db") {
                                        this.storage.recover(data) ? animate.actionDone() : animate.actionCancel()
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
    }
}

class AppUI {
    static renderMainUI() {
        const kernel = new AppKernel()
        kernel.useJsboxNav()
        kernel.setNavButtons([
            {
                symbol: "gear",
                title: $l10n("SETTING"),
                handler: () => {
                    UIKit.push({
                        title: $l10n("SETTING"),
                        bgcolor: Setting.bgcolor,
                        views: [kernel.setting.getListView()]
                    })
                }
            },
            {
                symbol: "command",
                title: $l10n("ACTIONS"),
                handler: () => {
                    kernel.actionManager.present()
                }
            }
        ])
        const Clipboard = require("./ui/clipboard")
        const ClipboardUI = new Clipboard(kernel)
        kernel.UIRender(ClipboardUI.getPageView())
    }

    static renderMiniUI() {
        const kernel = new AppKernel()
        const Today = require("./ui/mini")
        new Today(kernel).render()
    }

    static renderUnsupported() {
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
        if ($app.env === $env.app) {
            AppUI.renderMainUI()
        } else if ($app.env === $env.today || $app.env === $env.keyboard) {
            AppUI.renderMiniUI()
        } else if ($app.env === $env.widget) {
            Widget.render()
        } else {
            AppUI.renderUnsupported()
        }
    }
}