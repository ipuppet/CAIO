const Action = require("../../action.js")

class MyAction extends Action {
    do() {
        const data = this.getAllContent().join("\n")
        $share.sheet(data)
    }
}

module.exports = MyAction