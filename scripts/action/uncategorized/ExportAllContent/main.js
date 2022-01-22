const Action = require("scripts/action/action.js")

class MyAction extends Action {
    do() {
        const data = this.getAllContent().join("\n")
        if (data) $share.sheet(data)
        else $ui.alert("无数据")
    }
}

module.exports = MyAction