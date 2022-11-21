/**
 * @typedef {import("../../action").Action} Action
 */

class MyAction extends Action {
    async do() {
        try {
            const action = await this.clearAllClips()
            if (action) {
                $ui.success($l10n("DONE"))
            }
        } catch (error) {
            $ui.error(error)
        }
    }
}
