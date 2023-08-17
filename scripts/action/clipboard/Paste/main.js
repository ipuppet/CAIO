/**
 * @typedef {import("../../action").Action} Action
 */
class MyAction extends Action {
    l10n() {
        return {
            "zh-Hans": {
                keyboardOnly: "仅在键盘中可用"
            },
            en: {
                keyboardOnly: "Only available on keyboard"
            }
        }
    }

    do() {
        if ($app.env === $env.keyboard) {
            $keyboard.insert($clipboard.text)
        } else {
            $ui.toast($l10n("keyboardOnly"))
        }
    }
}
