const { Matrix, Setting, NavigationView, BarButtonItem, Sheet, UIKit } = require("../../libs/easy-jsbox")
const Editor = require("./editor")
const ActionManagerData = require("../../dao/action-data")
const { ActionEnv, ActionData } = require("../../action/action")
const WebDavSync = require("../../dao/webdav-sync")

/**
 * @typedef {import("../../app").AppKernel} AppKernel
 */

class ActionManager extends ActionManagerData {
    matrix
    reorder = {}
    addActionButtonId = "action-manager-button-add"
    sortActionButtonId = "action-manager-button-sort"
    syncButtonId = "action-manager-button-sync"
    syncLabelId = "action-manager-sync-label"

    get actionList() {
        return super.actions.map(type => {
            const items = []
            type.items.forEach(action => {
                items.push(this.actionToData(action))
            })

            // 返回新对象
            return {
                title: type.title,
                items: items
            }
        })
    }

    /**
     * 监听同步信息
     */
    actionSyncStatus() {
        $app.listen({
            actionSyncStatus: args => {
                if (args.status === WebDavSync.status.syncing && args.animate) {
                    this.updateNavButton(true)
                    this.updateSyncLabel($l10n("SYNCING"))
                } else if (args.status === WebDavSync.status.success) {
                    try {
                        this.matrix.data = this.actionList
                    } catch (error) {
                        this.kernel.error(`${error}\n${error.stack}`)
                        this.updateSyncLabel(error)
                        $ui.error(error)
                    } finally {
                        this.updateSyncLabel()
                        this.updateNavButton(false)
                        $(this.matrix.id)?.endRefreshing()
                    }
                }
            }
        })
    }

    getColor(color, _default = null) {
        if (!color) return _default
        return typeof color === "string" ? $color(color) : $rgba(color.red, color.green, color.blue, color.alpha)
    }

