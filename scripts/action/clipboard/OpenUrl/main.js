const Action = require("../../action.js")

class MyAction extends Action {
    openUrl(url) {
        $app.openURL(url)
    }

    /**
     * 系统会调用 do() 方法
     * 
     * 可用数据如下：
     * this.config 配置文件内容
     * this.text 当前复制的文本或选中的文本亦或者编辑器内的文本
     * this.uuid 该文本的 uuid
     */
    do() {
        const regex = /(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([:0-9])*([\/\w\.\-\?\=\&])*\s?/ig
        const text = this.text ?? ""
        const url = text.match(regex, text)
        if (url.length > 1) {
            $ui.menu({
                items: url,
                handler: (title, idx) => {
                    this.openUrl(url[idx])
                }
            })
        } else {
            this.openUrl(url[0])
        }
    }
}

module.exports = MyAction