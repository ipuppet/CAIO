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
        this.storage = new Storage(this.setting)
        // 初始话设置中的方法
        this.initSettingMethods()
        this.page = this.registerComponent("Page")
        this.menu = this.registerComponent("Menu")
    }

    uuid() {
        let s = []
        const hexDigits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        for (let i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
        }
        s[14] = "4" // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = "-"

        return s.join("")
    }

    updateHomeScreenWidgetOptions() {

    }

    /**
     * 注入设置中的脚本类型方法
     */
    initSettingMethods() {
        this.setting.readme = animate => {
            animate.touchHighlightStart()
            const content = $file.read("/README.md").string
            this.UIKit.push({
                view: [{
                    type: "markdown",
                    props: { content: content },
                    layout: (make, view) => {
                        make.size.equalTo(view.super)
                    }
                }],
                title: $l10n("README"),
                disappeared: () => {
                    animate.touchHighlightEnd()
                }
            })
        }

        this.setting.tips = animate => {
            animate.touchHighlight()
            $ui.alert("Tips")
        }

        this.setting.backupToICloud = animate => {
            animate.actionStart()
            $ui.alert({
                title: $l10n("BACKUP"),
                message: $l10n("START_BACKUP") + "?",
                actions: [
                    {
                        title: $l10n("OK"),
                        handler: () => {
                            this.storage.backupToICloud() ? animate.actionDone() : animate.actionCancel()
                        }
                    },
                    {
                        title: $l10n("CANCEL"),
                        handler: () => { animate.actionCancel() }
                    }
                ]
            })
        }

        this.setting.recoverFromICloud = animate => {
            animate.actionStart()
            $drive.open({
                handler: data => {
                    this.storage.recoverFromICloud(data) ? animate.actionDone() : animate.actionCancel()
                }
            })
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
    }

    widgetInstance(widget, that) {
        if ($file.exists(`${this.widgetRootPath}/${widget}/index.js`)) {
            const { Widget } = require(`./widget/${widget}/index.js`)
            return new Widget(that)
        } else {
            return false
        }
    }
}

module.exports = {
    run: () => {
        if ($app.env === $env.widget) {
            const kernel = new WidgetKernel()
            const widgetName = $widget.inputValue
            const widget = kernel.widgetInstance(widgetName)
            widget ? widget.render() : $widget.setTimeline({
                render: () => ({
                    type: "text",
                    props: {
                        text: "去主程序选择一个Widget，或者参数有误？\n注意，不需要引号"
                    }
                })
            })
        } else if ($app.env === $env.app) {
            const kernel = new AppKernel()
            const Factory = require("./ui/main/factory")
            new Factory(kernel).render()
            // 监听运行状态
            $app.listen({
                pause: () => {
                    $widget.reloadTimeline()
                    kernel.updateHomeScreenWidgetOptions()
                }
            })
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