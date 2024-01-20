const { Sheet } = require("../../libs/easy-jsbox")
const { SelectActions } = require("./selectActions")

/**
 * @typedef {import("../../app-main").AppKernel} AppKernel
 */

class TodayPinActions extends SelectActions {
    static shared = new TodayPinActions()
    cacheKey = "today.actions"

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)
        this.listId = "today-action-list"
    }

    sheet() {
        const sheet = new Sheet()
        sheet.setView(this.getListView()).addNavBar({
            title: $l10n("ACTIONS"),
            popButton: { title: $l10n("CLOSE") },
            rightButtons: this.getNavButtons()
        })

        sheet.init().present()
    }
}

module.exports = { TodayPinActions }
