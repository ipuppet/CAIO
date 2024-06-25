const ListWidget = require("./list-widget.js")

class ClipsWidget extends ListWidget {
    constructor({ setting, storage } = {}) {
        super({
            setting,
            storage,
            source: "clips",
            label: $l10n("CLIPS")
        })
    }
}

module.exports = { Widget: ClipsWidget }
