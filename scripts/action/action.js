const { Sheet } = require("../easy-jsbox")

class Action {
    constructor(kernel, config, data) {
        this.kernel = kernel
        this.config = config
        Object.assign(this, data)
    }

    /**
     * page sheet
     * @param {*} args 
     *  {
            views: args.views, // 视图数组
            title: args.title ?? "", // 中间标题
            done: args.done, // 点击左上角按钮后的回调函数
            doneText: args.doneText ?? $l10n("DONE") // 左上角文本
        }
     */
    push(args) {
        const sheet = new Sheet()
        sheet
            .setView(args.views)
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
}

module.exports = Action