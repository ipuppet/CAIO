const Clipboard = require("./clipboard")

class Mini extends Clipboard {
    constructor(kernel) {
        super(kernel)
        this.listId = "mini-clipboard-list"
        // 剪贴板列个性化设置
        this.left_right = 20 // 列表边距
        this.top_bottom = 10 // 列表边距
        this.fontSize = 14 // 字体大小
        this.copiedIndicatorSize = 7 // 已复制指示器（小绿点）大小
    }

    navButtons() {
        if (!this.largeTitle) this.largeTitle = this.kernel.UIKit.getLargeTitle()
        let buttons = [
            // 手动读取剪切板
            this.largeTitle.navButton("mini-reade", "square.and.arrow.down.on.square", () => {
                this.readClipboard(true)
            })
        ]
        if ($app.env === $env.today) {
            buttons.unshift(
                this.largeTitle.navButton("mini-add", "plus.circle", () => {
                    $input.text({
                        placeholder: "",
                        text: "",
                        handler: text => {
                            if (text !== "") this.add(text)
                        }
                    })
                })
            )
        } else if ($app.env === $env.keyboard) {
            // TODO keyboard buttons
        }
        return buttons
    }

    getViews() {
        return [
            { // 剪切板列表
                type: "list",
                props: Object.assign({
                    id: this.listId,
                    menu: {
                        title: $l10n("ACTION"),
                        items: this.menuItems()
                    },
                    indicatorInsets: $insets(0, 0, 50, 0),
                    separatorInset: $insets(0, this.left_right, 0, this.left_right),
                    data: this.savedClipboard,
                    template: {
                        props: { bgcolor: $color("clear") },
                        views: [
                            {
                                type: "view",
                                props: {
                                    id: "copied",
                                    circular: this.copiedIndicatorSize,
                                    bgcolor: $color("green")
                                },
                                layout: (make, view) => {
                                    make.centerY.equalTo(view.super)
                                    make.size.equalTo(this.copiedIndicatorSize)
                                    make.left.inset(this.left_right / 2 - this.copiedIndicatorSize / 2) // 放在前面小缝隙的中间 `this.copyedIndicatorSize / 2` 指大小的一半
                                }
                            },
                            {
                                type: "label",
                                props: {
                                    id: "content",
                                    lines: 0,
                                    font: $font(this.fontSize)
                                },
                                layout: (make, view) => {
                                    make.centerY.equalTo(view.super)
                                    make.left.right.inset(this.left_right)
                                }
                            }
                        ]
                    }
                }, !this.kernel.setting.get("mini.displayNav") ? {} : {
                    header: { // 顶部按钮栏
                        type: "view",
                        props: {
                            height: $app.env === $env.today ? 30 : 50,
                            clipsToBounds: true
                        },
                        views: [{
                            type: "view",
                            layout: $layout.fill,
                            views: [
                                {
                                    type: "label",
                                    props: {
                                        text: $l10n("CLIPBOARD"),
                                        font: $font("bold", 20)
                                    },
                                    layout: (make, view) => {
                                        make.left.equalTo(view.super).offset(this.left_right)
                                        make.centerY.equalTo(view.super).offset(-5)
                                    }
                                },
                                {
                                    type: "view",
                                    views: this.navButtons(),
                                    layout: (make, view) => {
                                        make.right.equalTo(view.super).offset(-this.left_right + 10)
                                        make.size.equalTo(view.super)
                                        make.centerY.equalTo(view.super).offset(-5)
                                    }
                                }
                            ]
                        }]
                    }
                }),
                events: {
                    ready: () => {
                        setTimeout(() => this.readClipboard(), 500)
                        $app.listen({
                            // 在应用恢复响应后调用
                            resume: () => {
                                setTimeout(() => this.readClipboard(), 500)
                            }
                        })
                    },
                    rowHeight: (sender, indexPath) => {
                        const content = sender.object(indexPath).content
                        return content.info.height + this.top_bottom * 2 + 1
                    },
                    didSelect: (sender, indexPath, data) => {
                        if ($app.env === $env.today) {
                            this.copy(data.content.info.text, data.content.info.uuid, indexPath.row, false)
                        } else if ($app.env === $env.keyboard) {
                            $keyboard.insert(data.content.info.text)
                        }
                    }
                },
                layout: $layout.fill
            }
        ]
    }

    render() {
        $ui.render({
            views: this.getViews()
        })
    }
}

module.exports = Mini