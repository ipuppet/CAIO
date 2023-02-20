const { WebDAV } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class WebDAVSync {
    static step = {
        stay: "stay",
        needPush: "needPush",
        needPull: "needPull",
        conflict: "conflict"
    }
    static status = {
        syncing: 0,
        success: 1
    }

    /**
     * @type {WebDAV}
     */
    webdav
    /**
     * @type {AppKernel}
     */
    kernel

    webdavSyncDataPath = "/sync.json"
    webdavDbPath = "/CAIO.db"
    webdavImagePath = "/image"
    #fsLocalSyncDataPath = "/sync.json"
    get localSyncData() {
        let path = this.kernel.fileStorage.filePath(this.#fsLocalSyncDataPath)
        let data = $data({ path })
        if (!data) {
            this.localSyncData = { date: 0 }
            data = $data({ path })
        }
        return data
    }
    set localSyncData(data) {
        this.kernel.fileStorage.writeSync(
            this.#fsLocalSyncDataPath,
            $data({
                string: JSON.stringify(data)
            })
        )
    }
    get localDb() {
        return $data({ path: this.kernel.fileStorage.filePath(this.kernel.storage.localDb) })
    }
    set localDb(data) {
        this.kernel.fileStorage.writeSync(this.kernel.storage.localDb, data)
    }
    get localImagePath() {
        return this.kernel.fileStorage.filePath("/image")
    }

    constructor({ host, user, password, basepath, kernel } = {}) {
        this.kernel = kernel
        this.webdav = new WebDAV({ host, user, password, basepath })
        this.webdav.namespace = "JSBox.CAIO"
    }

    async init() {
        let exists = await this.webdav.exists("/")
        if (!exists) {
            await this.webdav.mkdir("/")
        }
        await this.sync()
    }

    updateLocalSyncData() {
        this.localSyncData = { date: Date.now() }
    }

    reset() {
        this.localSyncData = { date: 0 }
    }

    async syncStatus() {
        const localSyncDate = JSON.parse(this.localSyncData.string).date

        let webdavResp
        try {
            webdavResp = await this.webdav.get(this.webdavSyncDataPath)
        } catch (error) {
            if (error.code === 404) {
                if (localSyncDate === 0) {
                    // init
                    this.updateLocalSyncData()
                }
                return WebDAVSync.step.needPush
            }
            throw error
        }
        const webdavSyncDate = webdavResp.data.date

        const ld = new Date(localSyncDate)
        const wd = new Date(webdavSyncDate)
        if (ld > wd) {
            return WebDAVSync.step.needPush
        } else if (ld < wd) {
            if (!this.kernel.storage.isEmpty() && localSyncDate === 0) {
                return WebDAVSync.step.conflict
            }
            return WebDAVSync.step.needPull
        } else {
            return WebDAVSync.step.stay
        }
    }

    async pull() {
        let webdavResp = await this.webdav.get(this.webdavDbPath)
        this.localDb = webdavResp.rawData

        webdavResp = await this.webdav.get(this.webdavSyncDataPath)
        let syncData = webdavResp.data
        if (typeof syncData === "string") {
            syncData = JSON.parse(syncData)
        }
        this.localSyncData = syncData

        this.kernel.storage.init()
    }
    async push() {
        await this.webdav.put(this.webdavDbPath, this.localDb)
        await this.webdav.put(this.webdavSyncDataPath, this.localSyncData)
    }

    async sync() {
        $app.notify({
            name: "clipSyncStatus",
            object: { status: WebDAVSync.status.syncing }
        })
        try {
            const syncStatus = await this.syncStatus()
            this.kernel.print(`syncStatus: ${syncStatus}`)
            if (syncStatus === WebDAVSync.step.needPush) {
                await this.webdav.put(this.webdavDbPath, this.localDb)
                await this.webdav.put(this.webdavSyncDataPath, this.localSyncData)
            } else if (syncStatus === WebDAVSync.step.needPull) {
                await this.pull()
            } else if (syncStatus === WebDAVSync.step.conflict) {
                const resp = await $ui.alert({
                    title: $l10n("DATABASE_CONFLICT"),
                    message: $l10n("DATABASE_CONFLICT_MESSAGE"),
                    actions: [$l10n("LOCAL_DATABASE"), $l10n("WEBDAV_DATABASE"), $l10n("CANCEL")]
                })
                if (resp.index === 2) {
                    return
                }
                resp.index === 0 ? await this.pull() : await this.push()
            } else {
                // 直接返回，不触发 $app.notify
                return
            }
        } catch (error) {
            throw error
        } finally {
            $app.notify({
                name: "clipSyncStatus",
                object: { status: WebDAVSync.status.success }
            })
        }
    }
}

module.exports = WebDAVSync
