class MyAction extends Action {
    l10n() {
        return {
            "zh-Hans": {
                "openLink.nourl": "未检测到链接"
            },
            en: {
                "openLink.nourl": "No link detected"
            }
        }
    }

    openUrl(url) {
        $app.openURL(url.trim())
    }

    do() {
        const url = this.getUrls()
        if (this.env === ActionEnv.siri) {
            // 快捷指令 Number 无法输入符号，所以使用字符串代替
            const idx = Number(this.args)
            if (idx === -1) {
                // 返回对象方便快捷指令处理
                return Object.fromEntries(url.map((v, i) => [i.toString(), v]))
            }
            this.openUrl(url[idx])
            return url[idx]
        }
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
            $ui.warning($l10n("openLink.nourl"))
        }
    }
}
