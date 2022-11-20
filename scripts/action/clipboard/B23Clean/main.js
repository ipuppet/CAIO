/**
 * @typedef {import("../../action").Action} Action
 */
class MyAction extends Action {
    l10n() {
        return {
            "zh-Hans": {
                "b23clean.converting": "正在转换...",
                "b23clean.noUrl": "未检测到链接",
                "b23clean.noBiliUrl": "未检测到 bilibili 链接",
                "b23clean.success": "已转换为 BV 视频链接"
            },
            en: {
                "b23clean.converting": "Converting...",
                "b23clean.noUrl": "No link detected",
                "b23clean.noBiliUrl": "bilibili link not detected",
                "b23clean.success": "Converted to BV video link"
            }
        }
    }

    /**
     * 系统会调用 do() 方法
     */
    async do() {
        const b23url = this.getUrls()[0]
        if (!b23url) {
            $ui.warning($l10n("b23clean.noUrl"))
            return
        }
        if (b23url.indexOf("bilibili.com") === -1 && b23url.indexOf("b23.tv") === -1) {
            $ui.warning($l10n("b23clean.noBiliUrl"))
            return
        }

        $ui.toast($l10n("b23clean.converting"))
        let url
        if (b23url.indexOf("b23.tv") >= 0) {
            const resp = await $http.get(b23url)
            url = resp.response.url
        }

        const bvUrl = url.substring(0, url.indexOf("?") - 1)
        $ui.alert({
            title: $l10n("b23clean.success"),
            message: bvUrl,
            actions: [
                { title: $l10n("OK") },
                {
                    title: $l10n("COPY"),
                    handler: () => {
                        $clipboard.text = bvUrl
                        $ui.success($l10n("COPIED"))
                    }
                }
            ]
        })
    }
}
