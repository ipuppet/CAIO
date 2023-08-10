const { SettingSwitch, SettingInput, SettingNumber, SettingChild } = require("../../libs/easy-jsbox")

module.exports = new SettingChild({
    icon: ["pencil.circle", "#CC0099"],
    title: "EDITOR"
}).with({
    children: [
        {
            title: "CLIPS",
            items: [
                new SettingNumber({
                    icon: ["wand.and.stars", "#FF6633"],
                    title: "TEXT_INSETS",
                    key: "editor.text.insets",
                    value: 300
                })
            ]
        },
        {
            title: "CODE",
            items: [
                new SettingSwitch({
                    icon: ["list.number", "#6699CC"],
                    title: "SHOW_LINE_NUMBER",
                    key: "editor.code.lineNumbers",
                    value: false
                }),
                new SettingInput({
                    icon: ["wand.and.stars", "#FF6633"],
                    title: "LIGHT_MODE_THEME",
                    key: "editor.code.lightTheme",
                    value: "atom-one-light"
                }),
                new SettingInput({
                    icon: ["wand.and.stars", "#FF6633"],
                    title: "DARK_MODE_THEME",
                    key: "editor.code.darkTheme",
                    value: "atom-one-dark"
                })
            ]
        }
    ]
})
