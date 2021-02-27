const BaseView = require("../../../EasyJsBox/src/Foundation/view")

class Factory extends BaseView {
    constructor(kernel) {
        super(kernel)
        // 设置初始页面
        this.kernel.page.controller.setSelectedPage(0)
    }

    clipboard() {
        const ClipboardUI = require("./clipboard")
        let interfaceUi = new ClipboardUI(this.kernel)
        return this.kernel.page.view.creator(interfaceUi.getViews(), 0)
    }

    setting() {
        return this.kernel.page.view.creator(this.kernel.setting.getView(), 1, false)
    }

    /**
     * 渲染页面
     */
    render() {
        this.kernel.render([
            this.clipboard(),
            this.setting()
        ], [
            {
                icon: ["doc.text", "doc.text.fill"],
                title: $l10n("CLIPBOARD")
            },
            {
                icon: "gear",
                title: $l10n("SETTING")
            }
        ])()
    }
}

module.exports = Factory