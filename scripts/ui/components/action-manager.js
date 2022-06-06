const {
    Matrix,
    Setting,
    PageController,
    BarButtonItem,
    Sheet,
    UIKit
} = require("../../libs/easy-jsbox")

class ActionManager {
    matrixId = "actions"
    matrix
    reorder = {}

    constructor(kernel) {
        this.kernel = kernel
        // path
        this.actionPath = "scripts/action"
        this.actionOrderFile = "order.json"
        this.userActionPath = `${this.kernel.fileStorage.basePath}/user_action`
        // 用来存储被美化的 Action 分类名称
        this.typeNameMap = {}
        // checkUserAction
        this.checkUserAction()
    }

    importExampleAction() {
        $file.list(this.actionPath).forEach(type => {
            const actionTypePath = `${this.actionPath}/${type}`
            if ($file.isDirectory(actionTypePath)) {
                const userActionTypePath = `${this.userActionPath}/${type}`
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
            if ($file.isDirectory(`${this.userActionPath}/${dir}`) && type.indexOf(dir) < 0)
                return dir
        }))
    }

    getActionOrder(type) {
        const path = `${this.userActionPath}/${type}/${this.actionOrderFile}`
        if ($file.exists(path)) return JSON.parse($file.read(path).string)
        else return []
    }

    getActionHandler(type, name, basePath) {
        if (!basePath) basePath = `${this.userActionPath}/${type}/${name}`
        const config = JSON.parse($file.read(`${basePath}/config.json`).string)
        return async data => {
            // TODO 重复引用被抛弃导致无法动态重载脚本内容
            const ActionClass = require(`${basePath}/main.js`)
            const action = new ActionClass(this.kernel, config, data)
            return await action.do()
        }
    }

