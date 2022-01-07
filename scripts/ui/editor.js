const {
    ViewController,
    PageController,
    NavigationItem,
    Sheet,
    UIKit
} = require("../easy-jsbox")

class Editor {
    constructor(kernel) {
        this.kernel = kernel
        this.viewController = new ViewController()
    }

    navButtons() {
        return [
            this.kernel.getActionButton({
                text: () => this.text,
                selectedRange: () => $("editor").selectedRange,
                selectedText: () => {
                    const range = $("editor").selectedRange
                    return this.text.slice(range.location, range.location + range.length)
                }
            })
        ]
    }

    getView(type = "text") {
        return {
            type: type,
            layout: $layout.fill,
            props: {
                id: "editor",
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

    pageSheet(text = "", callback, title, navButtons, type = "text") {
        this.text = text
        const sheet = new Sheet()
        sheet
            .setView(this.getView(type))
            .addNavBar(title, callback, $l10n("DONE"), this.navButtons().concat(navButtons))
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
    push(text = "", callback, title, navButtons, type = "text") {
        this.text = text
        UIKit.push({
            title: title,
            navButtons: this.navButtons().concat(navButtons).map(button => {
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