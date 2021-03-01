const BaseView = require("../../Foundation/view")

class View extends BaseView {
    init() {
        this.dataCenter.set("itemIdPrefix", "menu-item-")
        this.dataCenter.set("id", "menu")
        // 从Page组件获取当前应该设置的菜单索引
        this.selected = this.kernel.getComponent("Page").dataCenter.get("selectedPage") // 当前菜单
        this.menuLayout = { // menu layout
            menuItem: (make, view) => {
                make.size.equalTo(50)
                const length = this.dataCenter.get("menus").length
                const spacing = (this.getMenuWidth() - length * 50) / (length + 1)
                if (view.prev) {
                    make.left.equalTo(view.prev.right).offset(spacing)
                } else {
                    make.left.inset(spacing)
                }
            },
            menuBar: (make, view) => {
                make.centerX.equalTo(view.super)
                make.width.equalTo(this.getMenuWidth())
                const isLargeScreen = this.isLargeScreen()
                make.top.equalTo(view.super.safeAreaBottom).offset(-50)
                make.bottom.equalTo(view.super)
                $("menu").cornerRadius = isLargeScreen ? 10 : 0
                if ($(`${this.dataCenter.get("itemIdPrefix")}canvas`))
                    $(`${this.dataCenter.get("itemIdPrefix")}canvas`).hidden = isLargeScreen
            }
        }
    }

    /**
     * 切换菜单时触发
     * @param {int} from 切换前菜单的索引
     * @param {int} to 切换后菜单的索引
     */
    change(from, to) {
        this.controller.callback(from, to)
    }

    getMenuWidth() {
        return this.isLargeScreen() ? 500 : $device.info.screen.width
    }

    /**
     * 菜单视图
     */
    menuItemTemplate() {
        const views = []
        for (let i = 0; i < this.dataCenter.get("menus").length; i++) {
            // 整理menus 格式化单个icon和多个icon的menu
            if (typeof this.dataCenter.get("menus")[i].icon !== "object") {
                this.dataCenter.get("menus")[i].icon = [this.dataCenter.get("menus")[i].icon, this.dataCenter.get("menus")[i].icon]
            } else if (this.dataCenter.get("menus")[i].icon.length === 1) {
                this.dataCenter.get("menus")[i].icon = [this.dataCenter.get("menus")[i].icon[0], this.dataCenter.get("menus")[i].icon[0]]
            }
            // menu模板
            const menu = {
                info: {
                    index: i,
                    icon: {
                        id: `${this.dataCenter.get("itemIdPrefix")}icon-${i}`,
                        icon: this.dataCenter.get("menus")[i].icon,
                        tintColor: ["lightGray", "systemLink"]
                    },
                    title: {
                        id: `${this.dataCenter.get("itemIdPrefix")}title-${i}`,
                        textColor: ["lightGray", "systemLink"]
                    }
                },
                icon: {
                    id: `${this.dataCenter.get("itemIdPrefix")}icon-${i}`,
                    image: $image(this.dataCenter.get("menus")[i].icon[0]),
                    tintColor: $color("lightGray")
                },
                title: {
                    id: `${this.dataCenter.get("itemIdPrefix")}title-${i}`,
                    text: this.dataCenter.get("menus")[i].title,
                    textColor: $color("lightGray")
                }
            }
            // 当前菜单
            if (this.selected === i) {
                menu.icon.image = $image(this.dataCenter.get("menus")[i].icon[1])
                menu.icon.tintColor = $color("systemLink")
                menu.title.textColor = $color("systemLink")
            }
            views.push({
                type: "view",
                props: {
                    info: menu.info,
                    id: `${this.dataCenter.get("itemIdPrefix")}${i}`
                },
                views: [
                    {
                        type: "image",
                        props: Object.assign({
                            bgcolor: $color("clear")
                        }, menu.icon),
                        layout: (make, view) => {
                            make.centerX.equalTo(view.super)
                            make.size.equalTo(25)
                            make.top.inset(7)
                        }
                    },
                    {
                        type: "label",
                        props: Object.assign({
                            font: $font(10)
                        }, menu.title),
                        layout: (make, view) => {
                            make.centerX.equalTo(view.prev)
                            make.bottom.inset(5)
                        }
                    }
                ],
                layout: this.menuLayout.menuItem,
                events: {
                    tapped: sender => {
                        if (this.selected === sender.info.index) return
                        // menu动画
                        $ui.animate({
                            duration: 0.4,
                            animation: () => {
                                // 点击的图标
                                const data = sender.info
                                const icon = $(data.icon.id)
                                icon.image = $image(data.icon.icon[1])
                                icon.tintColor = $color(data.icon.tintColor[1])
                                $(data.title.id).textColor = $color(data.title.textColor[1])
                            }
                        })
                        // 之前的图标
                        const data = $(`${this.dataCenter.get("itemIdPrefix")}${this.selected}`).info
                        const icon = $(data.icon.id)
                        icon.image = $image(data.icon.icon[0])
                        icon.tintColor = $color(data.icon.tintColor[0])
                        $(data.title.id).textColor = $color(data.title.textColor[0])
                        // 触发器
                        this.change(this.selected, sender.info.index)
                        // 更新selected值
                        this.selected = sender.info.index
                    }
                }
            })
        }
        return views
    }

    getView() {
        return {
            type: "view",
            layout: this.menuLayout.menuBar,
            views: [
                {
                    type: "blur",
                    props: {
                        id: this.dataCenter.get("id"),
                        style: this.blurStyle,
                        cornerRadius: this.isLargeScreen() ? 10 : 0
                    },
                    layout: $layout.fill,
                    views: this.menuItemTemplate()
                },
                {// 菜单栏上方灰色横线
                    type: "canvas",
                    props: {
                        id: `${this.dataCenter.get("itemIdPrefix")}canvas`,
                        hidden: this.isLargeScreen()
                    },
                    layout: (make, view) => {
                        make.top.equalTo(view.prev.top)
                        make.height.equalTo(1 / $device.info.screen.scale)
                        make.left.right.inset(0)
                    },
                    events: {
                        draw: (view, ctx) => {
                            const width = view.frame.width
                            const scale = $device.info.screen.scale
                            ctx.strokeColor = $color("gray")
                            ctx.setLineWidth(1 / scale)
                            ctx.moveToPoint(0, 0)
                            ctx.addLineToPoint(width, 0)
                            ctx.strokePath()
                        }
                    }
                }
            ]
        }
    }
}

module.exports = View