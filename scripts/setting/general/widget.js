const { SettingScript, SettingMenu, SettingChild } = require("../../libs/easy-jsbox")

module.exports = new SettingChild({
    icon: ["rectangle.3.offgrid.fill", "#1899c4"],
    title: "WIDGET"
}).with({
    children: [
        {
            items: [
                new SettingScript({
                    icon: "rectangle.3.offgrid.fill",
                    title: "PREVIEW"
                }).with({ script: "this.method.previewWidget" })
            ]
        },
        {
            title: "2x2",
            items: [
                new SettingMenu({
                    icon: "link",
                    title: "CLICK_ACTION",
                    key: "widget.2x2.widgetURL",
                    value: 2
                }).with({ pullDown: true, items: ["ADD", "ACTIONS", "CLIPS"] })
            ]
        }
    ]
})
