class Editor {
    constructor(kernel) {
        this.kernel = kernel
    }

    navButtons() {
        return [
            this.kernel.UIKit.navButton("add", "square.and.arrow.up", () => {
                if (this.text) $share.sheet(this.text)
                else $ui.warning($l10n("NONE"))
            }),
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

    push(text = "", callback, parent) {
        this.text = text
        this.kernel.UIKit.push({
            parent: parent,
            disappeared: () => { callback(this.text) },
            views: [
                {
                    type: "code",
                    layout: $layout.fill,
                    props: {
                        id: "editor",
                        lineNumbers: this.kernel.setting.get("editor.lineNumbers"), // 放在此处动态获取设置的更改
                        theme: $device.isDarkMode ? this.kernel.setting.get("editor.darkTheme") : this.kernel.setting.get("editor.lightTheme"),
                        text: this.text
                    },
                    events: {
                        didChange: sender => {
                            this.text = sender.text
                        },
                        /* themeChanged: (sender, isDarkMode) => {
                            // TODO 无法动态更改主题
                            sender.theme = isDarkMode ? this.kernel.setting.get("editor.darkTheme") : this.kernel.setting.get("editor.lightTheme")
                        } */
                    }
                }
            ],
            navButtons: this.navButtons()
        })
    }
}

module.exports = Editor