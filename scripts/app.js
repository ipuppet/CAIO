const { Kernel, VERSION } = require("../EasyJsBox/src/kernel")
const Storage = require("./storage")

class AppKernel extends Kernel {
    constructor() {
        super()
        this.query = $context.query
        // 注册组件
        this.settingComponent = this.registerComponent("Setting")
        this.setting = this.settingComponent.controller
        // Storage
        this.storage = new Storage(this.setting.get("clipboard.autoSync"))
        // 初始话设置中的方法
        this.initSettingMethods()
        this.page = this.registerComponent("Page")
        this.menu = this.registerComponent("Menu")
        // action 相关路径
        this.actionPath = "/scripts/action/"
        this.actionOrderFile = "order.json"
    }

    print(message) {
        console.log(message)
    }

    getActionTypes() {
        const type = ["clipboard", "editor"] // 保证 "clipboard", "editor" 排在前面
        return type.concat($file.list(this.actionPath).filter(dir => { // 获取 type.indexOf(dir) < 0 的文件夹名
            if ($file.isDirectory(this.actionPath + "/" + dir) && type.indexOf(dir) < 0)
                return dir
        }))
    }

    getActionOrder(type) {
        const path = `${this.actionPath}${type}/${this.actionOrderFile}`
        if ($file.exists(path)) return JSON.parse($file.read(path).string)
        else return []
    }

    getActions(type) {
        const actions = []
        const typePath = `${this.actionPath}${type}/`
        if (!$file.exists(typePath)) return []
        const pushAction = item => {
            const basePath = `${typePath}/${item}/`
            if ($file.isDirectory(basePath)) {
                const config = JSON.parse($file.read(basePath + "config.json").string)
                actions.push(Object.assign(config, {
                    dir: item,
                    type: type,
                    name: config.name ?? item,
                    handler: data => {
                        const ActionClass = require(basePath + "main.js")
                        const action = new ActionClass(this, config, data)
                        action.do()
                    }
                }))
            }
        }
        // push 有顺序的 Action
        const order = this.getActionOrder(type)
        order.forEach(item => pushAction(item))
        // push 剩下的 Action
        $file.list(typePath).forEach(item => {
            if (order.indexOf(item) === -1)
                pushAction(item)
        })
        return actions
    }

    getActionButton(get, type = "all") {
        return this.UIKit.navButton("add", "bolt.circle", (animate, sender) => {
            const data = { text: get.text() }
            const defaultData = Object.keys(data)
            Object.keys(get).map(item => {
                if (defaultData.indexOf(item) === -1) {
                    if (typeof get[item] === "function") {
                        data[item] = get[item]()
                    } else {
                        data[item] = get[item]
                    }
                }
            })
            const popover = $ui.popover({
                sourceView: sender,
                directions: $popoverDirection.up,
                size: $size(200, 300),
                views: [
                    {
                        type: "label",
                        props: {
                            text: $l10n("ACTION"),
                            color: $color("secondaryText"),
                            font: $font(14)
                        },
                        layout: (make, view) => {
                            make.top.equalTo(view.super.safeArea).offset(0)
                            make.height.equalTo(40)
                            make.left.inset(20)
                        }
                    },
                    this.UIKit.underline(),
                    {
                        type: "list",
                        layout: (make, view) => {
                            make.width.equalTo(view.super)
                            make.top.equalTo(view.prev.bottom)
                            make.bottom.inset(0)
                        },
                        props: {
                            data: this.getActions(type).map(action => {
                                return {
                                    type: "label",
                                    layout: (make, view) => {
                                        make.centerY.equalTo(view.super)
                                        make.left.right.inset(15)
                                    },
                                    props: {
                                        text: action.name
                                    },
                                    events: {
                                        tapped: () => {
                                            popover.dismiss()
                                            setTimeout(() => action.handler(data), 500)
                                        }
                                    }
                                }
                            })
                        }
                    }
                ]
            })
        })
    }

