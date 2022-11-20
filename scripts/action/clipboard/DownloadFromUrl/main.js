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
        const url = this.getUrls()
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
        $share.sheet([
            {
                name: response.response.suggestedFilename,
                data: response.data
            }
        ])
        return response
    }
}
