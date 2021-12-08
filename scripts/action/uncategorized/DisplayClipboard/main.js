const Action = require("/scripts/action/action.js")

class MyAction extends Action {
    /**
     * 系统会调用 do() 方法
     */
    do() {
        this.push({
            view: {
                type: "label",
                props: {
                    text: this.text,
                    align: $align.center
                },
                layout: $layout.fill
            }
        })
    }
}

module.exports = MyAction