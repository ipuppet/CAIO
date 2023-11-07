const { SettingScript } = require("../../libs/easy-jsbox")

module.exports = new SettingScript({
    icon: ["square.and.arrow.up", "#FF9900"],
    title: "ADD_TO_TAIO"
}).with({
    script: () => {
        $ui.alert({
            title: $l10n("ADD_TO_TAIO"),
            message: $l10n("SELECT_TAIO_APP")
        })
        let version = "en"
        if ($device.info.language.includes("zh")) {
            version = "zh-Hans"
        }
        $share.sheet([
            {
                name: `CAIO-${version}.json`,
                data: $file.read(`dist/CAIO-${version}.json`)
            }
        ])
    }
})
