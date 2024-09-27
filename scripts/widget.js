const { AppKernelBase } = require("./app")

/**
 * @typedef {AppKernel} AppKernel
 */
class AppKernel extends AppKernelBase {
    constructor() {
        super()

        this.setting.setReadonly()
    }

    get logFile() {
        return "widget.log"
    }

    get isWebdavEnabled() {
        // 在小组件中不启用 WebDAV
        return false
    }
}

class Widget {
    static kernel = new AppKernel()

    static widgetInstance(widget, ...data) {
        if ($file.exists(`/scripts/widget/${widget}.js`)) {
            try {
                const { Widget } = require(`./widget/${widget}.js`)
                this.kernel.logger.info(`Loading widget: ${widget}`)
                return new Widget(...data)
            } catch (error) {
                this.kernel.logger.error(`Error loading widget: ${widget}`)
                this.kernel.logger.error(error)
            }
        } else {
            this.kernel.logger.error(`Widget not found: ${widget}`)
            return false
        }
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

    static renderClips() {
        const widget = Widget.widgetInstance("Clips", Widget.kernel)
        widget.render()
    }

    static renderFavorite() {
        const widget = Widget.widgetInstance("Favorite", Widget.kernel)
        widget.render()
    }

    static renderActions() {
        const widget = Widget.widgetInstance("Actions", Widget.kernel)
        widget.render()
    }

    static render(widgetName = $widget.inputValue ?? "Actions") {
        switch (widgetName) {
            case "Clips":
                Widget.renderClips()
                break
            case "Favorite":
                Widget.renderFavorite()
                break
            case "Actions":
                Widget.renderActions()
                break
            default:
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
