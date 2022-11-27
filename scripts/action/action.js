const { Kernel, Sheet } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 * @typedef {Action} Action
 */

class ActionEnv {
    static keyboard = 0
    static today = 0
    static editor = 1
    static clipboard = 2
    static action = 3
}
class ActionData {
    env
    text
    originalContent
    uuid // 首页剪切板项目 uuid
    selectedRange
    textBeforeInput
    textAfterInput

    constructor({ env, text, uuid = null, selectedRange = null, textBeforeInput = null, textAfterInput = null } = {}) {
        this.env = env
        this.text = text
        this.originalContent = text
        this.uuid = uuid
        this.selectedRange = selectedRange
        this.textBeforeInput = textBeforeInput
        this.textAfterInput = textAfterInput
    }
}

class Action {
    /**
     * @type {AppKernel}
     */
    #kernel

    /**
     *
     * @param {AppKernel} kernel
     * @param {object} config
     * @param {ActionData} data
     */
    constructor(kernel, config, data) {
        this.#kernel = kernel
        this.config = config

        Object.assign(this, data)

        this.originalContent = this.text

        const l10n = this.l10n()
        Object.keys(l10n).forEach(language => {
            Kernel.l10n(language, l10n[language])
        })
    }

    l10n() {
        return {}
    }

    push(args) {
        this.pageSheet(args)
    }

    /**
     * page sheet
     * @param {*} args 
     *  {
            view: 视图对象
            title: 中间标题
            done: 点击左上角按钮后的回调函数
            doneText: 左上角文本
        }
     */
    pageSheet({ view, title = "", done, doneText = $l10n("DONE") }) {
        const sheet = new Sheet()
        sheet
            .setView(view)
            .addNavBar({
                title: title,
                popButton: {
                    title: doneText,
                    tapped: () => {
                        if (done) done()
                    }
                }
            })
            .init()
            .present()
    }

    /**
     * 获取所有剪切板数据
     * @returns Array
     */
    getAllClips() {
        return {
            clips: this.#kernel.storage.all("clipboard").map(item => item.text),
            pin: this.#kernel.storage.all("pin").map(item => item.text)
        }
    }

    async clearAllClips() {
        const res = await $ui.alert({
            title: $l10n("DELETE_DATA"),
            message: $l10n("DELETE_TABLE").replace("${table}", $l10n("CLIPS")),
            actions: [{ title: $l10n("DELETE"), style: $alertActionType.destructive }, { title: $l10n("CANCEL") }]
        })
        if (res.index === 0) {
            // 确认删除
            try {
                this.#kernel.storage.deleteTable("clipboard")
                return true
            } catch (error) {
                this.#kernel.error(error)
                throw error
            }
        } else {
            return false
        }
    }

    setContent(text) {
        this.text = text
        this.#kernel.editor.setContent(text)
    }

    getAction(type, dir, data) {
        return this.#kernel.actionManager.getAction(type, dir, data)
    }

    async runAction(type, name) {
        const action = this.getAction(type, name)
        return await action.do()
    }

    async request(url, method, body = {}, header = {}) {
        try {
            this.#kernel.print(`sending request [${method}]: ${url}`)
            const resp = await $http.request({
                header,
                url,
                method,
                body,
                timeout: 5
            })

            if (resp.error) {
                throw resp.error
            } else if (resp?.response?.statusCode >= 400) {
                let errMsg = resp.data
                if (typeof errMsg === "object") {
                    errMsg = JSON.stringify(errMsg)
                }
                throw new Error("http error: [" + resp.response.statusCode + "] " + errMsg)
            }

            return resp
        } catch (error) {
            if (error.code) {
                error = new Error("network error: [" + error.code + "] " + error.localizedDescription)
            }
            throw error
        }
    }

    getUrls() {
        const regex = /(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([:0-9])*([\/\w\#\.\-\?\=\&])*\s?/gi
        const text = this.text ?? ""
        return text.match(regex) ?? []
    }
}

module.exports = {
    ActionEnv,
    ActionData,
    Action
}