    editActionInfoPageSheet(info, done) {
        const actionTypes = this.getActionTypes()
        const isNew = !Boolean(info)
        if (isNew) {
            this.editingActionInfo = {
                type: actionTypes[0],
                name: "MyAction",
                color: "#CC00CC",
                icon: "icon_062.png", // 默认星星图标
                readme: ""
            }
        } else {
            this.editingActionInfo = info
            this.editingActionInfo.readme = this.getActionReadme(info.type, info.dir)
        }

        const SettingUI = new Setting({
            structure: [],
            set: (key, value) => {
                this.editingActionInfo[key] = value
                return true
            },
            get: (key, _default = null) => {
                if (Object.prototype.hasOwnProperty.call(this.editingActionInfo, key))
                    return this.editingActionInfo[key]
                else return _default
            }
        })
        SettingUI.loadConfig()
        const nameInput = SettingUI.loader({
            type: "input",
            key: "name",
            icon: ["pencil.circle", "#FF3366"],
            title: $l10n("NAME")
        }).create()
        const createColor = SettingUI.loader({
            type: "color",
            key: "color",
            icon: ["pencil.tip.crop.circle", "#0066CC"],
            title: $l10n("COLOR")
        }).create()
        const iconInput = SettingUI.loader({
            type: "icon",
            key: "icon",
            icon: ["star.circle", "#FF9933"],
            title: $l10n("ICON"),
            bgcolor: this.getColor(this.editingActionInfo.color)
        }).create()
        const typeMenu = SettingUI.loader({
            type: "menu",
            key: "type",
            icon: ["tag.circle", "#33CC33"],
            title: $l10n("TYPE"),
            items: actionTypes,
            values: actionTypes,
            pullDown: true
        }).create()
        const readme = {
            type: "view",
            views: [
                {
                    type: "text",
                    props: {
                        id: "action-text",
                        textColor: $color("#000000", "secondaryText"),
                        bgcolor: $color("systemBackground"),
                        text: this.editingActionInfo.readme,
                        insets: $insets(10, 10, 10, 10)
                    },
                    layout: $layout.fill,
                    events: {
                        tapped: sender => {
                            $("actionInfoPageSheetList").scrollToOffset($point(0, isNew ? 280 : 230)) // 新建有分类字段
                            $delay(0.2, () => sender.focus())
                        },
                        didChange: sender => {
                            this.editingActionInfo.readme = sender.text
                        }
                    }
                }
            ],
            layout: $layout.fill
        }
        const data = [
            { title: $l10n("INFORMATION"), rows: [nameInput, createColor, iconInput] },
            { title: $l10n("DESCRIPTION"), rows: [readme] }
        ]
        // 只有新建时才可选择类型
        if (isNew) data[0].rows = data[0].rows.concat(typeMenu)
        const sheet = new Sheet()
        const sheetDone = async () => {
            if (isNew) {
                this.editingActionInfo.dir = $text.MD5(this.editingActionInfo.name)
                if (this.exists(this.editingActionInfo)) {
                    const resp = await $ui.alert({
                        title: $l10n("UNABLE_CREATE_ACTION"),
                        message: $l10n("ACTION_NAME_ALREADY_EXISTS").replace("${name}", this.editingActionInfo.name)
                    })
                    if (resp.index === 1) return
                }
                // reorder
                const order = this.getActionOrder(this.editingActionInfo.type, true)
                order.unshift(this.editingActionInfo.dir)
                this.saveOrder(this.editingActionInfo.type, order)
            }
            sheet.dismiss()
            this.saveActionInfo(this.editingActionInfo)
            await $wait(0.3) // 等待 sheet 关闭
            if (done) done(this.editingActionInfo)
        }
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
                    rowHeight: (sender, indexPath) => (indexPath.section === 1 ? 120 : 50)
                }
            })
            .addNavBar({
                title: "",
                popButton: { title: $l10n("CANCEL") },
                rightButtons: [
                    {
                        title: $l10n("DONE"),
                        tapped: async () => await sheetDone()
                    }
                ]
            })
            .init()
            .present()
    }

    editActionMainJs(text = "", info) {
        const editor = new Editor(this.kernel)
        editor.pageSheet(
            text,
            content => {
                this.saveMainJs(info, content)
            },
            info.name,
            [
                {
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
                },
                {
                    symbol: "play.circle",
                    tapped: async () => {
                        this.saveMainJs(info, editor.text)
                        let actionRest = await this.getActionHandler(
                            info.type,
                            info.dir
                        )(new ActionData({ env: ActionEnv.build }))
                        if (actionRest !== undefined) {
                            if (typeof actionRest === "object") {
                                actionRest = JSON.stringify(actionRest, null, 2)
                            }
                            const sheet = new Sheet()
                            sheet
                                .setView({
                                    type: "code",
                                    props: {
                                        lineNumbers: true,
                                        editable: false,
                                        text: actionRest
                                    },
                                    layout: $layout.fill
                                })
                                .addNavBar({
                                    title: "",
                                    popButton: { title: $l10n("DONE") }
                                })
                                .init()
                                .present()
                        }
                    }
                }
            ],
            "code"
        )
    }

    move(from, to) {
        if (from.section === to.section && from.row === to.row) return

        super.move(from, to)

        // 跨 section 时先插入或先删除无影响，type 永远是 to 的 type
        const actionsView = this.matrix
        // 内存数据已经为排序后的数据，故此处去 to 位置的数据
        const data = this.actionToData(this.actions[to.section].items[to.row])
        if (from.row < to.row) {
            // 先插入时是插入到 to 位置的前面 to.row + 1
            actionsView.insert({
                indexPath: $indexPath(to.section, from.section === to.section ? to.row + 1 : to.row),
                value: data
            })
            actionsView.delete(from)
        } else {
            actionsView.delete(from)
            actionsView.insert({ indexPath: to, value: data })
        }
    }

    menuItems() {
        // 卡片长按菜单
        return [
            {
                // 编辑信息
                title: $l10n("EDIT_DETAILS"),
                symbol: "slider.horizontal.3",
                handler: (sender, indexPath) => {
                    const view = sender.cell(indexPath)
                    const oldInfo = view.get("info").info
                    this.editActionInfoPageSheet(oldInfo, info => {
                        // 更新视图信息
                        view.get("info").info = info
                        view.get("color").bgcolor = this.getColor(info.color)
                        view.get("name").text = info.name
                        if (info.icon.slice(0, 5) === "icon_") {
                            view.get("icon").icon = $icon(info.icon.slice(5, info.icon.indexOf(".")), $color("#ffffff"))
                        } else {
                            view.get("icon").image = $image(info.icon)
                        }
                    })
                }
            },
            {
                // 编辑脚本
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
            {
                inline: true,
                items: [
                    {
                        // README
                        title: "README",
                        symbol: "book",
                        handler: (sender, indexPath) => {
                            const view = sender.cell(indexPath)
                            const info = view.get("info").info

                            let content

                            try {
                                content = __ACTIONS__[info.type][info.dir]["README.md"]
                            } catch {
                                content = this.getActionReadme(info.type, info.dir)
                            }
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
                    }
                ]
            },
            {
                inline: true,
                items: [
                    {
                        // 删除
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
        ]
    }

    getNavButtons() {
        return [
            {
                // 添加
                symbol: "plus.circle",
                id: this.addActionButtonId,
                menu: {
                    pullDown: true,
                    asPrimary: true,
                    items: [
                        {
                            title: $l10n("CREATE_NEW_ACTION"),
                            handler: () => {
                                this.editActionInfoPageSheet(null, async info => {
                                    this.matrix.insert({
                                        indexPath: $indexPath(this.getActionTypes().indexOf(info.type), 0),
                                        value: this.actionToData(info)
                                    })
                                    const MainJsTemplate = $file.read(`${this.actionPath}/template.js`).string
                                    this.saveMainJs(info, MainJsTemplate)
                                    await $wait(0.3)
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
            {
                // 排序
                symbol: "arrow.up.arrow.down.circle",
                id: this.sortActionButtonId,
                tapped: (animate, sender) => {
                    $ui.popover({
                        sourceView: sender,
                        directions: $popoverDirection.up,
                        size: $size(200, 300),
                        views: [
                            this.getActionListView(
                                undefined,
                                {
                                    reorder: true,
                                    actions: [
                                        {
                                            // 删除
                                            title: "delete",
                                            handler: (sender, indexPath) => {
                                                const matrixView = this.matrix
                                                const info = matrixView.object(indexPath, false).info.info
                                                this.delete(info)
                                                matrixView.delete(indexPath, false)
                                            }
                                        }
                                    ]
                                },
                                {
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
                                }
                            )
                        ]
                    })
                }
            }
        ]
    }

    actionToData(action) {
        return {
            name: { text: action.name },
            icon:
                action?.icon?.slice(0, 5) === "icon_"
                    ? { icon: $icon(action.icon.slice(5, action.icon.indexOf(".")), $color("#ffffff")) }
                    : { image: $image(action?.icon) },
            color: { bgcolor: this.getColor(action.color) },
            info: { info: action } // 此处实际上是 info 模板的 props，所以需要 { info: action }
        }
    }

    updateSyncLabel(message) {
        if (!message) {
            message = $l10n("MODIFIED") + this.getSyncDate().toLocaleString()
        }
        if ($(this.syncLabelId)) {
            $(this.syncLabelId).text = message
        }
    }

    updateNavButton(loading) {
        const addActionButton = this.navigationView?.navigationBarItems?.getButton(this.addActionButtonId)
        if (addActionButton) {
            addActionButton.setLoading(loading)
        }
        const sortActionButton = this.navigationView?.navigationBarItems?.getButton(this.sortActionButtonId)
        if (sortActionButton) {
            sortActionButton.setLoading(loading)
        }
        const syncButton = this.navigationView?.navigationBarItems?.getButton(this.syncButtonId)
        if (syncButton) {
            syncButton.setLoading(loading)
        }
    }

    getActionListView(didSelect, props = {}, events = {}) {
        if (didSelect) {
            events.didSelect = (sender, indexPath, data) => {
                const info = data.info.info
                const action = this.getActionHandler(info.type, info.dir)
                didSelect(action)
            }
        }

        return {
            type: "list",
            layout: (make, view) => {
                make.top.width.equalTo(view.super.safeArea)
                make.bottom.inset(0)
            },
            events: events,
            props: Object.assign(
                {
                    reorder: false,
                    bgcolor: $color("clear"),
                    rowHeight: 60,
                    sectionTitleHeight: 30,
                    stickyHeader: true,
                    data: (() => {
                        const data = this.actionList
                        data.map(type => {
                            type.rows = type.items
                            return type
                        })
                        return data
                    })(),
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
                                    tintColor: $color("#ffffff")
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
                },
                props
            )
        }
    }

    getActionMiniView(getActionData, actions) {
        if (!actions) {
            actions = []
            super.actions.forEach(dir => {
                actions = actions.concat(dir.items)
            })
        }

        const matrixItemHeight = 50
        return {
            type: "matrix",
            props: {
                bgcolor: $color("clear"),
                columns: 2,
                itemHeight: matrixItemHeight,
                spacing: 8,
                data: [],
                template: {
                    props: {
                        smoothCorners: true,
                        cornerRadius: 10,
                        bgcolor: $color($rgba(255, 255, 255, 0.3), $rgba(0, 0, 0, 0.3))
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
                                const size = matrixItemHeight - 20
                                make.top.left.inset((matrixItemHeight - size) / 2)
                                make.size.equalTo($size(size, size))
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: "icon",
                                tintColor: $color("#ffffff")
                            },
                            layout: (make, view) => {
                                make.edges.equalTo(view.prev).insets(5)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "name",
                                font: $font(14)
                            },
                            layout: (make, view) => {
                                make.bottom.top.inset(10)
                                make.left.equalTo(view.prev.prev.right).offset(10)
                                make.right.inset(10)
                            }
                        },
                        {
                            // 用来保存信息
                            type: "view",
                            props: {
                                id: "info",
                                hidden: true
                            }
                        }
                    ]
                }
            },
            layout: $layout.fill,
            events: {
                ready: sender => {
                    sender.data = actions.map(action => {
                        return this.actionToData(action)
                    })
                },
                didSelect: async (sender, indexPath, data) => {
                    const info = data.info.info
                    const actionData = await getActionData(info)
                    this.getActionHandler(info.type, info.dir)(actionData)
                }
            }
        }
    }

    getMatrixView({ columns = 2, spacing = 15, itemHeight = 100 } = {}) {
        this.matrix = Matrix.create({
            type: "matrix",
            props: {
                columns: columns,
                itemHeight: itemHeight,
                spacing: spacing,
                bgcolor: UIKit.scrollViewBackgroundColor,
                menu: { items: this.menuItems() },
                data: this.actionList,
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
                                tintColor: $color("#ffffff")
                            },
                            layout: make => {
                                make.top.left.inset(15)
                                make.size.equalTo($size(20, 20))
                            }
                        },
                        {
                            // button
                            type: "button",
                            props: {
                                bgcolor: $color("clear"),
                                tintColor: UIKit.textColor,
                                titleColor: UIKit.textColor,
                                contentEdgeInsets: $insets(0, 0, 0, 0),
                                titleEdgeInsets: $insets(0, 0, 0, 0),
                                imageEdgeInsets: $insets(0, 0, 0, 0)
                            },
                            views: [
                                {
                                    type: "image",
                                    props: { symbol: "ellipsis.circle" },
                                    layout: (make, view) => {
                                        make.center.equalTo(view.super)
                                        make.size.equalTo(BarButtonItem.style.iconSize)
                                    }
                                }
                            ],
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
                                make.size.equalTo(BarButtonItem.style.width)
                            }
                        },
                        {
                            // 用来保存信息
                            type: "view",
                            props: { id: "info", hidden: true }
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
                },
                footer: {
                    type: "view",
                    props: {
                        hidden: !this.kernel.setting.get("experimental.syncAction"),
                        height: this.kernel.setting.get("experimental.syncAction") ? 50 : 0
                    },
                    views: [
                        {
                            type: "label",
                            props: {
                                id: this.syncLabelId,
                                color: $color("secondaryText"),
                                font: $font(12),
                                text: $l10n("MODIFIED") + this.getSyncDate().toLocaleString()
                            },
                            layout: (make, view) => {
                                make.size.equalTo(view.super)
                                make.top.inset(-30)
                                make.left.inset(spacing)
                            }
                        }
                    ]
                }
            },
            layout: $layout.fill,
            events: {
                didSelect: (sender, indexPath, data) => {
                    const info = data.info.info
                    const actionData = new ActionData({
                        env: ActionEnv.action,
                        text: info.type === "clipboard" || info.type === "uncategorized" ? $clipboard.text : null
                    })
                    this.getActionHandler(info.type, info.dir)(actionData)
                },
                pulled: async sender => {
                    if (this.isEnableWebDavSync) {
                        this.syncWithWebDav()
                    } else {
                        this.updateNavButton(true)
                        await this.sync()
                        this.matrix.data = this.actionList
                        this.updateSyncLabel()
                        this.updateNavButton(false)
                        sender.endRefreshing()
                    }
                }
            }
        })

        this.actionSyncStatus()

        return this.matrix.definition
    }

    getPage() {
        this.navigationView = new NavigationView()
        this.navigationView.navigationBarItems.setRightButtons(this.getNavButtons())
        this.navigationView.setView(this.getMatrixView()).navigationBarTitle($l10n("ACTIONS"))
        return this.navigationView.getPage()
    }

    present() {
        const actionSheet = new Sheet()
        const rightButtons = this.getNavButtons()
        if (this.kernel.setting.get("experimental.syncAction")) {
            rightButtons.push({
                // 同步
                id: this.syncButtonId,
                symbol: "arrow.triangle.2.circlepath.circle",
                tapped: async (animate, sender) => {
                    if (this.isEnableWebDavSync) {
                        this.syncWithWebDav()
                    } else {
                        this.updateNavButton(true)
                        await this.sync()
                        this.matrix.data = this.actionList
                        this.updateSyncLabel()
                        this.updateNavButton(false)
                    }
                }
            })
        }
        actionSheet
            .setView(this.getMatrixView())
            .addNavBar({
                title: $l10n("ACTIONS"),
                popButton: { symbol: "xmark.circle" },
                rightButtons: rightButtons
            })
            .init()

        this.navigationView = actionSheet.navigationView
        actionSheet.present()
    }
}

module.exports = ActionManager
