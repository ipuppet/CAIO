class ActionManager {
    constructor(kernel) {
        this.kernel = kernel
        this.matrixId = "actions"
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
        this.kernel.getActionTypes().forEach(type => {
            const typeUpperCase = type.toUpperCase()
            const l10n = $l10n(typeUpperCase)
            const title = l10n === typeUpperCase ? type : l10n
            const section = {
                title: title, // TODO section 标题
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

    createMenu(icon, title, items) {
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

    createText(editingOffset) {
        return {
            type: "view",
            views: [
                {
                    type: "text",
                    props: {
                        id: "action-text",
                        textColor: $color("#000000", "secondaryText"),
                        bgcolor: $color("systemBackground"),
                        text: this.editingActionInfo.description,
                        insets: $insets(10, 10, 10, 10)
                    },
                    layout: $layout.fill,
                    events: {
                        tapped: sender => {
                            $("actionInfoPageSheetList").scrollToOffset($point(0, editingOffset))
                            setTimeout(() => sender.focus(), 200)
                        },
                        didChange: sender => {
                            this.editingActionInfo.description = sender.text
                        }
                    }
                }
            ],
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
        const typeMenu = this.createMenu(["tag.circle", "#33CC33"], $l10n("TYPE"), this.kernel.getActionTypes())
        const description = this.createText(info ? 230 : 280)
        const data = [
            { title: $l10n("INFORMATION"), rows: [nameInput, createColor, iconInput] },
            { title: $l10n("DESCRIPTION"), rows: [description] },
        ]
        // 只有新建时才可选择类型
        if (!info) data[0].rows = data[0].rows.concat(typeMenu)
        this.kernel.UIKit.pushPageSheet({
            views: [{
                type: "list",
                props: {
                    id: "actionInfoPageSheetList",
                    bgcolor: $color("insetGroupedBackground"),
                    style: 2,
                    separatorInset: $insets(0, 50, 0, 10), // 分割线边距
                    data: data
                },
                layout: $layout.fill,
                events: {
                    rowHeight: (sender, indexPath) => indexPath.section === 1 ? 120 : 50
                }
            }],
            done: () => {
                this.saveActionInfo(this.editingActionInfo)
                if (done) done(this.editingActionInfo)
            }
        })
    }

    editActionMainJs(text = "", info) {
        this.kernel.editor.push(text, content => {
            this.saveMainJs(info, content)
        }, null, [
            this.kernel.UIKit.navButton("doc", "book.circle", () => {
                const content = $file.read("/scripts/action/README.md").string
                this.kernel.UIKit.pushPageSheet({
                    views: [{
                        type: "markdown",
                        props: { content: content },
                        layout: (make, view) => {
                            make.size.equalTo(view.super)
                        }
                    }]
                })
            })
        ], "code")
    }

    saveActionInfo(info) {
        const path = `${this.kernel.actionPath}${info.type}/${info.dir}/`
        if (!$file.exists(path)) $file.mkdir(path)
        $file.write({
            data: $data({
                string: JSON.stringify({
                    icon: info.icon,
                    color: info.color,
                    name: info.name,
                    description: info.description
                })
            }),
            path: `${path}config.json`
        })
        this.saveToUserAction(info)
    }

    saveMainJs(info, content) {
        const path = `${this.kernel.actionPath}${info.type}/${info.dir}/`
        const mainJsPath = `${path}main.js`
        if (!$file.exists(path)) $file.mkdir(path)
        if ($text.MD5(content) === $text.MD5($file.read(mainJsPath)?.string ?? "")) return
        $file.write({
            data: $data({ "string": content }),
            path: mainJsPath
        })
        this.saveToUserAction(info)
    }

    saveToUserAction(info) {
        const userActionPath = `${this.kernel.userActionPath}${info.type}/${info.dir}/`
        if (!$file.exists(userActionPath)) {
            $file.mkdir(userActionPath)
        }
        $file.copy({
            src: `${this.kernel.actionPath}${info.type}/${info.dir}/`,
            dst: userActionPath
        })
    }

    saveOrder(type, order) {
        $file.write({
            data: $data({ string: JSON.stringify(order) }),
            path: `${this.kernel.actionPath}${type}/${this.kernel.actionOrderFile}`
        })
    }

    move(from, to, data) {
        if (from.section === to.section && from.row === to.row) return
        // 处理 data 数据
        data = data.map(section => {
            section.rows = section.rows.map(item => item.info.info)
            return section
        })
        const fromSection = data[from.section],
            toSection = data[to.section]
        const getOrder = section => {
            const order = []
            data[section].rows.forEach(item => order.push(item.dir))
            return order
        }
        const updateUI = (insertFirst = true, type) => {
            const actionsView = $(this.matrixId)
            const toData = this.actionToData(Object.assign(toSection.rows[to.row], { type: type }))
            if (insertFirst) {
                actionsView.insert({
                    indexPath: $indexPath(to.section, to.row + 1), // 先插入时是插入到 to 位置的前面
                    value: toData
                })
                actionsView.delete(from)
            } else {
                actionsView.delete(from)
                actionsView.insert({
                    indexPath: to,
                    value: toData
                })
            }
        }
        // 判断是否跨 section
        if (from.section === to.section) {
            this.saveOrder(fromSection.title, getOrder(from.section))
        } else { // 跨 section 则同时移动 Action 目录
            this.saveOrder(fromSection.title, getOrder(from.section))
            this.saveOrder(toSection.title, getOrder(to.section))
            $file.move({
                src: `${this.kernel.actionPath}${fromSection.title}/${toSection.rows[to.row].dir}`,
                dst: `${this.kernel.actionPath}${toSection.title}/${toSection.rows[to.row].dir}`
            })
        }
        // 跨 section 时先插入或先删除无影响，type 永远是 to 的 type
        updateUI(from.rom < to.rom, toSection.title)

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
                                    $(this.matrixId).insert({
                                        indexPath: $indexPath(this.kernel.getActionTypes().indexOf(info.type), 0),
                                        value: this.actionToData(info)
                                    })
                                    popover.dismiss()
                                    const MainJsTemplate = $file.read(`${this.kernel.actionPath}template.js`).string
                                    this.editActionMainJs(MainJsTemplate, info)
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
            }),
            this.kernel.UIKit.navButton("reorder", "arrow.up.arrow.down.circle", (animate, sender) => {
                $ui.popover({
                    sourceView: sender,
                    directions: $popoverDirection.up,
                    size: $size(200, 300),
                    views: [
                        {
                            type: "label",
                            props: {
                                text: $l10n("SORT"),
                                color: $color("secondaryText"),
                                font: $font(14)
                            },
                            layout: (make, view) => {
                                make.top.equalTo(view.super.safeArea).offset(0)
                                make.height.equalTo(40)
                                make.left.inset(20)
                            }
                        },
                        this.kernel.UIKit.underline(),
                        {
                            type: "list",
                            layout: (make, view) => {
                                make.width.equalTo(view.super)
                                make.top.equalTo(view.prev.bottom)
                                make.bottom.inset(0)
                            },
                            props: {
                                reorder: true,
                                bgcolor: $color("clear"),
                                rowHeight: 60,
                                sectionTitleHeight: 30,
                                stickyHeader: true,
                                data: this.actionsToData().map(section => {
                                    return {
                                        title: section.title,
                                        rows: section.items
                                    }
                                }),
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
                                },
                                actions: [
                                    { // 删除
                                        title: "delete",
                                        handler: (sender, indexPath) => {
                                            const matrixView = $(this.matrixId)
                                            const info = matrixView.object(indexPath).info.info
                                            this.delete(info)
                                            matrixView.delete(indexPath)
                                        }
                                    }
                                ]
                            },
                            events: {
                                reorderBegan: indexPath => {
                                    if (this.reorder === undefined) this.reorder = {}
                                    this.reorder.from = indexPath
                                    this.reorder.to = undefined
                                },
                                reorderMoved: (fromIndexPath, toIndexPath) => {
                                    this.reorder.to = toIndexPath
                                },
                                reorderFinished: data => {
                                    if (this.reorder.to === undefined) return
                                    this.move(this.reorder.from, this.reorder.to, data)
                                }
                            }
                        }
                    ]
                })
            })
        ]
    }

    delete(info) {
        $file.delete(`${this.kernel.actionPath}${info.type}/${info.dir}`)
        $file.delete(`${this.kernel.userActionPath}${info.type}/${info.dir}`)
    }

    menuItems() { // 卡片长按菜单
        return [
            { // 编辑信息
                title: $l10n("EDIT_DETAILS"),
                handler: (sender, indexPath) => {
                    const info = sender.object(indexPath).info.info
                    this.editActionInfoPageSheet(info, info => {
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
                                    this.delete(sender.object(indexPath).info.info)
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
                                make.right.inset(10)
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
                            id: this.matrixId,
                            columns: 2,
                            itemHeight: 100,
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
                            footer: { // 防止被菜单遮挡
                                type: "view",
                                props: { height: 50 }
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
                                                this.editActionMainJs(main, info)
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
                                    $(this.matrixId).data = this.actionsToData()
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