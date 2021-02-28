class Editor {
    constructor(kernel) {
        this.kernel = kernel
        this.text = ""
        // custom
        this.backgroundColor = this.kernel.setting.get("editor.backgroundColor")
        this.theme = this.kernel.setting.get("editor.theme")
    }

    push(text, navButtons, callback) {
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
            navButtons: navButtons
        })
    }
}

module.exports = Editor