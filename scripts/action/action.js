class Action {
    constructor(kernel, config, data) {
        this.kernel = kernel
        this.config = config
        this.text = data.text
        this.uuid = data.uuid
    }
}

module.exports = Action