class Editor {
    constructor(kernel) {
        this.kernel = kernel
        // custom
        this.backgroundColor = this.kernel.setting.get("editor.backgroundColor")
        this.theme = this.kernel.setting.get("editor.theme")
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
                        theme: this.theme,
                        bgcolor: $color(this.backgroundColor),
                        text: this.text
                    },
                    events: {
                        changed: sender => {
                            this.text = sender.text
                        }
                    }
                }
            ],
            navButtons: this.navButtons()
        })
    }
}

module.exports = Editor