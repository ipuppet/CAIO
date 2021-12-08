const { TabBarController } = require("../easy-jsbox")
const Editor = require("./editor")

class Factory {
    constructor(kernel) {
        this.kernel = kernel
        this.kernel.editor = new Editor(this.kernel)
        this.tabBarController = new TabBarController()
    }

    clipboard() {
        const Clipboard = require("./clipboard")
        const interfaceUi = new Clipboard(this.kernel)
        return interfaceUi.getPageView()
    }

    actionManager() {
        const ActionManager = require("./action-manager")
        const interfaceUi = new ActionManager(this.kernel)
        return interfaceUi.getPageView()
    }

    setting() {
        return this.kernel.setting.getPageView()
    }

    /**
     * 渲染页面
     */
    render() {
        this.tabBarController.setPages({
            clipboard: this.clipboard(),
            actionManager: this.actionManager(),
            setting: this.setting()
        }).setCells({
            clipboard: {
                icon: ["doc.on.clipboard", "doc.on.clipboard.fill"],
                title: $l10n("CLIPBOARD")
            },
            actionManager: {
                icon: "command",
                title: $l10n("ACTION")
            },
            setting: {
                icon: "gear",
                title: $l10n("SETTING")
            }
        })
        this.kernel.UIRender(this.tabBarController.generateView().definition)
    }
}

module.exports = Factory