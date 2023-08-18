const { SettingInfo, SettingScript, SettingTab } = require("../libs/easy-jsbox")

const generalSection = require("./general/general")
const experimentalSection = require("./experimental/experimental")

const displaySection = {
    items: [
        new SettingTab({
            icon: ["rectangle.topthird.inset.filled", "#A569BD"],
            title: "DISPLAY_MODE",
            key: "mainUIDisplayMode",
            value: 0
        }).with({ items: ["CLASSIC", "MODERN"] }),
        new SettingScript({
            icon: ["folder.fill", "#FF9900"],
            title: "FILE_MANAGEMENT"
        }).with({ script: "this.method.fileManager" })
    ]
}

const aboutSection = {
    items: [
        new SettingInfo({
            icon: ["/assets/icon/github.com.jpeg", "white"],
            title: "Github",
            value: ["ipuppet/CAIO", "https://github.com/ipuppet/CAIO"]
        }),
        new SettingInfo({
            icon: ["/assets/icon/telegram.png", "white"],
            title: "Telegram",
            value: ["JSBoxTG", "https://t.me/JSBoxTG"]
        }),
        new SettingInfo({
            icon: ["person.fill", "#FF9900"],
            title: "AUTHOR",
            value: ["ipuppet", "https://blog.ultagic.com"]
        }),
        new SettingScript({
            icon: "arrow.2.circlepath",
            title: "CHECK_UPDATE"
        }).with({ script: "this.method.checkUpdate" }),
        new SettingScript({
            icon: ["book.fill", "#A569BD"],
            title: "README"
        }).with({ script: "this.method.readme" })
    ]
}

module.exports = [generalSection, displaySection, experimentalSection, aboutSection]
