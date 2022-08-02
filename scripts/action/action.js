const { Sheet } = require("../libs/easy-jsbox")

class Action {
    constructor(kernel, config, data) {
        this.kernel = kernel
        this.config = config
        Object.assign(this, data)
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
        return this.kernel.storage.all().map(item => item.text)
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
}

module.exports = Action
