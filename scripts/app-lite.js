const { AppKernelBase } = require("./app")

/**
 * @typedef {AppKernel} AppKernel
 */
class AppKernel extends AppKernelBase {
    constructor() {
        super()
        this.setting.setReadonly()
    }

    addOpenInJsboxButton() {
        this.useJsboxNav()
        this.setNavButtons([
            {
                image: $image("assets/icon.png"),
                handler: () => this.openInJsbox()
            }
        ])
    }
}

class AppUI {
    static kernel = new AppKernel()

    static renderKeyboardUI() {
        this.kernel.addOpenInJsboxButton()

        const Keyboard = require("./ui/keyboard")
        const keyboard = new Keyboard(this.kernel)

        this.kernel.KeyboardRenderWithViewFunc(() => keyboard.getView())
    }

    static renderTodayUI() {
        this.kernel.addOpenInJsboxButton()

        const Today = require("./ui/today")
        const today = new Today(this.kernel)

        this.kernel.UIRender(today.getView())
    }

    static shortcuts() {
        const table = $context.query["table"]?.trim() ?? ""
        if (table !== "") {
            const tabItemsMap = this.kernel.clips.tabItemsMap
            this.kernel.clips.rememberTabIndex = false // 不记住标签页
            this.kernel.clips.tabIndex = tabItemsMap[table] ?? tabItemsMap["clips"]
        }

        try {
            if ($context.query["set"] !== undefined) {
                let content = $context.query["set"]
                if (content.trim() === "") {
                    throw new Error("cannot set empty content")
                }
                this.kernel.clips.addItem(content)
                $intents.finish()
            } else if ($context.query["get"] !== undefined) {
                let getIdx = $context.query["get"] ?? 0
                if (typeof getIdx !== "number") {
                    throw new Error("`get` must be a number index")
                }
                const clip = this.kernel.clips.getByIndex(getIdx)
                $intents.finish(clip.text)
            } else {
                $intents.finish("`get` or `set` is required")
            }
        } catch (error) {
            $intents.finish(error.message)
        } finally {
            $intents.finish() // 防止卡住
        }
    }
}

module.exports = {
    run: () => {
        //AppUI.renderKeyboardUI();return
        //AppUI.renderTodayUI();return

        if ($app.env === $env.today) {
            AppUI.renderTodayUI()
        } else if ($app.env === $env.keyboard) {
            AppUI.renderKeyboardUI()
        } else if ($app.env === $env.siri) {
            AppUI.shortcuts()
        }
    }
}
