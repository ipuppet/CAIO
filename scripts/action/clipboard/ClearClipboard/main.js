const Action = require("../../action.js")

class MyAction extends Action {
    /**
     * 系统会调用 do() 方法
     */
    do() {
        $clipboard.clear()
        $ui.success("Success!")
    }
}

module.exports = MyAction