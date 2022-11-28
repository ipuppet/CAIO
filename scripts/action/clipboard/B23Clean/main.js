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
                "b23clean.success": "已转换为 BV 视频链接",
                "b23clean.noChange": "无变化",
                "b23clean.multipleLinks": "多条链接仅在编辑模式下可用。"
            },
            en: {
                "b23clean.converting": "Converting...",
                "b23clean.noUrl": "No link detected",
                "b23clean.noBiliUrl": "bilibili link not detected",
                "b23clean.success": "Converted to BV video link",
                "b23clean.noChange": "No change",
                "b23clean.multipleLinks": "Multiple links are only available in edit mode."
            }
        }
    }

    async cleanUrl(b23url) {
        if (b23url.indexOf("bilibili.com") === -1 && b23url.indexOf("b23.tv") === -1) {
            throw new Error($l10n("b23clean.noBiliUrl"))
        }

        let url = b23url
        if (b23url.indexOf("b23.tv") >= 0) {
            const resp = await $http.get(b23url)
            url = resp.response.url
        }

        const queryStart = url.indexOf("?")
        if (queryStart > -1) {
            url = url.substring(0, queryStart - 1)
        }

        return url
    }

    /**
     * 系统会调用 do() 方法
     */
    async do() {
        $ui.toast($l10n("b23clean.converting"), 1000)

        try {
            const b23url = this.getUrls()
            if (b23url.length === 0) {
                throw new Error($l10n("b23clean.noUrl"))
            }

            if (b23url.length === 1) {
                let url = await this.cleanUrl(b23url[0])
                $ui.clearToast()
                $ui.alert({
                    title: $l10n("b23clean.success"),
                    message: url,
                    actions: [
                        { title: $l10n("OK") },
                        {
                            title: $l10n("COPY"),
                            handler: () => {
                                $clipboard.text = url
                                $ui.success($l10n("COPIED"))
                            }
                        }
                    ]
                })
            } else {
                if (this.env !== ActionEnv.editor) {
                    $ui.toast($l10n("b23clean.multipleLinks"))
                    return
                }
                let flag = false
                for (let i = 0; i < b23url.length; i++) {
                    try {
                        const url = b23url[i].trim()
                        const replacedUrl = await this.cleanUrl(url)
                        flag = true

                        if (url !== replacedUrl) {
                            const newText = this.text.replace(url, replacedUrl)
                            this.setContent(newText)
                        }
                    } catch {}
                }
                if (!flag) {
                    throw new Error($l10n("b23clean.noBiliUrl"))
                } else {
                    $ui.toast($l10n("b23clean.noChange"))
                }
            }
        } catch (error) {
            $ui.clearToast()
            $delay(0.5, () => $ui.error(error))
        }
    }
}
