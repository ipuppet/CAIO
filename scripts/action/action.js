const { Kernel, Sheet } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 * @typedef {Action} Action
 * @typedef {ActionEnv} ActionEnv
 * @typedef {ActionData} ActionData
 */

class ActionEnv {
    static build = -1
    static today = 0
    static editor = 1
    static clipboard = 2
    static action = 3
    static keyboard = 4
}
class ActionData {
    env
    args // 其他动作传递的参数
    text
    originalContent
    uuid // 首页剪切板项目 uuid
    selectedRange
    textBeforeInput
    textAfterInput
    editor

    constructor({
        env,
        args,
        text,
        uuid = null,
        selectedRange = null,
        textBeforeInput = null,
        textAfterInput = null,
        editor = null
    } = {}) {
        this.env = env
        this.args = args
        this.text = text
        this.originalContent = text
        this.uuid = uuid
        this.selectedRange = selectedRange
        this.textBeforeInput = textBeforeInput
        this.textAfterInput = textAfterInput
        this.editor = editor
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

        if (data.env === ActionEnv.build) {
            data = this.preview()
            data.env = ActionEnv.build // 忽略 preview 返回的 env
        }
        Object.assign(this, data)

        this.originalContent = this.text

        const l10n = this.l10n()
        Object.keys(l10n).forEach(language => {
            Kernel.l10n(language, l10n[language])
        })
    }

    /**
     * 编辑动作状态下提供预览数据
     * @returns {ActionData}
     */
    preview() {
        return new ActionData({ env: ActionEnv.build })
    }

    l10n() {
        return {}
    }

    /**
     * page sheet
     * @param {*} args 
     *  {
            view: 视图对象
            title: 中间标题
            done: 点击左上角按钮后的回调函数
            doneText: 左上角文本
            rightButtons: 右上角按钮
        }
     */
    pageSheet({ view, title = "", done, doneText = $l10n("DONE"), rightButtons = [] }) {
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
                },
                rightButtons
            })
            .init()
            .present()
    }

    quickLookImage(image) {
        this.#kernel.quickLookImage(image)
    }

    /**
     * 获取所有剪切板数据
     * @returns Array
     */
    getAllClips() {
        return {
            favorite: this.#kernel.storage.all("favorite").map(item => item.text),
            clips: this.#kernel.storage.all("clips").map(item => item.text)
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
                this.#kernel.storage.deleteTable("clips")
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
        if (this.env === ActionEnv.editor) {
            this.editor.setContent(text)
        }
    }

    /**
     *
     * @param {string} type
     * @param {string} dir
     * @param {ActionData} data
     * @returns
     */
    getAction(type, dir, data) {
        return this.#kernel.actionManager.getAction(type, dir, data)
    }

    async runAction(type, dir) {
        const action = this.getAction(type, dir)
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
