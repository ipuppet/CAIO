class Action {
    constructor(kernel, config, data) {
        this.kernel = kernel
        this.config = config
        Object.assign(this, data)
    }
}

module.exports = Action