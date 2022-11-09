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
