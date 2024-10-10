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

class Shortcuts {
    /** @type {AppKernel} */
    kernel

    constructor(kernel) {
        this.kernel = kernel

        $ui.render()
        if (!this.kernel.runActionFlag) {
            this.checkQuery()
        }
    }

    setClips(content) {
        if (content.trim() === "") {
            throw new Error("cannot set empty content")
        }
        this.kernel.clips.addItem(content)
    }
    getClips(getIdx) {
        if (typeof getIdx !== "number") {
            throw new Error("`get` must be a number index")
        }
        const clip = this.kernel.clips.getByIndex(getIdx)
        return clip.text
    }
    deleteClips(deleteIdx) {
        if (typeof deleteIdx !== "number") {
            throw new Error("`delete` must be a number index")
        }
        const clip = this.kernel.clips.getByIndex(deleteIdx)
        const text = clip.text
        this.kernel.clips.delete(clip.uuid)
        return text
    }

    checkQuery() {
        const table = $context.query["table"]?.trim() ?? ""
        if (table !== "") {
            this.kernel.clips.rememberTabIndex = false // 不记住标签页
            const tabItemsMap = this.kernel.clips.tabItemsMap
            this.kernel.clips.tabIndex = tabItemsMap[table] ?? tabItemsMap["clips"]
        }

        try {
            if ($context.query["set"] !== undefined) {
                this.setClips($context.query["set"])
                $intents.finish()
            } else if ($context.query["get"] !== undefined) {
                this.getClips($context.query["get"])
                $intents.finish(clip.text)
            } else if ($context.query["delete"] !== undefined) {
                this.deleteClips($context.query["delete"])
                $intents.finish(text)
            } else {
                $intents.finish("`get`, `set` or `delete` is required")
            }
        } catch (error) {
            $intents.finish(error.message)
        } finally {
            $intents.finish() // 防止卡住
        }
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
        new Shortcuts(this.kernel)
    }
}

module.exports = {
    run: () => {
        //AppUI.renderKeyboardUI();return
        //AppUI.renderTodayUI();return

        if ($app.env === $env.today || $app.env === $env.notification) {
            AppUI.renderTodayUI()
        } else if ($app.env === $env.keyboard) {
            AppUI.renderKeyboardUI()
        } else if ($app.env === $env.siri) {
            AppUI.shortcuts()
        }
    }
}
