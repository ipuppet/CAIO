const Action = require("../../action.js")

class MyAction extends Action {
    openUrl(url) {
        $app.openURL(url)
    }
    
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