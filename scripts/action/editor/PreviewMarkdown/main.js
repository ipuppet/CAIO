const Action = require("/scripts/action/action.js")

class MyAction extends Action {
    do() {
        this.push({
            view: {
                type: "markdown",
                props: { content: this.text },
                layout: $layout.fill
            }
        })
    }
}

module.exports = MyAction