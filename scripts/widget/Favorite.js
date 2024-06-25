const ListWidget = require("./list-widget.js")

class FavoritesWidget extends ListWidget {
    constructor({ setting, storage } = {}) {
        super({
            setting,
            storage,
            source: "favorite",
            label: $l10n("FAVORITE")
        })
    }
}

module.exports = { Widget: FavoritesWidget }
