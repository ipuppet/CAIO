class Editor {
    constructor(kernel) {
        this.kernel = kernel
        // custom
        this.lightTheme = this.kernel.setting.get("editor.lightTheme")
        this.darkTheme = this.kernel.setting.get("editor.darkTheme")
    }

    navButtons() {
        return [
            this.kernel.UIKit.navButton("add", "square.and.arrow.up", () => {
                if (this.text) $share.sheet(this.text)
                else $ui.warning($l10n("NONE"))
            }),
            this.kernel.actionButton(() => this.uuid, () => this.text, "editor")
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
                        theme: $device.isDarkMode ? this.darkTheme : this.lightTheme,
                        text: this.text
                    },
                    events: {
                        changed: sender => {
                            this.text = sender.text
                        },
                        themeChanged: (sender, isDarkMode) => {
                            // 无法动态更改主题
                            sender.theme = isDarkMode ? this.darkTheme : this.lightTheme
                        }
                    }
                }
            ],
            navButtons: this.navButtons()
        })
    }
}

module.exports = Editor