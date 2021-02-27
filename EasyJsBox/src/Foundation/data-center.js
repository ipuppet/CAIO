class DataCenter {
    constructor() {
        this.data = {}
    }
    set(key, value) {
        this.data[key] = value
    }

    get(key, _default) {
        const res = this.data[key]
        return res === undefined ? _default : res
    }
}

module.exports = DataCenter