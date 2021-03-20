const { VERSION } = require("../EasyJsBox/src/kernel")
// Check Framework
const SHARED_PATH = "shared://EasyJsBox"
if ($file.exists(SHARED_PATH)) {
    const SHARED_VERSION = eval($file.read(`${SHARED_PATH}/src/kernel.js`)?.string)?.VERSION
    if (SHARED_VERSION !== VERSION || VERSION === undefined) {
        $file.delete("/EasyJsBox")
        $file.copy({
            src: SHARED_PATH,
            dst: "/EasyJsBox"
        })
    }
    const app = require("./scripts/app")
    app.run()
} else {
    $ui.alert({
        title: "Error",
        message: "Cannot find EasyJsBox.\nOpen EasyJsBoxInstaller?",
        actions: [
            { title: "Cancel" },
            {
                title: "Open",
                handler: () => {
                    let hasEasyJsBoxInstaller = false
                    $addin.list.forEach(script => {
                        if (script.name === "EasyJsBoxInstaller") {
                            hasEasyJsBoxInstaller = true
                            $addin.run(script.name)
                        }
                    })
                    if (!hasEasyJsBoxInstaller) {
                        $ui.alert({
                            title: "Error",
                            message: "Cannot find EasyJsBoxInstaller.",
                            actions: [
                                { title: "Cancel" },
                                {
                                    title: "Install",
                                    handler: () => {
                                        const links = {
                                            Github: "https://github.com/ipuppet/EasyJsBoxInstaller/releases/latest",
                                            Erots: "jsbox://run?name=Erots&q=show&objectId=6055b974986e9365f49e9feb",
                                        }
                                        $ui.menu({
                                            items: Object.keys(links),
                                            handler: title => {
                                                $app.openURL(links[title])
                                            }
                                        })
                                    }
                                }
                            ]
                        })
                    }
                }
            }
        ]
    })
}
