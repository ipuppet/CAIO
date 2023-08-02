const { SettingSwitch, SettingInput, SettingChild } = require("../../libs/easy-jsbox")

module.exports = new SettingChild({
    icon: ["cloud", "#FF9900"],
    title: "WebDAV"
}).with({
    children: [
        {
            items: [
                new SettingSwitch({
                    icon: ["cloud", "#FF9900"],
                    title: "WebDAV",
                    key: "webdav.status",
                    value: false
                })
            ]
        },
        {
            items: [
                new SettingInput({
                    icon: "link",
                    title: "HOST",
                    key: "webdav.host",
                    value: ""
                }),
                new SettingInput({
                    icon: "person",
                    title: "USER",
                    type: "input",
                    key: "webdav.user",
                    value: ""
                }),
                new SettingInput({
                    icon: "person.badge.key",
                    title: "PASSWORD",
                    type: "input",
                    key: "webdav.password",
                    value: ""
                }),
                new SettingInput({
                    icon: "link",
                    title: "BASEPATH",
                    type: "input",
                    key: "webdav.basepath",
                    value: ""
                })
            ]
        }
    ]
})
