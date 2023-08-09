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
    // 小组件模式下不初始化 AppKernel
    static kernel = $app.env !== $env.widget ? new AppKernel() : undefined

    static renderKeyboardUI() {
        this.kernel.addOpenInJsboxButton()

        const Keyboard = require("./ui/keyboard")
        const keyboard = new Keyboard(this.kernel)

        this.kernel.KeyboardRender(keyboard.getView())
    }

    static renderTodayUI() {
        this.kernel.addOpenInJsboxButton()

        const Today = require("./ui/today")
        const today = new Today(this.kernel)

        this.kernel.UIRender(today.getView())
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
        }
    }
}
