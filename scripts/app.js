const { UIKit, Kernel, Logger, FileStorage, Setting, FileManager } = require("./libs/easy-jsbox")
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

    logPath = "logs"
    logFile = "caio.log"
    logFilePath = FileStorage.join(this.logPath, this.logFile)

    #storage

    constructor() {
        super()
        $file.list($file.rootPath)
        $app.listen({ exit: () => $objc_clean() })
        // FileStorage
        this.fileStorage = AppKernelBase.fileStorage
        // Logger
        this.logger = new Logger()
        this.logger.setWriter(this.fileStorage, this.logFilePath)
        // Setting
        this.setting = new Setting({
            logger: this.logger,
            fileStorage: this.fileStorage,
            structure: SettingStructure
        })
        this.initComponents()
    }

    /**
     * @type {Storage}
     */
    get storage() {
        if (!this.#storage) {
            this.logger.info("init storage")
            this.#storage = new Storage(this)
        }
        return this.#storage
    }

    get isWebdavEnabled() {
        return this.kernel.setting.get("webdav.status")
    }

    initComponents() {
        // Clips
        this.clips = new Clips(this)
        // Actions
        this.actions = new Actions(this)
        // FileManager
        this.fileManager = new FileManager()
    }
}

module.exports = {
    AppKernelBase
}
