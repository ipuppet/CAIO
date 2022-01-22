const {
    UIKit,
    ViewController,
    Sheet
} = require("./easy-jsbox")

class Editor {
    constructor(kernel) {
        this.kernel = kernel
        this.id = "editor"
        this.viewController = new ViewController()
    }

    getActionButton() {
        return {
            symbol: "bolt.circle",
            tapped: (sender, senderMaybe) => {
                // senderMaybe 处理 Sheet addNavBar 中的按钮
                if (senderMaybe) sender = senderMaybe
                const range = $(this.id).selectedRange
                const content = {
                    text: this.text,
                    selectedRange: range,
                    selectedText: this.text.slice(range.location, range.location + range.length)
                }
                const popover = $ui.popover({
                    sourceView: sender,
                    directions: $popoverDirection.up,
                    size: $size(200, 300),
                    views: [this.kernel.actionManager.getActionListView($l10n("ACTION"), {}, {
                        didSelect: (sender, indexPath, data) => {
                            popover.dismiss()
                            const action = this.kernel.actionManager.getActionHandler(data.info.info.type, data.info.info.dir)
                            setTimeout(() => action(content), 500)
                        }
                    })]
                })
            }
        }
    }

    setContent(text) {
        this.text = text
        $(this.id).text = text
    }

    getView(type = "text") {
        return {
            type: type,
            layout: $layout.fill,
            props: {
                id: this.id,
                lineNumbers: this.kernel.setting.get("editor.lineNumbers"), // 放在此处动态获取设置的更改
                theme: this.kernel.setting.get($device.isDarkMode ? "editor.darkTheme" : "editor.lightTheme"),
                text: this.text
            },
            events: {
                ready: sender => {
                    if (this.text === "") // 自动弹出键盘
                        setTimeout(() => sender.focus(), 500)
                },
                didChange: sender => {
                    this.text = sender.text
                }
            }
        }
    }

    pageSheet(text = "", callback, title, navButtons = [], type = "text") {
        this.text = text
        navButtons.unshift(this.getActionButton())
        const sheet = new Sheet()
        sheet
            .setView(this.getView(type))
            .addNavBar(title, callback, $l10n("DONE"), navButtons)
            .init()
            .present()
    }

    /**
     * 
     * @param {*} text 
     * @param {*} callback 
     * @param {*} title 
     * @param {Array} navButtons 可通过 Editor.text 属性访问内容，如 this.kernel.editor.text
     * @param {*} type 
     */
    push(text = "", callback, title, navButtons = [], type = "text") {
        this.text = text
        navButtons.unshift(this.getActionButton())
        UIKit.push({
            title: title,
            navButtons: navButtons.map(button => {
                button.handler = button.tapped
                button.tapped = undefined
                return button
            }),
            views: [this.getView(type)],
            disappeared: () => { callback(this.text) }
        })
    }
}

module.exports = Editor