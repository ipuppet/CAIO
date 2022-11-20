/**
 * @typedef {import("../../action").Action} Action
 */
class MyAction extends Action {
    l10n() {
        return {
            "zh-Hans": {
                "clipboard.clean.success": "剪切板已清空"
            },
            en: {
                "clipboard.clean.success": "Clipboard is cleaned"
            }
        }
    }

    /**
     * 系统会调用 do() 方法
     */
    do() {
        $clipboard.clear()
        $ui.success($l10n("clipboard.clean.success"))
    }
}
