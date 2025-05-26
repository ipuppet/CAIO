const { UIKit, Kernel, Logger, FileStorage, Setting } = require("./libs/easy-jsbox")
const SettingStructure = require("./setting/setting")
const { Storage } = require("./dao/storage")
const Clips = require("./ui/clips/clips")
const Actions = require("./ui/action/actions")
const { ActionEnv } = require("./action/action")

/**
 * @typedef {AppKernelBase} AppKernelBase
 */
class AppKernelBase extends Kernel {
    static fileStorage = new FileStorage({
        basePath: UIKit.isTaio ? FileStorage.join($file.rootPath, "caio") : "shared://caio"
    })

    #storage
    #clips
    #actions

    #addins = {}

    runActionFlag = false

    constructor() {
        super()
        // $file.list($file.rootPath)
        $app.listen({ exit: () => $objc_clean() })
        // FileStorage
        this.fileStorage = AppKernelBase.fileStorage
        // Logger
        this.logger = new Logger()
        this.logger.printToFile([Logger.level.warn, Logger.level.error])
        this.logger.setWriter(this.fileStorage, FileStorage.join("logs", this.logFile))
        // Setting
        this.setting = new Setting({
            logger: this.logger,
            fileStorage: this.fileStorage,
            structure: SettingStructure
        })

        this.runAction($context.query)
    }

    getQueries(query) {
        const queries = {}
        if (query.indexOf("?") !== -1) {
            query = query.split("?")[1]
        }
        const pairs = query.split("&")
        pairs.forEach(pair => {
            const indexOfEquals = pair.indexOf("=")
            if (indexOfEquals !== -1) {
                const key = pair.slice(0, indexOfEquals)
                const value = pair.slice(indexOfEquals + 1)
                queries[key] = value
            } else {
                const key = pair
                queries[key] = ""
            }
        })
        return queries
    }

    runAction(query) {
        if (!query.runAction) return
        this.runActionFlag = true

        if (query.runAction?.startsWith("jsbox://")) {
            query.runAction = this.getQueries(query.runAction).runAction
        }
        const data = JSON.parse($text.base64Decode(query.runAction))
        const env = $app.env === $env.siri ? ActionEnv.siri : ActionEnv.widget

        $delay(0.1, async () => {
            try {
                const action = this.actions.getAction(data.category, data.dir, { env, ...query })
                let result = await action.do()
                if (env === ActionEnv.siri) {
                    $intents.finish(result)
                    if (typeof result === "object") {
                        result = JSON.stringify(result, null, 2)
                    }
                    $("shortcuts-root-label").text = result ?? "CAIO"
                }
            } catch (error) {
                if (env === ActionEnv.siri) {
                    $intents.finish(error)
                }
                this.logger.error(error)
            }
        })
    }

    get logFile() {
        return "caio.log"
    }

    get isWebdavEnabled() {
        return this.setting.get("webdav.status")
    }

    /**
     * @type {Storage}
     */
    get storage() {
        if (!this.#storage) {
            this.#storage = new Storage(this)
        }
        return this.#storage
    }

    /**
     * @type {Clips}
     */
    get clips() {
        if (!this.#clips) {
            this.#clips = new Clips(this)
        }
        return this.#clips
    }

    /**
     * @type {Actions}
     */
    get actions() {
        if (!this.#actions) {
            this.#actions = new Actions(this)
        }
        return this.#actions
    }

    getAddin(name) {
        if (this.#addins[name]) {
            return this.#addins[name]
        }
        const list = $addin.list
        for (const s of list) {
            if (s.name === name || s.displayName === name) {
                this.#addins[name] = s
                return this.#addins[name]
            }
        }
        this.logger.warn(`Addin ${name} not found`)
        return null
    }
}

module.exports = {
    AppKernelBase
}
