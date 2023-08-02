const { SettingScript, SettingChild } = require("../../libs/easy-jsbox")

module.exports = new SettingChild({
    icon: ["filemenu.and.selection", "#ebcc34"],
    title: "TODAY_WIDGET"
}).with({
    children: [
        {
            items: [
                new SettingScript({
                    icon: "rectangle.3.offgrid.fill",
                    title: "PREVIEW"
                }).with({ script: "this.method.previewTodayWidget" })
            ]
        },
        {
            items: [
                new SettingScript({
                    icon: "bolt.circle",
                    title: "ACTIONS"
                }).with({ script: "this.method.setTodayWidgetActions" })
            ]
        }
    ]
})
