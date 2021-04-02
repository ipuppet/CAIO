const Action = require("../../action.js")

class MyAction extends Action {
    do() {
        this.push({
            views: [{
                type: "markdown",
                props: { content: this.text },
                layout: $layout.fill
            }]
        })
    }
}

module.exports = MyAction