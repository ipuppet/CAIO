/**
 * @typedef {import("../../action").Action} Action
 */
class MyAction extends Action {
    do() {
        const text = $clipboard.text
        if (!text || text === "") return
        $keyboard.insert(text)
    }
}
