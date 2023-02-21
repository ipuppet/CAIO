const { WebDAV } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class WebDavSync {
    static step = {
        init: -1,
        stay: 0,
        needPush: 2,
        needPull: 3,
        conflict: 4
    }
    static stepName = (() => {
        const map = {}
        Object.keys(WebDavSync.step).map(key => {
            const value = WebDavSync.step[key]
            map[value] = String(key)
        })
        return map
    })()
    static status = {
        syncing: 0,
        success: 1,
        nochange: 2,
        fail: 3
    }

    /**
     * @type {WebDAV}
     */
    webdav
    /**
     * @type {AppKernel}
     */
    kernel

    initLocalTimestamp = 0

    localSyncDataPath
    webdavSyncDataPath

    constructor({ host, user, password, basepath, kernel } = {}) {
        this.kernel = kernel
        this.webdav = new WebDAV({ host, user, password, basepath })
        this.webdav.namespace = "JSBox.CAIO"
    }

    get mustLocalSyncDataPath() {
        if (!this.localSyncDataPath) {
            throw new Error("localSyncDataPath not set")
        }
        return this.localSyncDataPath
    }
    get mustWebdavSyncDataPath() {
        if (!this.webdavSyncDataPath) {
            throw new Error("webdavSyncDataPath not set")
        }
        return this.webdavSyncDataPath
    }

    get localSyncData() {
        if (!this.kernel.fileStorage.exists(this.mustLocalSyncDataPath)) {
            this.localSyncData = { timestamp: this.initLocalTimestamp }
        }
        return this.kernel.fileStorage.readSync(this.mustLocalSyncDataPath)
    }
    set localSyncData(data) {
        this.kernel.fileStorage.writeSync(
            this.mustLocalSyncDataPath,
            $data({
                string: JSON.stringify(data)
            })
        )
    }
    get localTimestamp() {
        return Number(JSON.parse(this.localSyncData.string).timestamp)
    }
    set localTimestamp(timestamp) {
        this.localSyncData = Object.assign(this.localSyncData, { timestamp })
    }

    async init() {
        let exists = await this.webdav.exists("/")
        if (!exists) {
            await this.webdav.mkdir("/")
        }
    }

    /**
     * 要同步的数据是否是刚刚初始化的（无内容）状态
     * @returns {boolean}
     */
    isEmpty() {
        return false
    }

    async webdavSyncData() {
        let resp = await this.webdav.get(this.mustWebdavSyncDataPath)
        let syncData = resp.data
        if (typeof syncData === "string") {
            syncData = JSON.parse(syncData)
        }
        return syncData
    }
    async webdavTimestamp() {
        try {
            let syncData = await this.webdavSyncData()
            return Number(syncData.timestamp)
        } catch (error) {
            if (error.code === 404) {
                return WebDavSync.step.init
            }
            throw error
        }
    }

    updateLocalTimestamp() {
        if (this.localTimestamp === this.initLocalTimestamp) {
            return
        }
        this.localTimestamp = Date.now()
    }

    async uploadSyncData() {
        if (this.localTimestamp === this.initLocalTimestamp) {
            this.localTimestamp = Date.now()
        }
        await this.webdav.put(this.mustWebdavSyncDataPath, this.localSyncData)
    }
    async downloadSyncData() {
        this.localSyncData = await this.webdavSyncData()
    }

    async nextSyncStep() {
        const localTimestamp = this.localTimestamp
        const webdavTimestamp = await this.webdavTimestamp()
        if (webdavTimestamp === WebDavSync.step.init) {
            return WebDavSync.step.init
        }

        if (webdavTimestamp === this.initLocalTimestamp) {
            // 重置 webdav 数据
            this.localTimestamp = Date.now()
            await this.push()
            return WebDavSync.step.stay
        }

        if (localTimestamp > webdavTimestamp) {
            return WebDavSync.step.needPush
        }
        if (localTimestamp === webdavTimestamp) {
            return WebDavSync.step.stay
        }
        if (localTimestamp < webdavTimestamp) {
            // WebDAV 有数据，本地 sync 时间戳为 0，发生数据冲突
            if (!this.isEmpty() && localTimestamp === this.initLocalTimestamp) {
                return WebDavSync.step.conflict
            }
            return WebDavSync.step.needPull
        }
    }
}

module.exports = WebDavSync
