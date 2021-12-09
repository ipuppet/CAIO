const {
    UIKit,
    Sheet,
    Kernel,
    Setting
} = require("./easy-jsbox")
const Storage = require("./storage")

class AppKernel extends Kernel {
    constructor() {
        super()
        this.query = $context.query
        // 初始化必要路径
        if (!$file.exists("storage")) $file.mkdir("storage")
        // 初始话设置
        this.setting = new Setting()
        this.setting.loadConfig()
        this.initSettingMethods()
        // Storage
        this.storage = new Storage(this.setting.get("clipboard.autoSync"))
        // action 相关路径
        this.actionPath = "scripts/action/"
        this.actionOrderFile = "order.json"
        this.userActionPath = "storage/user_action/"
        this.checkUserAction()
        // 用来存储被美化的 Action 分类名称
        this.typeNameMap = {}
        // 检查更新
        /* this.checkUpdate(content => {
            $file.write({
                data: $data({ string: content }),
                path: "scripts/easy-jsbox.js"
            })
            $ui.toast("The framework has been updated.")
        }) */
    }

    importExampleAction() {
        $file.list(this.actionPath).forEach(type => {
            const actionTypePath = `${this.actionPath}${type}`
            if ($file.isDirectory(actionTypePath)) {
                const userActionTypePath = `${this.userActionPath}${type}`
                $file.list(actionTypePath).forEach(item => {
                    if (!$file.exists(`${userActionTypePath}/${item}/main.js`)) {
                        $file.mkdir(userActionTypePath)
                        $file.copy({
                            src: `${actionTypePath}/${item}`,
                            dst: `${userActionTypePath}/${item}`
                        })
                    }
                })
            }
        })
    }

    checkUserAction() {
        if (!$file.exists(this.userActionPath) || $file.list(this.userActionPath).length === 0) {
            $file.mkdir(this.userActionPath)
            this.importExampleAction()
        }
    }

    getActionTypes() {
        const type = ["clipboard", "editor"] // 保证 "clipboard", "editor" 排在前面
        return type.concat($file.list(this.userActionPath).filter(dir => { // 获取 type.indexOf(dir) < 0 的文件夹名
            if ($file.isDirectory(this.userActionPath + "/" + dir) && type.indexOf(dir) < 0)
                return dir
        }))
    }

    getActionOrder(type) {
        const path = `${this.userActionPath}${type}/${this.actionOrderFile}`
        if ($file.exists(path)) return JSON.parse($file.read(path).string)
        else return []
    }

    getActionHandler(type, name, basePath) {
        if (!basePath) basePath = `${this.userActionPath}${type}/${name}/`
        const config = JSON.parse($file.read(basePath + "config.json").string)
        return data => {
            const ActionClass = require(basePath + "main.js")
            const action = new ActionClass(this, config, data)
            action.do()
        }
    }

    getActions(type) {
        const actions = []
        const typePath = `${this.userActionPath}${type}/`
        if (!$file.exists(typePath)) return []
        const pushAction = item => {
            const basePath = `${typePath}/${item}/`
            if ($file.isDirectory(basePath)) {
                const config = JSON.parse($file.read(basePath + "config.json").string)
                actions.push(Object.assign(config, {
                    dir: item,
                    type: type,
                    name: config.name ?? item,
                    icon: config.icon
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

    actionToData(action) {
        return {
            name: { text: action.name },
            icon: action.icon.slice(0, 5) === "icon_"
                ? { icon: $icon(action.icon.slice(5, action.icon.indexOf(".")), $color("#ffffff")) }
                : { image: $image(action.icon) },
            color: { bgcolor: $color(action.color) },
            info: { info: action } // 此处实际上是 info 模板的 props，所以需要 { info: action }
        }
    }

    getTypeName(type) {
        const typeUpperCase = type.toUpperCase()
        const l10n = $l10n(typeUpperCase)
        const name = l10n === typeUpperCase ? type : l10n
        this.typeNameMap[name] = type
        return name
    }

    getTypeDir(name) {
        return this.typeNameMap[name] ?? name
    }

    getActionListView(title, props = {}, events = {}) {
        const data = []
        this.getActionTypes().forEach(type => {
            const section = {
                title: this.getTypeName(type),
                rows: []
            }
            this.getActions(type).forEach(action => {
                section.rows.push(this.actionToData(action))
            })
            data.push(section)
        })
        return {
            type: "list",
            layout: (make, view) => {
                make.top.width.equalTo(view.super)
                make.bottom.inset(0)
            },
            events: events,
            props: Object.assign({
                reorder: false,
                bgcolor: $color("clear"),
                rowHeight: 60,
                sectionTitleHeight: 30,
                stickyHeader: true,
                header: {
                    type: "view",
                    props: { height: 25 },
                    views: [{
                        type: "label",
                        props: {
                            text: title,
                            color: $color("secondaryText"),
                            font: $font(14)
                        },
                        layout: (make, view) => {
                            make.top.equalTo(view.super.safeArea).offset(10)
                            make.height.equalTo(30)
                            make.left.inset(15)
                        }
                    }, UIKit.separatorLine()]
                },
                data: data,
                template: {
                    props: { bgcolor: $color("clear") },
                    views: [
                        {
                            type: "image",
                            props: {
                                id: "color",
                                cornerRadius: 8,
                                smoothCorners: true
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.left.inset(15)
                                make.size.equalTo($size(30, 30))
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: "icon",
                                tintColor: $color("#ffffff"),
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.left.inset(20)
                                make.size.equalTo($size(20, 20))
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "name",
                                lines: 1,
                                font: $font(16)
                            },
                            layout: (make, view) => {
                                make.height.equalTo(30)
                                make.centerY.equalTo(view.super)
                                make.left.equalTo(view.prev.right).offset(15)
                            }
                        },
                        { type: "label", props: { id: "info" } }
                    ]
                }
            }, props)
        }
    }

    getActionButton(getDataObject) {
        return {
            symbol: "bolt.circle",
            tapped: (animate, sender) => {
                const content = { text: getDataObject.text() }
                const defaultData = Object.keys(content)
                Object.keys(getDataObject).map(item => {
                    if (defaultData.indexOf(item) === -1) {
                        if (typeof getDataObject[item] === "function") {
                            content[item] = getDataObject[item]()
                        } else {
                            content[item] = getDataObject[item]
                        }
                    }
                })
                const popover = $ui.popover({
                    sourceView: sender,
                    directions: $popoverDirection.up,
                    size: $size(200, 300),
                    views: [this.getActionListView($l10n("ACTION"), {}, {
                        didSelect: (sender, indexPath, data) => {
                            popover.dismiss()
                            const action = this.getActionHandler(data.info.info.type, data.info.info.dir)
                            setTimeout(() => action(content), 500)
                        }
                    })]
                })
            }
        }
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
                directory: this.userActionPath,
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
                                            dst: `${this.userActionPath}${item}`
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
            this.importExampleAction()
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
            const Factory = require("./ui/factory")
            new Factory(kernel).render()
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