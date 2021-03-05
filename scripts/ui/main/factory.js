const BaseView = require("../../../EasyJsBox/src/Foundation/view")
const Editor = require("./editor")

class Factory extends BaseView {
    constructor(kernel) {
        super(kernel)
        // 设置初始页面
        this.kernel.page.controller.setSelectedPage(1)
        this.kernel.editor = new Editor(this.kernel)
    }

    clipboard() {
        const Clipboard = require("./clipboard")
        const interfaceUi = new Clipboard(this.kernel)
        return this.kernel.page.view.creator(interfaceUi.getViews(), 0)
    }

    // TODO files
    /* files() {
        const Files = require("./files")
        const interfaceUi = new Files(this.kernel)
        return this.kernel.page.view.creator(interfaceUi.getViews(), 0)
    } */

    actionManager() {
        const ActionManager = require("./action-manager")
        const interfaceUi = new ActionManager(this.kernel)
        return this.kernel.page.view.creator(interfaceUi.getViews(), 1, false) // 水平安全距离手动设置，因为需要设置背景色
    }

    setting() {
        return this.kernel.page.view.creator(this.kernel.setting.getView(), 2, false)
    }

    /**
     * 渲染页面
     */
    render() {
        this.kernel.render([
            this.clipboard(),
            this.actionManager(),
            this.setting()
        ], [
            {
                icon: ["doc.on.clipboard", "doc.on.clipboard.fill"],
                title: $l10n("CLIPBOARD")
            },
            {
                icon: ["command"],
                title: $l10n("ACTION")
            },
            {
                icon: "gear",
                title: $l10n("SETTING")
            }
        ])()
    }
}

module.exports = Factory