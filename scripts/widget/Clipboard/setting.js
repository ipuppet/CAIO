const NAME = "Clipboard"
const Setting = require("../setting")

class ClipboardSetting extends Setting {
    constructor(kernel) {
        super(kernel, NAME)
    }

    initSettingMethods() {

    }
}

module.exports = { Setting: ClipboardSetting, NAME }