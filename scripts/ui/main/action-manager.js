class ActionManager {
    constructor(kernel) {
        this.kernel = kernel
    }

    getNavButtons() {
        return [
            this.kernel.UIKit.navButton("add", "plus.circle", () => {
            })
        ]
    }

    getViews() {
        return [
            {
                type: "label",
                props: {
                    text: "Hello World!"
                },
                layout: (make, view) => {
                    make.center.equalTo(view.super)
                }
            }
        ]
    }
}

module.exports = ActionManager