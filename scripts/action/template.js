const Action = require("../../action.js")

class MyAction extends Action {
    /**
     * 系统会调用 do() 方法
     * 
     * 可用数据如下：
     * this.config 配置文件内容
     * this.text 当前复制的文本或剪切板页面选中的文本亦或者编辑器内的文本
     * this.uuid 该文本的 uuid
     */
    do() {
        console.log(this.text)
    }
}

module.exports = MyAction