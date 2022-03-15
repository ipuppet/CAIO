const {
    UIKit,
    BarButtonItem
} = require("../lib/easy-jsbox")
const Clipboard = require("./clipboard")

class Mini extends Clipboard {
    constructor(kernel) {
        super(kernel)
        this.listId = "mini-clipboard-list"
        // 剪贴板列个性化设置
        this.left_right = 20 // 列表边距
        this.top_bottom = 10 // 列表边距
        this.fontSize = 14 // 字体大小
    }

    navButtons() {
        let buttons = [
            { // 手动读取剪切板
                symbol: "square.and.arrow.down.on.square",
                tapped: animate => {
                    animate.start()
                    this.readClipboard(true)
                    animate.done()
                }
            },
            {
                symbol: "bolt.circle",
                tapped: (animate, sender) => {
                    const popover = $ui.popover({
                        sourceView: sender,
                        directions: $popoverDirection.up,
                        size: $size(200, 300),
                        views: [this.kernel.actionManager.getActionListView({}, {
                            didSelect: (sender, indexPath, data) => {
                                popover.dismiss()
                                const action = this.kernel.actionManager.getActionHandler(data.info.info.type, data.info.info.dir)
                                setTimeout(() => action({
                                    text: $clipboard.text
                                }), 500)
                            }
                        })]
                    })
                }
            }
        ]
        if ($app.env === $env.keyboard) {
            // TODO keyboard buttons
        } else {
            buttons.unshift(
                {
                    symbol: "plus.circle",
                    tapped: () => {
                        $input.text({
                            placeholder: "",
                            text: "",
                            handler: text => {
                                if (text !== "") this.add(text)
                            }
                        })
                    }
                }
            )
        }
        return buttons.map(button => {
            const barButtonItem = new BarButtonItem()
            return barButtonItem
                .setAlign(UIKit.align.right)
                .setSymbol(button.symbol)
                .setEvent("tapped", button.tapped)
                .definition
        })
    }

    getViews() {
        const displayNav = this.kernel.setting.get("mini.displayNav")
        const navHeight = $app.env === $env.today ? 30 : 50
        const views = [{ // 剪切板列表
            type: "list",
            props: Object.assign({
                id: this.listId,
                menu: {
                    items: this.menuItems()
                },
                indicatorInsets: $insets(0, 0, 50, 0),
                separatorInset: $insets(0, this.left_right, 0, this.left_right),
                data: this.savedClipboard,
                template: this.listTemplate()
            }, {}),
            events: {
                ready: () => this.ready(),
                rowHeight: (sender, indexPath) => {
                    const content = sender.object(indexPath).content
                    return content.info.height + this.top_bottom * 2 + 1
                },
                didSelect: (sender, indexPath, data) => {
                    const content = data.content
                    const text = content.info.text
                    const path = this.kernel.storage.ketToPath(text)
                    if (path && $file.exists(path)) {
                        $clipboard.image = $file.read(path).image
                        $ui.toast($l10n("COPIED"))
                    } else {
                        if ($app.env === $env.today) {
                            this.copy(data.content.info.text, data.content.info.uuid, indexPath.row, false)
                        } else if ($app.env === $env.keyboard) {
                            $keyboard.insert(data.content.info.text)
                        }
                    }
                }
            },
            layout: (make, view) => {
                make.top.equalTo(displayNav ? navHeight : 0)
                make.width.bottom.equalTo(view.super)
            }
        }]
        if (displayNav) {
            const navView = { // 顶部按钮栏
                type: "view",
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
                                make.centerY.equalTo(view.super)
                                make.left.equalTo(view.super).offset(this.left_right)
                            }
                        }
                    ].concat(this.navButtons())
                }],
                layout: (make, view) => {
                    make.top.width.equalTo(view.super)
                    make.height.equalTo(navHeight)
                }
            }
            views.unshift(navView)
        }
        return views
    }

    render() {
        $ui.render({
            views: this.getViews()
        })
    }
}

module.exports = Mini