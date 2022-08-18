class MyAction extends Action {
    do() {
        this.pageSheet({
            view: {
                type: "markdown",
                props: { content: this.text },
                layout: $layout.fill
            }
        })
    }
}
