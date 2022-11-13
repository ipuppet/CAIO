const { Kernel, Sheet } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

/**
 * @typedef {Action} Action
 */
class Action {
    /**
     *
     * @param {AppKernel} kernel
     * @param {*} config
     * @param {*} data
     */
    constructor(kernel, config, data) {
        this.kernel = kernel
        this.config = config

        Object.assign(this, data)

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
    getAllClipboard() {
        return {
            clipboard: this.kernel.storage.all("clipboard").map(item => item.text),
            pin: this.kernel.storage.all("pin").map(item => item.text)
        }
    }

    getAllContent() {
        return this.getAllClipboard()
    }

    setContent(text) {
        this.text = text
        this.kernel.editor.setContent(text)
    }

    get originalContent() {
        return this.kernel.editor.originalContent
    }

    async runAction(type, name) {
        const handler = this.kernel.actionManager.getActionHandler(type, name)
        return new Promise(async (resolve, reject) => {
            if (typeof handler === "function") {
                const result = await handler()
                resolve(result)
            } else {
                reject(`No such Action: ${type}/${name}`)
            }
        })
    }

    getUrls() {
        const strRegex =
            "((https|http|ftp|rtsp|mms)?://)" +
            "?(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?" + // ftp的 user@
            "(([0-9]{1,3}.){3}[0-9]{1,3}" + // IP 形式的 URL - 199.194.52.184
            "|" + // 允许 IP 和 DOMAIN（域名）
            "([0-9a-z_!~*'()-]+.)*" + // 域名- www.
            "([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]." + // 二级域名
            "[a-z]{2,6})" + // first level domain- .com or .museum
            "(:[0-9]{1,4})?" + // 端口 - :80
            "/?[0-9a-z_!~*'().;?:@&=+$,%#-/]*" // a slash isn't required if there is no file name

        const regex = new RegExp(strRegex, "gi")
        const text = this.text ?? ""
        return text.match(regex) ?? []
    }
}

module.exports = Action
