class Action {
    constructor(data, kernel) {
        this.kernel = kernel
        this.text = data.text
        this.uuid = data.uuid
        this.index = data.index
        this.fromList = 0
        this.fromClipboard = 1
        this.from = data.index === undefined ? this.fromList : this.fromClipboard
    }

    /**
     * 更新数据
     * this.updateListAction 由 clipboard.js -> getActions() 方法传入
     * @param {*} text 
     */
    updateList(text) {
        // 如果来源为剪切板则不进行更新
        if (this.from === this.fromClipboard) return false
        return this.updateListAction(this.uuid, text, this.index)
    }
}

module.exports = Action