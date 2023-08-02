const { SettingChild } = require("../../libs/easy-jsbox")
const webdav = require("./webdav")

module.exports = new SettingChild({
    icon: "wrench.and.screwdriver",
    title: "EXPERIMENTAL"
}).with({
    children: [
        {
            items: [webdav]
        }
    ]
})