    /**
     * 注入设置中的脚本类型方法
     */
    initSettingMethods() {
        this.setting.readme = animate => {
            animate.touchHighlight()
            const content = $file.read("/README.md").string
            this.UIKit.pushPageSheet({
                views: [{
                    type: "markdown",
                    props: { content: content },
                    layout: (make, view) => {
                        make.size.equalTo(view.super)
                    }
                }],
                title: $l10n("README")
            })
        }

        this.setting.tips = animate => {
            animate.touchHighlight()
            $ui.alert("Tips")
        }

        this.setting.backupClipboard = animate => {
            animate.actionStart()
            $ui.alert({
                title: $l10n("BACKUP"),
                message: $l10n("START_BACKUP") + "?",
                actions: [
                    {
                        title: $l10n("OK"),
                        handler: () => {
                            this.storage.backup(() => animate.actionDone())
                        }
                    },
                    {
                        title: $l10n("CANCEL"),
                        handler: () => { animate.actionCancel() }
                    }
                ]
            })
        }

        this.setting.recoverClipboard = animate => {
            animate.actionStart()
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

        this.setting.backupAction = animate => {
            animate.actionStart()
            // 备份动作
            $ui.alert({
                title: $l10n("BACKUP"),
                message: $l10n("START_BACKUP") + "?",
                actions: [
                    {
                        title: $l10n("OK"),
                        handler: () => {
                            $archiver.zip({
                                directory: this.actionPath,
                                dest: "/assets/action-backup.zip",
                                handler: () => {
                                    $drive.save({
                                        data: $data({ path: "/assets/action-backup.zip" }),
                                        name: "action-backup.zip",
                                        handler: () => animate.actionDone()
                                    })
                                    $file.delete("/assets/action-backup.zip")
                                }
                            })
                        }
                    },
                    {
                        title: $l10n("CANCEL"),
                        handler: () => { animate.actionCancel() }
                    }
                ]
            })
        }

        this.setting.recoverAction = animate => {
            animate.actionStart()
            $drive.open({
                handler: data => {
                    if (data === undefined) {
                        animate.actionCancel()
                        return
                    }
                    if (data.fileName.slice(-3) === "zip") {
                        $archiver.unzip({
                            file: data,
                            dest: "/assets/action-backup",
                            handler: () => {
                                $file.list("/assets/action-backup").forEach(item => {
                                    if ($file.isDirectory("/assets/action-backup/" + item)) {
                                        $file.copy({
                                            src: "/assets/action-backup/" + item,
                                            dst: `${this.actionPath}${item}`
                                        })
                                    }
                                })
                                $file.delete("/assets/action-backup")
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

        this.setting.sync = animate => {
            animate.actionStart()
            this.storage.syncByiCloud(true, () => animate.actionDone())
        }
    }
}

class WidgetKernel extends Kernel {
    constructor() {
        super()
        this.inWidgetEnv = true
        // 小组件根目录
        this.widgetRootPath = "/scripts/widget"
        this.widgetAssetsPath = "/assets/widget"
        this.storage = new Storage()
    }

    widgetInstance(widget) {
        if ($file.exists(`${this.widgetRootPath}/${widget}/index.js`)) {
            const { Widget } = require(`./widget/${widget}/index.js`)
            return new Widget(this)
        } else {
            return false
        }
    }
}

module.exports = {
    run: () => {
        if ($app.env === $env.widget) {
            const kernel = new WidgetKernel()
            const widgetName = $widget.inputValue ?? "Clipboard"
            const widget = kernel.widgetInstance(widgetName)
            widget ? widget.render() : $widget.setTimeline({
                render: () => ({
                    type: "text",
                    props: {
                        text: "NULL"
                    }
                })
            })
        } else if ($app.env === $env.app) {
            const kernel = new AppKernel()
            const Factory = require("./ui/factory")
            new Factory(kernel).render()
        } else if ($app.env === $env.today) {
            const kernel = new AppKernel()
            const Today = require("./ui/today")
            new Today(kernel).render()
        } else {
            $ui.render({
                views: [{
                    type: "label",
                    props: {
                        text: "不支持在此环境中运行",
                        align: $align.center
                    },
                    layout: (make, view) => {
                        make.center.equalTo(view.super)
                        make.size.equalTo(view.super)
                    }
                }]
            })
        }
    }
}