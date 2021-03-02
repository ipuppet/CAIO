class ActionManager {
    constructor(kernel) {
        this.kernel = kernel
    }

    actionsToData() {
        // 格式化数据供 matrix 使用
        const data = []
        const type = ["clipboard", "editor"] // 保证 "clipboard", "editor" 排在前面
        type.concat($file.list(this.kernel.actionPath).filter(dir => { // 获取 type.indexOf(dir) > 0 的文件夹名
            if ($file.isDirectory(this.kernel.actionPath + "/" + dir) && type.indexOf(dir) > 0)
                return dir
        })).forEach(type => {
            const section = {
                title: type, // TODO section 标题
                items: []
            }
            this.kernel.getActions(type).forEach(action => {
                section.items.push({
                    name: { text: action.name },
                    icon: { symbol: action.icon },
                    color: { bgcolor: $color(action.color) },
                    info: { info: action }
                })
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

    createInput(key, icon, title, events) {
        const id = `action-input-${key}`
        return {
            type: "view",
            views: [
                this.createLineLabel(title, icon),
                {
                    type: "view",
                    views: [{
                        type: "label",
                        props: {
                            id: `${id}-label`,
                            color: $color("secondaryText"),
                            text: this.editingActionInfo[key]
                        },
                        layout: (make, view) => {
                            make.right.inset(0)
                            make.height.equalTo(view.super)

                        }
                    }],
                    events: {
                        tapped: async () => {
                            $input.text({
                                text: this.editingActionInfo[key],
                                placeholder: title,
                                handler: text => {
                                    if (text === "") {
                                        $ui.toast($l10n("INVALID_VALUE"))
                                        return
                                    }
                                    $(`${id}-label`).text = text
                                    events(text)
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

    createColor(key, icon, title, events) {
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
                                id: `action-color-${key}`,
                                bgcolor: $color(this.controller.get(key)),
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
                                    $(`action-color-${key}`).bgcolor = newColor
                                    events(newColor.hexCode)
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

    navButtons() {
        return [
            this.kernel.UIKit.navButton("add", "plus.circle", () => {
                this.editingActionInfo = {
                    name: "",
                    color: "",
                    icon: "",
                    description: "",
                }
                const nameInput = this.createInput("name", "pencil.circle", $l10n("NAME"), text => {
                    this.editingActionInfo.name = text
                })
                const createColor = this.createInput("color", "pencil.tip.crop.circle", $l10n("COLOR"), color => {
                    this.editingActionInfo.color = color
                })
                const iconInput = this.createInput("icon", "star.sircel", $l10n("ICON"), icon => {
                    this.editingActionInfo.icon = icon
                })
                this.kernel.UIKit.pushPageSheet({
                    done: () => {
                        console.log("done")
                    },
                    views: [
                        {
                            type: "view",
                            props: {},
                            views: [
                                nameInput, createColor, iconInput
                            ],
                            layout: (make, view) => {
                                make.height.equalTo(300)
                                make.width.equalTo(view.super)
                            }
                        }
                    ]
                })
                // TODO 新建动作
                // this.edit()
            })
        ]
    }

    menuItems() {
        return [
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

    edit(info) {
        if (!info) return
        const main = $file.read(`${this.kernel.actionPath}${info.type}/${info.dir}/main.js`).string
        this.kernel.editor.push(main, content => {
            // TODO 编辑
            console.log(content)
        })
    }

    getViews() {
        return [
            {
                type: "matrix",
                props: {
                    columns: 2,
                    itemHeight: 100,
                    spacing: 20,
                    bgcolor: $color("insetGroupedBackground"),
                    menu: { items: this.menuItems() },
                    header: {
                        type: "view",
                        props: {
                            height: 90,
                            clipsToBounds: true
                        },
                        views: [{
                            type: "label",
                            props: {
                                text: $l10n("ACTION"),
                                font: $font("bold", 35)
                            },
                            layout: (make, view) => {
                                make.left.equalTo(view.super.safeArea).offset(20)
                                make.top.equalTo(view.super.safeAreaTop).offset(50)
                            }
                        }]
                    },
                    data: this.actionsToData(),
                    template: {
                        props: {
                            smoothCorners: true,
                            cornerRadius: 10,
                            bgcolor: $color("#ffffff")
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
                                    tapped: sender => this.edit(sender.next.info)
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
                layout: (make, view) => {
                    make.bottom.width.equalTo(view.super)
                    make.top.equalTo(view.super.safeArea)
                }
            },
            { // 顶部按钮栏
                type: "view",
                props: { bgcolor: $color("insetGroupedBackground") },
                views: this.navButtons(),
                layout: (make, view) => {
                    make.top.width.equalTo(view.super.safeArea)
                    make.height.equalTo(50)
                }
            }
        ]
    }
}

module.exports = ActionManager