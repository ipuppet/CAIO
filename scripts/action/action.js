class Action {
    constructor(kernel, config, data) {
        this.kernel = kernel
        this.config = config
        this.text = data.text
        this.selectedRange = data.selectedRange
    }
}

module.exports = Action