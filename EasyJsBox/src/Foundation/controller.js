class BaseController {
    constructor(kernel) {
        this.kernel = kernel
    }

    init(args) {
        this.args = args
        this.loadL10n(args.name)
    }

    loadL10n(name) {
        if (typeof $app.strings !== "object") {
            $app.strings = {}
        }
        const path = `${this.kernel.path.components}/${name}/strings`
        if ($file.exists(path)) {
            $file.list(path).forEach(element => {
                let strings = {}
                let strArr = $file.read(`${path}/${element}`).string.split(";")
                strArr.forEach(line => {
                    line = line.trim()
                    if (line !== "") {
                        let kv = line.split("=")
                        strings[kv[0].trim().slice(1, -1)] = kv[1].trim().slice(1, -1)
                    }
                })
                Object.assign($app.strings, strings)
            })
        }
    }

    setView(view) {
        this.view = view
    }

    getView() {
        return this.view.getView()
    }

    setDataCenter(dataCenter) {
        this.dataCenter = dataCenter
    }
}

module.exports = BaseController