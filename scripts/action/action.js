const { L10n, Sheet } = require("../libs/easy-jsbox")
const { SecureFunction } = require("./secure")

/**
 * @typedef {import("../app-main").AppKernel} AppKernel
 * @typedef {Action} Action
 * @typedef {ActionEnv} ActionEnv
 * @typedef {ActionData} ActionData
 */

class ActionEnv {
    static build = -1
    static today = 0
    static editor = 1
    static clipboard = 2
    static action = 3 // 主动作页面
    static keyboard = 4
    static recursion = 5
    static widget = 6
}
class ActionData {
    env
    args // 其他动作传递的参数
    text
    allText
    section // 首页剪切板分类
    uuid // 首页剪切板项目 uuid
    selectedRange
    selectedText
    textBeforeInput
    textAfterInput
    editor

    constructor({
        env,
        args,
        text,
        allText = null,
        section = null,
        uuid = null,
        selectedRange = null,
        selectedText = null,
        textBeforeInput = null,
        textAfterInput = null,
        editor = null
    } = {}) {
        this.env = env
        this.args = args
        this.text = text
        this.allText = allText ?? text
        this.section = section
        this.uuid = uuid
        this.selectedRange = selectedRange
        this.selectedText = selectedText
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
    secureFunction

    /**
     *
     * @param {AppKernel} kernel
     * @param {object} config
     * @param {ActionData} data
     */
    constructor(kernel, config, data) {
        this.#kernel = kernel
        this.config = config
        this.secureFunction = new SecureFunction(this.#kernel, this.config)

        if (data.env === ActionEnv.build) {
            data = this.preview()
            data.env = ActionEnv.build // 忽略 preview 返回的 env
        }
        Object.assign(this, data)

        this.originalContent = String(this.text)

        const l10n = this.l10n()
        Object.keys(l10n).forEach(language => {
            L10n.add(language, l10n[language])
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
        Sheet.quickLookImage(image)
    }

    /**
     * 获取所有剪切板数据
     * @returns {object}
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
            message: $l10n("DELETE_TABLE").replaceAll("${table}", $l10n("CLIPS")),
            actions: [{ title: $l10n("DELETE"), style: $alertActionType.destructive }, { title: $l10n("CANCEL") }]
        })
        if (res.index === 0) {
            // 确认删除
            try {
                this.#kernel.storage.deleteTable("clips")
                return true
            } catch (error) {
                this.#kernel.logger.error(error)
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
        } else if (this.env === ActionEnv.clipboard) {
            this.#kernel.storage.updateText(this.section, this.uuid, text)
            this.#kernel.clips.updateList(true)
        }
    }

    /**
     * 获取动作对象
     * @param {string} category
     * @param {string} name
     * @param {ActionData} data
     * @returns
     */
    getAction(category, name, data) {
        const dir = this.#kernel.actions.getActionDirByName(name)
        return this.#kernel.actions.getAction(category, dir, data)
    }

    async runAction(category, name) {
        const action = this.getAction(category, name, new ActionData({ env: ActionEnv.recursion }))
        return await action.do()
    }

    async request(url, method, body, header) {
        return this.secureFunction.http.request({ url, method, body, header, timeout: 3 })
    }

    getUrls() {
        const text = this.text ?? ""

        const httpRegex = /https?:\/\/[\w-]+(\.[\w-]+)*([\p{Script=Han}\w.,@?^=%&:/~+#()\-]*[\w@?^=%&/~+#()\-])?/giu
        // 正则表达式用于匹配iOS URL Scheme（假设scheme后面是://），包括中文字符和括号
        const iosSchemeRegex = /\b\w+:\/\/[\w-]+(\.[\w-]+)*([\p{Script=Han}\w.,@?^=%&:/~+#()\-]*[\w@?^=%&/~+#()\-])?/giu

        // 使用正则表达式查找匹配项
        const httpUrls = text.match(httpRegex) || []
        const iosUrls = text.match(iosSchemeRegex) || []

        // 合并两个数组并去重
        const allUrls = [...new Set([...httpUrls, ...iosUrls])]

        return allUrls
    }

    addinRun(name) {
        $addin.run(name)
    }
}

module.exports = {
    ActionEnv,
    ActionData,
    Action
}
