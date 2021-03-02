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
                    name: {
                        text: action.name
                    },
                    icon: { symbol: action.icon },
                    info: action
                })
            })
            data.push(section)
        })
        return data
    }

    navButtons() {
        return [
            this.kernel.UIKit.navButton("add", "plus.circle", () => {
                this.edit("")
            })
        ]
    }

    edit(content, info) {
        this.kernel.editor.push(content, content => {
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
                    menu: {
                        items: [
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
                                                    const info = sender.object(indexPath).info
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
                    },
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
                                    id: "icon"
                                },
                                layout: make => {
                                    make.top.left.inset(10)
                                    make.size.equalTo($size(25, 25))
                                }
                            },
                            {
                                type: "image",
                                props: {
                                    symbol: "ellipsis.circle"
                                },
                                events: {
                                    tapped: sender => console.log(sender.next.info)
                                },
                                layout: make => {
                                    make.top.right.inset(10)
                                    make.size.equalTo($size(25, 25))
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