    getActions(type) {
        const actions = []
        const typePath = `${this.userActionPath}/${type}`
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

    titleView(title) {
        return {
            name: { hidden: true },
            icon: { hidden: true },
            color: { hidden: true },
            button: { hidden: true },
            bgcolor: { hidden: true },
            info: {
                hidden: false,
                info: {
                    title: title
                }
            }
        }
    }

    getActionListView(props = {}, events = {}) {
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
                make.top.width.equalTo(view.super.safeArea)
                make.bottom.inset(0)
            },
            events: events,
            props: Object.assign({
                reorder: false,
                bgcolor: $color("clear"),
                rowHeight: 60,
                sectionTitleHeight: 30,
                stickyHeader: true,
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

    editActionInfoPageSheet(info, done) {
        const actionTypes = this.getActionTypes()
        const actionTypesIndex = {} // 用于反查索引
        actionTypes.forEach((key, index) => {
            actionTypesIndex[key] = index
        })
        this.editingActionInfo = info ?? {
            dir: this.kernel.uuid(), // 随机生成文件夹名
            type: "clipboard",
            name: "MyAction",
            color: "#CC00CC",
            icon: "icon_062.png", // 默认星星图标
            description: "",
        }
        const SettingUI = new Setting({
            structure: {},
            set: (key, value) => {
                if (key === "type") {
                    this.editingActionInfo[key] = value[1]
                } else {
                    this.editingActionInfo[key] = value
                }
                return true
            },
            get: (key, _default = null) => {
                if (key === "type") {
                    return actionTypesIndex[this.editingActionInfo.type]
                }
                if (Object.prototype.hasOwnProperty.call(this.editingActionInfo, key))
                    return this.editingActionInfo[key]
                else
                    return _default
            }
        })
        const nameInput = SettingUI.createInput("name", ["pencil.circle", "#FF3366"], $l10n("NAME"))
        const createColor = SettingUI.createColor("color", ["pencil.tip.crop.circle", "#0066CC"], $l10n("COLOR"))
        const iconInput = SettingUI.createIcon("icon", ["star.circle", "#FF9933"], $l10n("ICON"), this.editingActionInfo.color)
        const typeMenu = SettingUI.createMenu("type", ["tag.circle", "#33CC33"], $l10n("TYPE"), actionTypes, true)
        const description = {
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
                            $("actionInfoPageSheetList").scrollToOffset($point(0, info ? 230 : 280))
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
        const data = [
            { title: $l10n("INFORMATION"), rows: [nameInput, createColor, iconInput] },
            { title: $l10n("DESCRIPTION"), rows: [description] },
        ]
        // 只有新建时才可选择类型
        if (!info) data[0].rows = data[0].rows.concat(typeMenu)
        const sheet = new Sheet()
        sheet
            .setView({
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
            })
            .addNavBar({
                title: "",
                popButton: {
                    title: "Done",
                    tapped: () => {
                        this.saveActionInfo(this.editingActionInfo)
                        // 更新 clipboard 中的 menu
                        const Clipboard = require("../clipboard");
                        Clipboard.updateMenu(this.kernel)
                        if (done) done(this.editingActionInfo)
                    }
                }
            })
            .init()
            .present()
    }

    editActionMainJs(text = "", info) {
        this.kernel.editor.pageSheet(
            text,
            content => {
                this.saveMainJs(info, content)
            },
            info.name,
            [{
                symbol: "book.circle",
                tapped: () => {
                    const content = $file.read("scripts/action/README.md").string
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
            }],
            "code"
        )
    }

    saveActionInfo(info) {
        const path = `${this.userActionPath}/${info.type}/${info.dir}`
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
            path: `${path}/config.json`
        })
    }

    saveMainJs(info, content) {
        const path = `${this.userActionPath}/${info.type}/${info.dir}`
        const mainJsPath = `${path}/main.js`
        if (!$file.exists(path)) $file.mkdir(path)
        if ($text.MD5(content) === $text.MD5($file.read(mainJsPath)?.string ?? "")) return
        $file.write({
            data: $data({ "string": content }),
            path: mainJsPath
        })
    }

    saveOrder(type, order) {
        $file.write({
            data: $data({ string: JSON.stringify(order) }),
            path: `${this.userActionPath}/${type}/${this.actionOrderFile}`
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
            const actionsView = this.matrix
            const toData = this.actionToData(Object.assign(toSection.rows[to.row], { type: type }))
            if (insertFirst) {
                actionsView.insert({
                    indexPath: $indexPath(to.section, to.row + 1), // 先插入时是插入到 to 位置的前面
                    value: toData
                }, false)
                actionsView.delete(from, false)
            } else {
                actionsView.delete(from, false)
                actionsView.insert({
                    indexPath: to,
                    value: toData
                }, false)
            }
        }
        const fromType = this.getTypeDir(fromSection.title)
        const toType = this.getTypeDir(toSection.title)
        // 判断是否跨 section
        if (from.section === to.section) {
            this.saveOrder(fromType, getOrder(from.section))
        } else { // 跨 section 则同时移动 Action 目录
            this.saveOrder(fromType, getOrder(from.section))
            this.saveOrder(toType, getOrder(to.section))
            $file.move({
                src: `${this.userActionPath}/${fromType}/${toSection.rows[to.row].dir}`,
                dst: `${this.userActionPath}/${toType}/${toSection.rows[to.row].dir}`
            })
        }
        // 跨 section 时先插入或先删除无影响，type 永远是 to 的 type
        updateUI(from.row < to.row, toType)

    }

    delete(info) {
        $file.delete(`${this.userActionPath}/${info.type}/${info.dir}`)
    }

    menuItems() { // 卡片长按菜单
        return [
            { // 编辑信息
                title: $l10n("EDIT_DETAILS"),
                symbol: "slider.horizontal.3",
                handler: (sender, indexPath) => {
                    const view = sender.cell(indexPath)
                    const oldInfo = view.get("info").info
                    this.editActionInfoPageSheet(oldInfo, info => {
                        // 更新视图信息
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
            { // 编辑脚本
                title: $l10n("EDIT_SCRIPT"),
                symbol: "square.and.pencil",
                handler: (sender, indexPath, data) => {
                    const info = data.info.info
                    if (!info) return
                    const path = `${this.userActionPath}/${info.type}/${info.dir}/main.js`
                    const main = $file.read(path).string
                    this.editActionMainJs(main, info)
                }
            },
            { // 删除
                title: $l10n("DELETE"),
                symbol: "trash",
                destructive: true,
                handler: (sender, indexPath, data) => {
                    this.kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), () => {
                        this.delete(data.info.info)
                        sender.delete(indexPath)
                    })
                }
            }
        ]
    }

    getNavButtons() {
        return [
            { // 添加
                symbol: "plus.circle",
                menu: {
                    pullDown: true,
                    asPrimary: true,
                    items: [
                        {
                            title: $l10n("CREATE_NEW_ACTION"),
                            handler: () => {
                                this.editActionInfoPageSheet(null, info => {
                                    this.matrix.insert({
                                        indexPath: $indexPath(this.getActionTypes().indexOf(info.type), 0),
                                        value: this.actionToData(info)
                                    })
                                    const MainJsTemplate = $file.read(`${this.actionPath}/template.js`).string
                                    this.saveMainJs(info, MainJsTemplate)
                                    this.editActionMainJs(MainJsTemplate, info)
                                })
                            }
                        },
                        {
                            title: $l10n("CREATE_NEW_TYPE"),
                            handler: () => {
                                $input.text({
                                    text: "",
                                    placeholder: $l10n("CREATE_NEW_TYPE"),
                                    handler: text => {
                                        text = text.trim()
                                        if (text === "") {
                                            $ui.toast($l10n("INVALID_VALUE"))
                                            return
                                        }
                                        const path = `${this.userActionPath}/${text}`
                                        if ($file.isDirectory(path)) {
                                            $ui.warning($l10n("TYPE_ALREADY_EXISTS"))
                                        } else {
                                            $file.mkdir(path)
                                            $ui.success($l10n("SUCCESS"))
                                        }
                                    }
                                })
                            }
                        }
                    ]
                }
            },
            { // 排序
                symbol: "arrow.up.arrow.down.circle",
                tapped: (animate, sender) => {
                    $ui.popover({
                        sourceView: sender,
                        directions: $popoverDirection.up,
                        size: $size(200, 300),
                        views: [
                            this.getActionListView({
                                reorder: true,
                                actions: [
                                    { // 删除
                                        title: "delete",
                                        handler: (sender, indexPath) => {
                                            const matrixView = this.matrix
                                            const info = matrixView.object(indexPath, false).info.info
                                            this.delete(info)
                                            matrixView.delete(indexPath, false)
                                        }
                                    }
                                ]
                            }, {
                                reorderBegan: indexPath => {
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
                            })
                        ]
                    })
                }
            }
        ]
    }

    actionsToData() { // 格式化数据供 matrix 使用
        const data = []
        this.getActionTypes().forEach(type => {
            const section = {
                title: this.getTypeName(type),
                items: []
            }
            this.getActions(type).forEach(action => {
                section.items.push(this.actionToData(action))
            })
            data.push(section)
        })
        return data
    }

    getMatrixView() {
        const columns = 2
        const spacing = 15
        const itemHeight = 100

        this.matrix = Matrix.create({
            type: "matrix",
            props: {
                id: this.matrixId,
                columns: columns,
                itemHeight: itemHeight,
                spacing: spacing,
                bgcolor: UIKit.scrollViewBackgroundColor,
                menu: { items: this.menuItems() },
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
                        { // button
                            type: "button",
                            props: {
                                bgcolor: $color("clear"),
                                tintColor: UIKit.textColor,
                                titleColor: UIKit.textColor,
                                contentEdgeInsets: $insets(0, 0, 0, 0),
                                titleEdgeInsets: $insets(0, 0, 0, 0),
                                imageEdgeInsets: $insets(0, 0, 0, 0)
                            },
                            views: [{
                                type: "image",
                                props: {
                                    symbol: "ellipsis.circle"
                                },
                                layout: (make, view) => {
                                    make.center.equalTo(view.super)
                                    make.size.equalTo(BarButtonItem.iconSize)
                                }
                            }],
                            events: {
                                tapped: sender => {
                                    const info = sender.next.info
                                    if (!info) return
                                    const path = `${this.userActionPath}/${info.type}/${info.dir}/main.js`
                                    const main = $file.read(path).string
                                    this.editActionMainJs(main, info)
                                }
                            },
                            layout: make => {
                                make.top.right.inset(0)
                                make.size.equalTo(BarButtonItem.size)
                            }
                        },
                        { // 用来保存信息
                            type: "view",
                            props: {
                                id: "info",
                                hidden: true
                            }
                        },
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
            layout: $layout.fill,
            events: {
                didSelect: (sender, indexPath, data) => {
                    const info = data.info.info
                    this.getActionHandler(info.type, info.dir)({
                        text: (info.type === "clipboard" || info.type === "uncategorized") ? $clipboard.text : null,
                        uuid: null
                    })
                },
                pulled: sender => {
                    $delay(0.5, () => {
                        sender.endRefreshing()
                        this.matrix.update(this.actionsToData())
                    })
                }
            }
        })

        return this.matrix.definition
    }

    getPageView() {
        const pageController = new PageController()
        pageController.navigationItem
            .setTitle($l10n("ACTIONS"))
            .setRightButtons(this.getNavButtons())
        pageController.setView(this.getMatrixView())
        return pageController.getPage()
    }

    present() {
        const actionSheet = new Sheet()
        actionSheet
            .setView(this.getMatrixView())
            .addNavBar({
                title: $l10n("ACTIONS"),
                popButton: {
                    symbol: "xmark.circle"
                },
                rightButtons: this.getNavButtons()
            })
            .init()
            .present()
    }
}

module.exports = ActionManager