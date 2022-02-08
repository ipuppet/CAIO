const {
    UIKit,
    Sheet,
    Kernel,
    Setting
} = require("./easy-jsbox")
const Storage = require("./storage")
const ActionManager = require("./action-manager")
const Editor = require("./editor")

class AppKernel extends Kernel {
    constructor() {
        super()
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
        // 检查更新
        /* this.checkUpdate(content => {
            $file.write({
                data: $data({ string: content }),
                path: "scripts/easy-jsbox.js"
            })
            $ui.toast("The framework has been updated.")
        }) */
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
            animate.actionStart()
            setTimeout(() => this.storage.syncByiCloud(true, () => animate.actionDone()), 200)
        }

        this.setting.method.importExampleAction = animate => {
            animate.actionStart()
            this.actionManager.importExampleAction()
            animate.actionDone()
        }
    }
}

module.exports = {
    run: () => {
        if ($app.env === $env.widget) {
            function widgetInstance(widget) {
                if ($file.exists(`/scripts/widget/${widget}.js`)) {
                    const { Widget } = require(`./widget/${widget}.js`)
                    return new Widget(new AppKernel())
                } else {
                    return false
                }
            }
            const widgetName = $widget.inputValue ?? "Clipboard"
            const widget = widgetInstance(widgetName)
            widget ? widget.render() : $widget.setTimeline({
                render: () => ({
                    type: "text",
                    props: {
                        text: "NULL"
                    }
                })
            })
        } else if ($app.env === $env.today || $app.env === $env.keyboard) {
            const kernel = new AppKernel()
            const Today = require("./ui/mini")
            new Today(kernel).render()
        } else if ($app.env === $env.app) {
            const kernel = new AppKernel()
            kernel.useJsboxNav()
            kernel.setNavButtons([
                {
                    symbol: "gear",
                    title: $l10n("SETTING"),
                    handler: () => {
                        UIKit.push({
                            title: $l10n("SETTING"),
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
        } else {
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
}