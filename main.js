let AppInstance

switch ($app.env) {
    case $env.app:
    case $env.action:
        AppInstance = require("./scripts/app-main")
        break
    case $env.today:
    case $env.keyboard:
    case $env.siri:
        AppInstance = require("./scripts/app-lite")
        break
    case $env.widget:
        AppInstance = require("./scripts/widget")
        break

    default:
        $intents.finish("不支持在此环境中运行")
        $ui.render({
            views: [
                {
                    type: "label",
                    props: {
                        text: "不支持在此环境中运行",
                        align: $align.center
                    },
                    layout: $layout.fill
                }
            ]
        })
        break
}

// AppInstance = require("./scripts/widget")
if (AppInstance) {
    AppInstance.run()
}
