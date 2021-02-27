const NAME = "Schedule"
const Setting = require("../setting")

class ScheduleSetting extends Setting {
    constructor(kernel) {
        super(kernel, NAME)
    }
}

module.exports = ScheduleSetting