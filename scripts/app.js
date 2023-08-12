const { Kernel, Logger, FileStorage, Setting, FileManager } = require("./libs/easy-jsbox")
const SettingStructure = require("./setting/setting")
const { Storage } = require("./dao/storage")
const Clips = require("./ui/clips/clips")
const ActionManager = require("./ui/components/action-manager")

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
        this.logger.printToFile(this.fileStorage, this.logFilePath)
        // Setting
        this.setting = new Setting({
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
            this.print("init storage")
            this.#storage = new Storage(this)
        }
        return this.#storage
    }

    error(message) {
        if (this.fileStorage.exists(this.logFilePath)) {
            const logFileSize = this.fileStorage.readSync(this.logFilePath)?.info?.size ?? 0
            if (logFileSize > 1024 * 10) {
                const dist = FileStorage.join(this.logPath, `caio.${Date.now()}.log`)
                this.fileStorage.move(this.logFilePath, dist)
            }
        }

        if (message instanceof Error) {
            message = `${message}\n${message.stack}`
        }
        super.error(message)
        this.logger.error(message)
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
