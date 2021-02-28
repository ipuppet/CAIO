const Action = require("../action.js")

class TestAction extends Action {
    /**
     * 入口函数
     */
    do() {
        console.log(this.text)
    }
}

module.exports = TestAction