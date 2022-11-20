/**
 * @typedef {import("../../action").Action} Action
 */

class MyAction extends Action {
    async do() {
        const res = await $ui.alert({
            title: $l10n("DELETE_DATA"),
            message: $l10n("DELETE_TABLE").replace("${table}", $l10n("CLIPS")),
            actions: [{ title: $l10n("DELETE"), style: $alertActionType.destructive }, { title: $l10n("CANCEL") }]
        })
        if (res.index === 0) {
            // 确认删除
            try {
                this.clearAllClips()
                $ui.success($l10n("DONE"))
            } catch (error) {
                $ui.error(error)
            }
        }
    }
}
