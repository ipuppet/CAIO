/**
 * @typedef {import("../../action").Action} Action
 */

class MyAction extends Action {
    do() {
        this.pageSheet({
            view: {
                type: "label",
                props: {
                    lines: 0,
                    text: $clipboard.text,
                    align: $align.center
                },
                layout: $layout.fill
            }
        })
    }
}
