/**
 * @typedef {import("../../action").Action} Action
 */
class MyAction extends Action {
    #component

    get component() {
        if (!this.#component) {
            const url = String(this.text)
            const path = url.substring(url.indexOf("/", "https://".length) + 1)
            this.#component = path.split("/")
        }
        return this.#component
    }

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

    githubusercontent() {
        const user = this.component[0],
            repository = this.component[1],
            branch = this.component[2],
            file = this.component.slice(3).join("/")
        return `https://github.com/${user}/${repository}/blob/${branch}/${file}`
    }

    github() {
        const user = this.component[0],
            repository = this.component[1],
            blob = this.component[2],
            branch = this.component[3],
            file = this.component.slice(4).join("/")
        return `https://raw.githubusercontent.com/${user}/${repository}/${branch}/${file}`
    }

    do() {
        let result
        const url = String(this.text)
        if (url.includes("raw.githubusercontent.com")) {
            result = this.githubusercontent(url)
        } else if (url.includes("github.com")) {
            if (url.includes("?raw=true")) {
                result = url.replace("?raw=true", "")
            } else {
                result = this.github()
            }
        } else {
            $ui.warning($l10n("openLink.nourl"))
            return
        }

        $ui.success($l10n("COPIED"))
        $clipboard.text = result
    }
}
