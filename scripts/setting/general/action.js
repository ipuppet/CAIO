const { SettingScript, SettingChild } = require("../../libs/easy-jsbox")

module.exports = new SettingChild({
    icon: ["bolt.circle", "#FF6633"],
    title: "ACTIONS"
}).with({
    children: [
        {
            items: [
                new SettingScript({
                    icon: ["bolt.circle", "#FF6633"],
                    title: "IMPORT_EXAMPLE_ACTIONS",
                    value: "this.method.importExampleAction"
                }).with({
                    script: "this.method.importExampleAction"
                })
            ]
        },
        {
            items: [
                new SettingScript({
                    icon: "square.and.arrow.up",
                    title: "EXPORT"
                }).with({
                    script: "this.method.exportAction"
                }),
                new SettingScript({
                    icon: ["square.and.arrow.down", "#FFCC33"],
                    title: "IMPORT"
                }).with({
                    script: "this.method.importAction"
                })
            ]
        },
        {
            items: [
                new SettingScript({
                    icon: ["arrow.2.circlepath", "red"],
                    title: "REBUILD_ACTION_DATABASE"
                }).with({
                    script: "this.method.rebuildAction"
                })
            ]
        }
    ]
})
