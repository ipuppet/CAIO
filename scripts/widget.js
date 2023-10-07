const { Logger, Setting, FileStorage } = require("./libs/easy-jsbox")
const SettingStructure = require("./setting/setting")
const { Storage } = require("./dao/storage")

const fileStorage = new FileStorage({ basePath: "shared://caio" })

class Widget {
    static widgetInstance(widget, ...data) {
        if ($file.exists(`/scripts/widget/${widget}.js`)) {
            const { Widget } = require(`./widget/${widget}.js`)
            return new Widget(...data)
        } else {
            return false
        }
    }

    static kernel() {
        const logger = new Logger()
        logger.printToFile(fileStorage, "logs/widget.log")
        const kernel = {
            setting: new Setting({
                fileStorage,
                structure: SettingStructure
            }),
            fileStorage,
            print: () => {},
            error: msg => {
                logger.error(msg)
            }
        }
        kernel.setting.setReadonly()

        const storage = new Storage(kernel)
        kernel.storage = storage

        return kernel
    }

    static renderError() {
        $widget.setTimeline({
            render: () => ({
                type: "text",
                props: {
                    text: "Invalid argument"
                }
            })
        })
    }

    static renderClipboard() {
        const setting = new Setting()
        setting.setReadonly()

        const widget = Widget.widgetInstance("Clipboard", Widget.kernel())

        widget.render()
    }

    static render(widgetName = $widget.inputValue) {
        widgetName = widgetName ?? "Clipboard"
        if (widgetName === "Clipboard") {
            Widget.renderClipboard()
        } else {
            Widget.renderError()
        }
    }
}

module.exports = {
    Widget,
    run: () => {
        Widget.render()
    }
}
