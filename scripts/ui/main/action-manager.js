const MainJsTemplate = `const Action = require("../../action.js")

class MyAction extends Action {
    /**
     * 系统会调用 do() 方法
     * 
     * 可用数据如下：
     * this.config 配置文件内容
     * this.text 当前复制的文本或选中的文本亦或者编辑器内的文本
     * this.uuid 该文本的 uuid
     */
    do() {
        console.log(this.text)
    }
}

module.exports = MyAction`

class ActionManager {
    constructor(kernel) {
        this.kernel = kernel
    }

    getTypes() {
        const type = ["clipboard", "editor"] // 保证 "clipboard", "editor" 排在前面
        return type.concat($file.list(this.kernel.actionPath).filter(dir => { // 获取 type.indexOf(dir) < 0 的文件夹名
            if ($file.isDirectory(this.kernel.actionPath + "/" + dir) && type.indexOf(dir) < 0)
                return dir
        }))
    }

    actionToData(action) {
        return {
            name: { text: action.name },
            icon: action.icon.slice(0, 5) === "icon_"
                ? { icon: $icon(action.icon.slice(5, action.icon.indexOf(".")), $color("#ffffff")) }
                : { image: $image(action.icon) },
            color: { bgcolor: $color(action.color) },
            info: { info: action }
        }
    }

    actionsToData() { // 格式化数据供 matrix 使用
        const data = []
        this.getTypes().forEach(type => {
            const section = {
                title: type, // TODO section 标题
                items: []
            }
            this.kernel.getActions(type).forEach(action => {
                section.items.push(this.actionToData(action))
            })
            data.push(section)
        })
        return data
    }

