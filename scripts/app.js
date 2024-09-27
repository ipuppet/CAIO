const { UIKit, Kernel, Logger, FileStorage, Setting } = require("./libs/easy-jsbox")
const SettingStructure = require("./setting/setting")
const { Storage } = require("./dao/storage")
const Clips = require("./ui/clips/clips")
const Actions = require("./ui/action/actions")

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
}

module.exports = {
    AppKernelBase
}
