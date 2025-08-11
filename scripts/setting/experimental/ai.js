const { SettingMenu, SettingInput, SettingChild } = require("../../libs/easy-jsbox")

module.exports = new SettingChild({
    icon: ["cloud", "#d0d0d0ff"],
    title: "AI Config"
}).with({
    children: [
        {
            items: [
                new SettingMenu({
                    icon: "square.grid.2x2.fill",
                    title: "API_TYPE",
                    key: "ai.type",
                    value: "openai"
                }).with({
                    pullDown: true,
                    items: ["OpenAI", "Gemini"],
                    values: ["openai", "gemini"]
                }),
                new SettingInput({
                    icon: "link",
                    title: "ENDPOINT",
                    key: "ai.endpoint",
                    value: ""
                }).with({ emptyToNull: true }),
                new SettingInput({
                    icon: "person.badge.key",
                    title: "API_KEY",
                    type: "input",
                    key: "ai.apiKey",
                    value: ""
                }).with({ emptyToNull: true }),
                new SettingInput({
                    icon: "person",
                    title: "MODEL",
                    type: "input",
                    key: "ai.model",
                    value: ""
                }).with({ emptyToNull: true })
            ]
        }
    ]
})
