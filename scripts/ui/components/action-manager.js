const { Matrix, Setting, NavigationView, BarButtonItem, Sheet, UIKit } = require("../../libs/easy-jsbox")
const Editor = require("./editor")
const ActionManagerData = require("../../dao/action-manager-data")
const { ActionEnv, ActionData } = require("../../action/action")

/**
 * @typedef {import("../../app").AppKernel} AppKernel
 */

class ActionManager extends ActionManagerData {
    matrix
    reorder = {}
    addActionButtonId = "action-manager-button-add"
    syncLabelId = "action-manager-sync-label"

    get actionList() {
        return super.actions.map(type => {
            const rows = []
            type.items.forEach(action => {
                rows.push(this.actionToData(action))
            })

            // 返回新对象
            return {
                title: type.title,
                items: rows,
                rows: rows
            }
        })
    }

    editActionInfoPageSheet(info, done) {
        const actionTypes = this.getActionTypes()
        const actionTypesIndex = {} // 用于反查索引
        actionTypes.forEach((key, index) => {
            actionTypesIndex[key] = index
        })
        const isNew = !Boolean(info)
        if (isNew) {
            this.editingActionInfo = {
                type: "clipboard",
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
                else return _default
            }
        })
        const nameInput = SettingUI.createInput("name", ["pencil.circle", "#FF3366"], $l10n("NAME"))
        const createColor = SettingUI.createColor("color", ["pencil.tip.crop.circle", "#0066CC"], $l10n("COLOR"))
        const iconInput = SettingUI.createIcon(
            "icon",
            ["star.circle", "#FF9933"],
            $l10n("ICON"),
            this.kernel.setting.getColor(this.editingActionInfo.color)
        )
        const typeMenu = SettingUI.createMenu("type", ["tag.circle", "#33CC33"], $l10n("TYPE"), actionTypes, true)
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
                popButton: {
                    title: $l10n("DONE"),
                    tapped: () => {
                        if (!this.editingActionInfo.dir) {
                            this.editingActionInfo.dir = $text.MD5(this.editingActionInfo.name)
                        }
                        this.saveActionInfo(this.editingActionInfo)
                        if (done) done(this.editingActionInfo)
                    }
                }
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
            actionsView.insert(
                {
                    indexPath: $indexPath(to.section, from.section === to.section ? to.row + 1 : to.row),
                    value: data
                },
                false
            )
            actionsView.delete(from, false)
        } else {
            actionsView.delete(from, false)
            actionsView.insert({ indexPath: to, value: data }, false)
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
                        view.get("color").bgcolor = this.kernel.setting.getColor(info.color)
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
            {
                // 排序
                symbol: "arrow.up.arrow.down.circle",
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
                action.icon.slice(0, 5) === "icon_"
                    ? { icon: $icon(action.icon.slice(5, action.icon.indexOf(".")), $color("#ffffff")) }
                    : { image: $image(action.icon) },
            color: { bgcolor: this.kernel.setting.getColor(action.color) },
            info: { info: action } // 此处实际上是 info 模板的 props，所以需要 { info: action }
        }
    }

    getActionListView(didSelect, props = {}, events = {}) {
        if (didSelect) {
            events.didSelect = (sender, indexPath, data) => {
                const info = data.info.info
                const action = this.kernel.actionManager.getActionHandler(info.type, info.dir)
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
                    data: this.actionList,
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

    undateSyncLabel(message) {
        if (!message) {
            message = $l10n("LAST_SYNC_AT") + this.getSyncDate().toLocaleString()
        }
        if ($(this.syncLabelId)) {
            $(this.syncLabelId).text = message
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
                                text: $l10n("LAST_SYNC_AT") + this.getSyncDate().toLocaleString()
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
                pulled: sender => {
                    $delay(0.5, async () => {
                        sender.endRefreshing()
                        await this.sync()
                        this.matrix.update(this.actionList)
                        this.undateSyncLabel()
                    })
                }
            }
        })

        // 监听同步信息
        $app.listen({
            actionSyncStatus: args => {
                const button = this.navigationView?.navigationBarItems?.getButton(this.addActionButtonId) ?? {}
                if (args.status === ActionManagerData.syncStatus.syncing) {
                    button.setLoading(true)
                    this.undateSyncLabel($l10n("SYNCING"))
                } else if (args.status === ActionManagerData.syncStatus.success) {
                    try {
                        this.matrix.update(this.actionList)
                    } catch (error) {
                        this.kernel.error(error)
                        this.undateSyncLabel(error)
                        $ui.error(error)
                    } finally {
                        this.undateSyncLabel()
                        button.setLoading(false)
                    }
                }
            }
        })

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
