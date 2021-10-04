class Editor {
    constructor(kernel) {
        this.kernel = kernel
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
            }, "editor")
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
        this.kernel.UIKit.push({
            title: title,
            parent: parent,
            disappeared: () => { callback(this.text) },
            views: [
                {
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
            ],
            navButtons: this.navButtons().concat(navButtons)
        })
    }
}

module.exports = Editor