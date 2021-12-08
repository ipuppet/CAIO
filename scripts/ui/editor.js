const {
    ViewController,
    PageController,
    NavigationItem
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

    /**
     * 
     * @param {*} text 
     * @param {*} callback 
     * @param {*} parent 
     * @param {*} title 
     * @param {Array} navButtons 可通过 Editor.text 属性访问内容，如 this.kernel.editor.text
     * @param {*} type 
     */
    push(text = "", callback, parent, title, navButtons, type = "text") {
        this.text = text
        const pageController = new PageController()
        pageController
            .setView({
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
            })
            .navigationItem
            .setTitle(title)
            .addPopButton(parent)
            .setRightButtons(this.navButtons().concat(navButtons))
            .setLargeTitleDisplayMode(NavigationItem.LargeTitleDisplayModeNever)
        this.viewController
            .setEvent("onPop", () => { callback(this.text) })
            .push(pageController)
    }
}

module.exports = Editor