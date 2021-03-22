function requireEasyJsBox() {
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
                        requireEasyJsBoxInstaller()
                    }
                }
            }
        ]
    })
}

function requireEasyJsBoxInstaller() {
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

// Check Framework
let initEasyJsBox = require("../EasyJsBox/src/kernel").init
if (typeof initEasyJsBox !== "function") {
    const SHARED_PATH = "shared://EasyJsBox"
    initEasyJsBox = eval($file.read(`${SHARED_PATH}/src/kernel.js`)?.string)?.init
}
if (typeof initEasyJsBox !== "function") {
    requireEasyJsBox()
} else {
    // init
    initEasyJsBox()
    // run app
    const app = require("./scripts/app")
    app.run()
}