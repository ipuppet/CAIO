class MyAction extends Action {
    isChinese(text) {
        const englishRegex = /[a-zA-Z]/g
        const chineseRegex = /[\u4e00-\u9fa5]/g

        const englishMatches = text.match(englishRegex) || []
        const chineseMatches = text.match(chineseRegex) || []

        const englishCount = englishMatches.length
        const chineseCount = chineseMatches.length

        return chineseCount > englishCount
    }

    async translate(text) {
        try {
            const query = {
                client: "gtx",
                dt: "t",
                sl: "auto",
                tl: this.isChinese(text) ? "en" : "zh-CN",
                q: text
            }
            const queryStr = Object.keys(query)
                .map(key => `${key}=${$text.URLEncode(query[key])}`)
                .join("&")
            const resp = await $http.post({
                url: `https://translate.google.com/translate_a/single?${queryStr}`,
                header: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                }
            })
            if (resp.response.statusCode !== 200) {
                if (resp.error) throw new Error(resp.error.localizedDescription)
                else throw new Error(resp.response.statusCode)
            }
            const data = resp.data
            return data[0][0][0]
        } catch (error) {
            this.showTextContent(error.message, $l10n("ERROR"))
        }
    }

    async do() {
        const text = this.selectedText ?? this.text
        const translated = await this.translate(text)
        if (!translated) return
        if (this.env === ActionEnv.keyboard) {
            this.replaceKeyboardText(text, translated)
        } else {
            this.showTextContent(translated)
        }
    }
}
