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
            navButtons: args.navButtons ?? [], // 右上角的按钮
            topOffset = args.topOffset ?? true, // 视图是否占满整个page sheet。
                                                // 若不占满标题栏有模糊效果，但会覆盖一部分视图，需手动调整。
            done: args.done, // 点击左上角按钮后的回调函数
            doneText: args.doneText ?? $l10n("DONE") // 左上角文本
        }
     */
    push(args) {
        this.kernel.UIKit.pushPageSheet(args)
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