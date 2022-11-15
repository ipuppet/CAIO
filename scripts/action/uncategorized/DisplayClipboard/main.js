class MyAction extends Action {
    /**
     * 系统会调用 do() 方法
     */
    do() {
        this.pageSheet({
            view: {
                type: "label",
                props: {
                    text: $clipboard.text,
                    align: $align.center
                },
                layout: $layout.fill
            }
        })
    }
}
