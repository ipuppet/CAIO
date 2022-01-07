const {
    UIKit,
    Sheet
} = require("../easy-jsbox")
const Editor = require("./editor")

class MainUI {
    constructor(kernel) {
        this.kernel = kernel
        this.kernel.editor = new Editor(this.kernel)
        this.initActionSheet()
    }

    initActionSheet() {
        const ActionManager = require("./action-manager")
        const interfaceUi = new ActionManager(this.kernel)
        this.actionSheet = new Sheet()
        this.actionSheet
            .setView(interfaceUi.getPageView())
            .init()
    }

    /**
     * 渲染页面
     */
    render() {
        this.kernel.useJsboxNav()
        this.kernel.setting.useJsboxNav()
        this.kernel.setTitle(this.kernel.name)
        this.kernel.setNavButtons([
            {
                symbol: "gear",
                title: $l10n("SETTING"),
                handler: () => {
                    UIKit.push({
                        title: $l10n("SETTING"),
                        views: [this.kernel.setting.getListView()]
                    })
                }
            },
            {
                symbol: "command",
                title: $l10n("ACTION"),
                handler: () => {
                    this.actionSheet.present()
                }
            }
        ])
        const Clipboard = require("./clipboard")
        const interfaceUi = new Clipboard(this.kernel)
        this.kernel.UIRender(interfaceUi.getPageView())
    }
}

module.exports = MainUI