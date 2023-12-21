const { Setting, Sheet } = require("../../libs/easy-jsbox")
const Editor = require("../components/editor")
const { ActionEnv, ActionData } = require("../../action/action")

/**
 * @typedef {import("./actions").Actions} Actions
 */

class ActionEditor {
    editingActionInfo

    /**
     *
     * @param {Actions} data
     * @param {object} info
     */
    constructor(data, info) {
        this.data = data
        this.info = info
        this.raw = JSON.parse(JSON.stringify(info))

        this.actionCategories = this.data.getActionCategories()

        this.initEditingActionInfo()
        this.initSettingInstance()
    }

    initEditingActionInfo() {
        this.isNew = !Boolean(this.info)
        if (this.isNew) {
            this.editingActionInfo = {
                category: this.actionCategories[0],
                name: "MyAction",
                color: "#CC00CC",
                icon: "icon_062.png", // 默认星星图标
                readme: ""
            }
        } else {
            this.editingActionInfo = this.info
            this.editingActionInfo.readme = this.data.getActionReadme(this.info.category, this.info.dir)
        }
    }

    initSettingInstance() {
        this.settingInstance = new Setting({
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
    }

    informationView() {
        const nameInput = this.settingInstance
            .loader({
                setting: this.settingInstance,
                type: "input",
                key: "name",
                icon: ["pencil.circle", "#FF3366"],
                title: $l10n("NAME")
            })
            .create()
        const createColor = this.settingInstance
            .loader({
                setting: this.settingInstance,
                type: "color",
                key: "color",
                icon: ["pencil.tip.crop.circle", "#0066CC"],
                title: $l10n("COLOR")
            })
            .create()
        const iconInput = this.settingInstance
            .loader({
                setting: this.settingInstance,
                type: "icon",
                key: "icon",
                icon: ["star.circle", "#FF9933"],
                title: $l10n("ICON"),
                bgcolor: this.data.views.getColor(this.editingActionInfo.color)
            })
            .create()
        const categoryMenu = this.settingInstance
            .loader({
                setting: this.settingInstance,
                type: "menu",
                key: "category",
                icon: ["tag.circle", "#33CC33"],
                title: $l10n("CATEGORY"),
                items: this.actionCategories,
                values: this.actionCategories,
                pullDown: true
            })
            .create()

        let result = [nameInput, createColor, iconInput, categoryMenu]
        //if (this.isNew) result.push(categoryMenu)
        return result
    }

    actionInfoView() {
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
                            $("actionInfoPageSheetList").scrollToOffset($point(0, this.isNew ? 280 : 230)) // 新建有分类字段
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
            { title: $l10n("INFORMATION"), rows: this.informationView() },
            { title: $l10n("DESCRIPTION"), rows: [readme] }
        ]

        return {
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
        }
    }

    editActionInfoPageSheet(done) {
        const sheet = new Sheet()
        const sheetDone = async () => {
            if (this.isNew) {
                this.editingActionInfo.dir = this.data.initActionDirByName(this.editingActionInfo.name)
                if (this.data.exists(this.editingActionInfo.name)) {
                    const resp = await $ui.alert({
                        title: $l10n("UNABLE_CREATE_ACTION"),
                        message: $l10n("ACTION_NAME_ALREADY_EXISTS").replaceAll("${name}", this.editingActionInfo.name)
                    })
                    if (resp.index === 1) return
                }
                // reorder
                const order = this.data.getActionOrder(this.editingActionInfo.category, true)
                order.unshift(this.editingActionInfo.dir)
                this.data.saveOrder(this.editingActionInfo.category, order)
            }
            sheet.dismiss()
            this.data.saveActionInfo(this.raw, this.editingActionInfo)
            await $wait(0.3) // 等待 sheet 关闭
            if (done) done(this.editingActionInfo)
        }
        sheet
            .setView(this.actionInfoView())
            .addNavBar({
                title: "",
                popButton: { title: $l10n("CANCEL") },
                rightButtons: [{ title: $l10n("DONE"), tapped: () => sheetDone() }]
            })
            .init()
            .present()
    }

    editorNavButtons(editor) {
        return [
            {
                symbol: "book.circle",
                tapped: () => {
                    let content = $file.read("scripts/action/README.md")?.string
                    if (!content) {
                        try {
                            content = __ACTION_README__.content
                        } catch {}
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
                        .addNavBar({ title: "Document", popButton: { symbol: "x.circle" } })
                        .init()
                        .present()
                }
            },
            {
                symbol: "play.circle",
                tapped: async () => {
                    try {
                        this.data.saveMainJs(this.info, editor.text)
                        let actionRest = await this.data.getActionHandler(
                            this.info.category,
                            this.info.dir
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
                    } catch (error) {
                        this.data.kernel.logger.error(error)
                    }
                }
            }
        ]
    }

    editActionMainJs(text = "") {
        const editor = new Editor(this.data.kernel)
        editor.pageSheet(
            text,
            content => {
                this.data.saveMainJs(this.info, content)
            },
            this.info.name,
            this.editorNavButtons(editor),
            "code"
        )
    }
}

module.exports = ActionEditor
