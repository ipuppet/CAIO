const { Kernel, Logger, FileStorage, Setting, FileManager } = require("./libs/easy-jsbox")
const SettingStructure = require("./setting/setting")
const { Storage } = require("./dao/storage")
const Clips = require("./ui/clips/clips")
const ActionManager = require("./ui/action/action-manager")

/**
 * @typedef {AppKernelBase} AppKernelBase
 */
class AppKernelBase extends Kernel {
    static fileStorage = new FileStorage()

    logPath = "logs"
    logFile = "caio.log"
    logFilePath = FileStorage.join(this.logPath, this.logFile)

    #storage

    constructor() {
        super()
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

    initComponents() {
        // Clips
        this.clips = new Clips(this)
        // ActionManager
        this.actionManager = new ActionManager(this)
        // FileManager
        this.fileManager = new FileManager()
    }
}

module.exports = {
    AppKernelBase
}
