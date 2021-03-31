const Action = require("../../action.js")

class MyAction extends Action {
    /**
     * 系统会调用 do() 方法
     */
    do() {
        console.log(this.text)
        $ui.alert(this.text)
    }
}

module.exports = MyAction