const { UIKit, SettingChild } = require("../../libs/easy-jsbox")
const webdav = require("./webdav")

const children = [{ items: [webdav] }]
if (!UIKit.isTaio) {
    const taio = require("./taio")
    children.push({ items: [taio] })
}

module.exports = {
    items: [
        new SettingChild({
            icon: "wrench.and.screwdriver",
            title: "EXPERIMENTAL"
        }).with({ children })
    ]
}