    createLineLabel(title, icon) {
        if (!icon[1]) icon[1] = "#00CC00"
        if (typeof icon[1] !== "object") {
            icon[1] = [icon[1], icon[1]]
        }
        if (typeof icon[0] !== "object") {
            icon[0] = [icon[0], icon[0]]
        }
        return {
            type: "view",
            views: [
                {// icon
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
                            layout: (make, view) => {
                                make.center.equalTo(view.super)
                                make.size.equalTo(20)
                            }
                        },
                    ],
                    layout: (make, view) => {
                        make.centerY.equalTo(view.super)
                        make.size.equalTo(30)
                        make.left.inset(10)
                    }
                },
                {// title
                    type: "label",
                    props: {
                        text: title,
                        textColor: this.kernel.UIKit.textColor,
                        align: $align.left
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.super)
                        make.height.equalTo(view.super)
                        make.left.equalTo(view.prev.right).offset(10)
                    }
                }
            ],
            layout: (make, view) => {
                make.centerY.equalTo(view.super)
                make.height.equalTo(view.super)
                make.left.inset(0)
            }
        }
    }

    createInput(icon, title) {
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [{
                        type: "label",
                        props: {
                            id: "action-input",
                            color: $color("secondaryText"),
                            text: this.editingActionInfo.name
                        },
                        layout: (make, view) => {
                            make.right.inset(0)
                            make.height.equalTo(view.super)

                        }
                    }],
                    events: {
                        tapped: () => {
                            $input.text({
                                text: "",
                                placeholder: title,
                                handler: text => {
                                    text = text.trim()
                                    if (text === "") {
                                        $ui.toast($l10n("INVALID_VALUE"))
                                        return
                                    }
                                    $("action-input").text = text
                                    this.editingActionInfo.name = text
                                }
                            })
                        }
                    },
                    layout: (make, view) => {
                        make.right.inset(15)
                        make.height.equalTo(50)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createColor(icon, title) {
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [
                        {// 颜色预览以及按钮功能
                            type: "view",
                            props: {
                                id: "action-color",
                                bgcolor: $color(this.editingActionInfo.color),
                                circular: true,
                                borderWidth: 1,
                                borderColor: $color("#e3e3e3")
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.right.inset(15)
                                make.size.equalTo(20)
                            }
                        },
                        { // 用来监听点击事件，增大可点击面积
                            type: "view",
                            events: {
                                tapped: async () => {
                                    const newColor = await $picker.color({ color: $color(this.editingActionInfo.color) })
                                    $("action-color").bgcolor = newColor
                                    this.editingActionInfo.color = newColor.hexCode
                                    // 将下方图标选择框的背景色也更改
                                    $("action-icon-color").bgcolor = newColor
                                }
                            },
                            layout: (make, view) => {
                                make.right.inset(0)
                                make.height.width.equalTo(view.super.height)
                            }
                        }
                    ],
                    layout: (make, view) => {
                        make.height.equalTo(50)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createIcon(icon, title) {
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [
                        {
                            type: "image",
                            props: {
                                cornerRadius: 8,
                                id: "action-icon-color",
                                bgcolor: $color(this.editingActionInfo.color),
                                smoothCorners: true
                            },
                            layout: (make, view) => {
                                make.right.inset(15)
                                make.centerY.equalTo(view.super)
                                make.size.equalTo($size(30, 30))
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: "action-icon",
                                image: $image(this.editingActionInfo.icon),
                                icon: $icon(this.editingActionInfo.icon.slice(5, this.editingActionInfo.icon.indexOf(".")), $color("#ffffff")),
                                tintColor: $color("#ffffff")
                            },
                            layout: (make, view) => {
                                make.right.inset(20)
                                make.centerY.equalTo(view.super)
                                make.size.equalTo($size(20, 20))
                            }
                        }
                    ],
                    events: {
                        tapped: () => {
                            $ui.menu({
                                items: [$l10n("JSBOX_ICON"), $l10n("SF_SYMBOLS"), $l10n("IMAGE_BASE64")],
                                handler: async (title, idx) => {
                                    if (idx === 0) {
                                        const icon = await $ui.selectIcon()
                                        $("action-icon").icon = $icon(icon.slice(5, icon.indexOf(".")), $color("#ffffff"))
                                        this.editingActionInfo.icon = icon
                                    } else if (idx === 1 || idx === 2) {
                                        $input.text({
                                            text: "",
                                            placeholder: title,
                                            handler: text => {
                                                text = text.trim()
                                                if (text === "") {
                                                    $ui.toast($l10n("INVALID_VALUE"))
                                                    return
                                                }
                                                if (idx === 1) $("action-icon").symbol = text
                                                else $("action-icon").image = $image(text)
                                                this.editingActionInfo.icon = text
                                            }
                                        })
                                    }
                                }
                            })
                        }
                    },
                    layout: (make, view) => {
                        make.right.inset(0)
                        make.height.equalTo(50)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    createMenu(icon, title, items, withTitle = true) {
        const id = `action-menu`
        return {
            type: "view",
            props: { id: `${id}-line` },
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [
                        {
                            type: "label",
                            props: {
                                text: this.editingActionInfo.type,
                                color: $color("secondaryText"),
                                id: id
                            },
                            layout: (make, view) => {
                                make.right.inset(0)
                                make.height.equalTo(view.super)
                            }
                        }
                    ],
                    layout: (make, view) => {
                        make.right.inset(15)
                        make.height.equalTo(50)
                        make.width.equalTo(view.super)
                    }
                }
            ],
            events: {
                tapped: () => {
                    $(`${id}-line`).bgcolor = $color("insetGroupedBackground")
                    $ui.menu({
                        items: items,
                        handler: (title, idx) => {
                            this.editingActionInfo.type = title
                            $(id).text = $l10n(title)
                        },
                        finished: () => {
                            $ui.animate({
                                duration: 0.2,
                                animation: () => {
                                    $(`${id}-line`).bgcolor = $color("clear")
                                }
                            })
                        }
                    })
                }
            },
            layout: $layout.fill
        }
    }

    editActionInfoPageSheet(info, done) {
        this.editingActionInfo = info ?? {
            dir: this.kernel.uuid(), // 随机生成文件夹名
            type: "clipboard",
            name: "MyAction",
            color: "#CC00CC",
            icon: "icon_062.png", // 默认星星图标
            description: "",
        }
        const nameInput = this.createInput(["pencil.circle", "#FF3366"], $l10n("NAME"))
        const createColor = this.createColor(["pencil.tip.crop.circle", "#0066CC"], $l10n("COLOR"))
        const iconInput = this.createIcon(["star.circle", "#FF9933"], $l10n("ICON"))
        const typeMenu = this.createMenu(["tag.circle", "#33CC33"], $l10n("TYPE"), this.getTypes())
        this.kernel.UIKit.pushPageSheet({
            views: [{
                type: "list",
                props: {
                    bgcolor: $color("insetGroupedBackground"),
                    style: 2,
                    separatorInset: $insets(0, 50, 0, 10), // 分割线边距
                    rowHeight: 50,
                    data: [nameInput, createColor, iconInput, typeMenu]
                },
                layout: $layout.fill
            }],
            done: () => {
                if (done) done(this.editingActionInfo)
            }
        })
    }

    saveActionInfo(info) {
        const path = `${this.kernel.actionPath}${info.type}/${info.dir}/`
        if (!$file.exists(path)) $file.mkdir(path)
        $file.write({
            data: $data({
                "string": JSON.stringify({
                    name: info.name,
                    color: info.color,
                    icon: info.icon,
                    description: info.description,
                })
            }),
            path: `${path}config.json`
        })
    }

    saveMainJs(content, info) {
        const path = `${this.kernel.actionPath}${info.type}/${info.dir}/`
        if (!$file.exists(path)) $file.mkdir(path)
        $file.write({
            data: $data({ "string": content }),
            path: `${path}main.js`
        })
    }

    navButtons() {
        return [
            this.kernel.UIKit.navButton("add", "plus.circle", (animate, sender) => {
                const newItem = (title, tapped) => {
                    return {
                        type: "label",
                        layout: (make, view) => {
                            make.left.right.inset(15)
                            make.height.equalTo(40)
                            make.width.equalTo(view.super)
                            make.top.equalTo(view.prev?.bottom)
                        },
                        props: { text: title },
                        events: {
                            tapped: () => tapped()
                        }
                    }
                }
                const popover = $ui.popover({
                    sourceView: sender,
                    directions: $popoverDirection.right,
                    size: $size(200, 80),
                    views: [{
                        type: "view",
                        views: [
                            newItem($l10n("CREATE_NEW_ACTION"), () => {
                                this.editActionInfoPageSheet(null, info => {
                                    this.saveActionInfo(info)
                                    $("actions").insert({
                                        indexPath: $indexPath(this.getTypes().indexOf(info.type), 0),
                                        value: this.actionToData(info)
                                    })
                                    popover.dismiss()
                                    this.kernel.editor.push(MainJsTemplate, content => {
                                        this.saveMainJs(content, info)
                                    })
                                })
                            }),
                            { // 分割线
                                type: "view",
                                props: { bgcolor: $color("separatorColor") },
                                layout: (make, view) => {
                                    make.width.equalTo(view.super)
                                    make.height.equalTo(0.5)
                                    make.top.equalTo(view.prev.bottom)
                                }
                            },
                            newItem($l10n("CREATE_NEW_TYPE"), () => {
                                $input.text({
                                    text: "",
                                    placeholder: $l10n("CREATE_NEW_TYPE"),
                                    handler: text => {
                                        text = text.trim()
                                        if (text === "") {
                                            $ui.toast($l10n("INVALID_VALUE"))
                                            return
                                        }
                                        const path = `${this.kernel.actionPath}${text}`
                                        if ($file.exists(path)) {
                                            $ui.warning($l10n("TYPE_ALREADY_EXISTS"))
                                        } else {
                                            $file.mkdir()
                                            $ui.success($l10n("SUCCESS"))
                                        }
                                        setTimeout(() => { popover.dismiss() }, 1000)
                                    }
                                })
                            })
                        ],
                        layout: $layout.fill
                    }]
                })
            })
        ]
    }

    menuItems() { // 卡片长按菜单
        return [
            { // 编辑信息
                title: $l10n("EDIT"),
                handler: (sender, indexPath) => {
                    const info = sender.object(indexPath).info.info
                    this.editActionInfoPageSheet(info, info => {
                        this.saveActionInfo(info)
                        // 更新视图信息
                        const view = sender.cell(indexPath)
                        view.get("info").info = info
                        view.get("color").bgcolor = $color(info.color)
                        view.get("name").text = info.name
                        if (info.icon.slice(0, 5) === "icon_") {
                            view.get("icon").icon = $icon(info.icon.slice(5, info.icon.indexOf(".")), $color("#ffffff"))
                        } else {
                            view.get("icon").image = $image(info.icon)
                        }
                    })
                }
            },
            { // 删除
                title: $l10n("DELETE"),
                destructive: true,
                handler: (sender, indexPath) => {
                    $ui.alert({
                        title: $l10n("CONFIRM_DELETE_MSG"),
                        actions: [
                            {
                                title: $l10n("DELETE"),
                                style: $alertActionType.destructive,
                                handler: () => {
                                    const info = sender.object(indexPath).info.info
                                    $file.delete(`${this.kernel.actionPath}${info.type}/${info.dir}`)
                                    sender.delete(indexPath)
                                }
                            },
                            { title: $l10n("CANCEL") }
                        ]
                    })
                }
            }
        ]
    }

    getViews() {
        return [ // 水平安全距离手动设置，因为需要设置背景色
            {
                type: "view",
                props: { bgcolor: $color("insetGroupedBackground") },
                layout: $layout.fill,
                views: [
                    { // 顶部按钮栏
                        type: "view",
                        views: [{
                            type: "view",
                            views: this.navButtons(),
                            layout: (make, view) => {
                                make.top.equalTo(view.super.safeAreaTop)
                                make.size.equalTo(view.super.safeArea)
                            }
                        }],
                        layout: (make, view) => {
                            make.top.equalTo(view.super)
                            make.bottom.equalTo(view.super.safeAreaTop).offset(50)
                            make.left.right.equalTo(view.super.safeArea)
                        }
                    },
                    {
                        type: "matrix",
                        props: {
                            id: "actions",
                            autoItemSize: true,
                            estimatedItemSize: $size(($device.info.screen.width - 60) / 2, 100),
                            spacing: 20,
                            indicatorInsets: $insets(0, 0, 50, 0),
                            bgcolor: $color("insetGroupedBackground"),
                            menu: { items: this.menuItems() },
                            header: {
                                type: "view",
                                props: {
                                    height: 40,
                                    clipsToBounds: true
                                },
                                views: [{
                                    type: "label",
                                    props: {
                                        text: $l10n("ACTION"),
                                        font: $font("bold", 35)
                                    },
                                    layout: (make, view) => {
                                        make.left.equalTo(view.super).offset(20)
                                        make.top.equalTo(view.super)
                                    }
                                }]
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
                                        layout: make => {
                                            make.top.left.inset(10)
                                            make.size.equalTo($size(30, 30))
                                        }
                                    },
                                    {
                                        type: "image",
                                        props: {
                                            id: "icon",
                                            tintColor: $color("#ffffff"),
                                        },
                                        layout: make => {
                                            make.top.left.inset(15)
                                            make.size.equalTo($size(20, 20))
                                        }
                                    },
                                    {
                                        type: "image",
                                        props: {
                                            symbol: "ellipsis.circle"
                                        },
                                        events: {
                                            tapped: sender => {
                                                const info = sender.next.info
                                                if (!info) return
                                                const path = `${this.kernel.actionPath}${info.type}/${info.dir}/main.js`
                                                const main = $file.read(path).string
                                                this.kernel.editor.push(main, content => {
                                                    this.saveMainJs(content, info)
                                                })
                                            }
                                        },
                                        layout: make => {
                                            make.top.right.inset(10)
                                            make.size.equalTo($size(25, 25))
                                        }
                                    },
                                    { type: "label", props: { id: "info" } }, // 仅用来保存信息
                                    {
                                        type: "label",
                                        props: {
                                            id: "name",
                                            font: $font(16)
                                        },
                                        layout: (make, view) => {
                                            make.bottom.left.inset(10)
                                            make.width.equalTo(view.super)
                                        }
                                    }
                                ]
                            }
                        },
                        events: {
                            pulled: animate => {
                                setTimeout(() => {
                                    $("actions").data = this.actionsToData()
                                    animate.endRefreshing()
                                }, 500)
                            },
                            didSelect: (sender, indexPath, data) => {
                                const info = data.info.info
                                const ActionClass = require(`${this.kernel.actionPath}${info.type}/${info.dir}/main.js`)
                                const action = new ActionClass(this.kernel, info, {
                                    text: info.type === "clipboard" ? $clipboard.text : null,
                                    uuid: null
                                })
                                action.do()
                            }
                        },
                        layout: (make, view) => {
                            make.bottom.equalTo(view.super)
                            make.top.equalTo(view.prev.bottom)
                            make.left.right.equalTo(view.super.safeArea)
                        }
                    }
                ]
            }
        ]
    }
}

module.exports = ActionManager