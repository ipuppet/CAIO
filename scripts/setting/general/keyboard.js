const {
    SettingSwitch,
    SettingStepper,
    SettingScript,
    SettingTab,
    SettingNumber,
    SettingPush,
    SettingChild,
    SettingImage
} = require("../../libs/easy-jsbox")

module.exports = new SettingChild({
    icon: ["keyboard", "#a2a5a6"],
    title: "KEYBOARD"
}).with({
    children: [
        {
            items: [
                new SettingPush({
                    icon: "rectangle.3.offgrid.fill",
                    title: "PREVIEW",
                    key: "keyboard.previewAndHeight",
                    value: 267
                }).with({ view: "this.method.previewKeyboard" })
            ]
        },
        {
            items: [
                new SettingTab({
                    icon: ["rectangle.topthird.inset.filled", "#A569BD"],
                    title: "DISPLAY_MODE",
                    key: "keyboard.displayMode",
                    value: 0
                }).with({ items: ["list", "matrix"] }),
                new SettingSwitch({
                    icon: ["checkerboard.rectangle", "#1899c4"],
                    title: "USE_BLUR",
                    key: "keyboard.blur",
                    value: false
                }),
                new SettingImage({
                    icon: ["photo", "#FFCC66"],
                    title: "BACKGROUND_IMAGE",
                    key: "keyboard.background.image"
                })
            ]
        },
        {
            items: [
                new SettingSwitch({
                    icon: ["globe", "#1899c4"],
                    title: "SWITCH_AFTER_INSERT",
                    key: "keyboard.switchAfterInsert",
                    value: false
                }),
                new SettingSwitch({
                    icon: ["cursor.rays", "#FF8C00"],
                    title: "TAPTIC_ENGINE",
                    key: "keyboard.tapticEngine",
                    value: true
                }),
                new SettingStepper({
                    icon: ["cursor.rays", "#FF8C00"],
                    title: "TAPTIC_ENGINE_LEVEL",
                    key: "keyboard.tapticEngineLevel",
                    value: 1
                }).with({ min: 0, max: 2 }),
                new SettingScript({
                    icon: "paperplane",
                    title: "QUICK_START_SCRIPTS"
                }).with({ script: "this.method.setKeyboardQuickStart" })
            ]
        },
        {
            items: [
                new SettingNumber({
                    icon: ["rays", "#FFCC33"],
                    title: "DELETE_DELAY",
                    key: "keyboard.deleteDelay",
                    value: 0.05
                })
            ]
        }
    ]
})
