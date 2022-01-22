const { Sheet } = require("../easy-jsbox")

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
            view: args.view, // 视图对象
            title: args.title ?? "", // 中间标题
            done: args.done, // 点击左上角按钮后的回调函数
            doneText: args.doneText ?? $l10n("DONE") // 左上角文本
        }
     */
    pageSheet(args) {
        const sheet = new Sheet()
        sheet
            .setView(args.view)
            .addNavBar(args.title ?? "", () => {
                if (args.done) args.done()
            }, args.doneText ?? $l10n("DONE"))
            .init()
            .present()
    }

    /**
     * 获取所有剪切板数据
     * @returns Array
     */
    getAllContent() {
        return this.kernel.storage.all().map(item => item.text)
    }

    setContent(text) {
        this.text = text
        this.kernel.editor.setContent(text)
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