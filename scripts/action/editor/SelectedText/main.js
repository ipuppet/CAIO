const Action = require("scripts/action/action.js")

class MyAction extends Action {
    do() {
        const selectedText = this.selectedText
        $ui.alert(selectedText)
    }
}

module.exports = MyAction