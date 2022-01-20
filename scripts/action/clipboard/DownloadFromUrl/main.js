const Action = require("/scripts/action/action.js")

class MyAction extends Action {
    async downloadContent(url) {
        const response = await $http.get({
            url,
            showsProgress: true
        })
        if (response.error) {
            $ui.alert(response.error.localizedDescription)
        } else {
            return response
        }
    }

    async do() {
        const regex = /(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([:0-9])*([\/\w\#\.\-\?\=\&])*\s?/ig
        const text = this.text ?? ""
        const url = text.match(regex, text) ?? []
        let response = undefined
        if (url.length > 1) {
            $ui.menu({
                items: url,
                handler: async (title, index) => {
                    response = await this.downloadContent(url[index])
                }
            })
        } else if (url.length === 1) {
            response = await this.downloadContent(url[0])
        } else {
            $ui.warning("未检测到链接")
            return
        }
        $share.sheet([{
            name: response.response.suggestedFilename,
            data: response.data
        }])
        return response
    }
}

module.exports = MyAction