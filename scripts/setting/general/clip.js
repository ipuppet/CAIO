const { SettingSwitch, SettingScript, SettingNumber, SettingPush, SettingChild } = require("../../libs/easy-jsbox")

module.exports = new SettingChild({
    icon: ["doc.on.clipboard", "#FFCC66"],
    title: "CLIPS"
}).with({
    children: [
        {
            items: [
                new SettingSwitch({
                    icon: ["link", "#FF6633"],
                    title: "UNIVERSAL_CLIPBOARD",
                    key: "clipboard.universal",
                    value: true
                }),
                new SettingScript({
                    icon: ["cursorarrow.rays", "#FF6633"],
                    title: "Tips"
                }).with({
                    script: "$ui.alert({title:$l10n('UNIVERSAL_CLIPBOARD'),message:$l10n('UNIVERSAL_CLIPBOARD_TIPS')})"
                })
            ]
        },
        {
            items: [
                new SettingPush({
                    icon: ["trash", "red"],
                    title: "RECYCLE_BIN",
                    key: "clipboard.recycleBin"
                }).with({ view: "this.method.recycleBin" })
            ]
        },
        {
            items: [
                new SettingNumber({
                    icon: ["text.alignleft", "#FFCC66"],
                    title: "MAX_ITEM_LENGTH",
                    key: "clipboard.maxItemLength",
                    value: 100
                }),
                new SettingSwitch({
                    icon: ["square.and.arrow.down.on.square", "#FF6633"],
                    title: "AUTO_SAVE",
                    key: "clipboard.autoSave",
                    value: true
                })
            ]
        },
        {
            items: [
                new SettingScript({
                    icon: "square.and.arrow.up",
                    title: "EXPORT"
                }).with({ script: "this.method.exportClipboard" }),
                new SettingScript({
                    icon: ["square.and.arrow.down", "#FFCC33"],
                    title: "IMPORT"
                }).with({ script: "this.method.importClipboard" })
            ]
        },
        {
            items: [
                new SettingScript({
                    icon: ["arrow.2.circlepath", "red"],
                    title: "REBUILD_DATABASE"
                }).with({ script: "this.method.rebuildDatabase" }),
                new SettingScript({
                    icon: ["trash", "red"],
                    title: "DELETE_ALL_DATA"
                }).with({ script: "this.method.deleteAllData" })
            ]
        }
    ]
})
