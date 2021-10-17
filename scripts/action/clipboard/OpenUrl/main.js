const Action = require("/scripts/action/action.js")

class MyAction extends Action {
    openUrl(url) {
        $app.openURL(url)
    }

    do() {
        const regex = /(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([:0-9])*([\/\w\#\.\-\?\=\&])*\s?/ig
        const text = this.text ?? ""
        const url = text.match(regex, text) ?? []
        if (url.length > 1) {
            $ui.menu({
                items: url,
                handler: (title, index) => {
                    this.openUrl(url[index])
                }
            })
        } else if (url.length === 1) {
            this.openUrl(url[0])
        } else {
            $ui.warning("未检测到链接")
        }
    }
}

module.exports = MyAction