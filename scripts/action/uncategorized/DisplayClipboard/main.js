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
                    type: "text",
                    props: {
                        editable: false,
                        text: $clipboard.text,
                        insets: $insets(10, 10, 10, 10)
                    },
                    layout: $layout.fill
                }
            })
        }
    }
}
