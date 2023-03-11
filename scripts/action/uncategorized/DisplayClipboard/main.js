/**
 * @typedef {import("../../action").Action} Action
 */

class MyAction extends Action {
    do() {
        const image = $clipboard.image
        if (image) {
            this.quickLookImage(image)
        } else {
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
}
