/**
 * @typedef {import("../../action").Action} Action
 * @typedef {import("../../action").ActionData} ActionData
 * @typedef {import("../../action").ActionEnv} ActionEnv
 */

class MyAction extends Action {
    preview() {
        return new ActionData({
            text: "hello word"
        })
    }

    async do() {
        try {
            if (this.env !== ActionEnv.build) {
                $ui.toast("action editor only")
                return
            }
            return this.text
        } catch (error) {
            $ui.alert(error)
        }
    }
}
