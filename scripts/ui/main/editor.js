class Editor {
    constructor(kernel) {
        this.kernel = kernel
        // custom
        this.backgroundColor = this.kernel.setting.get("editor.backgroundColor")
        this.theme = this.kernel.setting.get("editor.theme")
    }

    getNavButtons() {
        return [
            this.kernel.actionButton(() => this.uuid, () => this.text, "editor")
        ]
    }

    push(text = "", callback) {
        this.text = text
        this.kernel.UIKit.push({
            parent: $l10n("CLIPBOARD"),
            disappeared: () => { callback(this.text) },
            view: [
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
            navButtons: this.getNavButtons()
        })
    }
}

module.exports = Editor