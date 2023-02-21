const { WebDAV, FileStorage } = require("../libs/easy-jsbox")

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
        success: 1,
        nochange: 2
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

    webdavSyncDataPath = "/sync.json"
    webdavDbPath = "/CAIO.db"
    webdavImagePath = "/image"
    #fsLocalSyncDataPath = "/sync.json"
    get localSyncData() {
        let path = this.kernel.fileStorage.filePath(this.#fsLocalSyncDataPath)
        let data = $data({ path })
        if (!data) {
            this.localSyncData = { timestamp: this.initLocalTimestamp }
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

    async initImagePath() {
        let exists = await this.webdav.exists(this.webdavImagePath)
        if (!exists) {
            await this.webdav.mkdir(this.webdavImagePath)
            const initDir = ["/image/original", "/image/preview"]
            initDir.map(async item => {
                let exists = await this.webdav.exists(item)
                if (!exists) {
                    await this.webdav.mkdir(item)
                }
            })
        }
    }

    async init() {
        let exists = await this.webdav.exists("/")
        if (!exists) {
            await this.webdav.mkdir("/")
        }
        await this.initImagePath()

        await this.sync()
    }

    async webdavImages() {
        const resp = await this.webdav.ls(this.webdavImagePath, "infinity")
        const rootElement = resp.rootElement
        const baseUrl = rootElement.firstChild({ xPath: "//D:response/D:href" }).string
        const original = [],
            preview = []
        rootElement.children().map(item => {
            /**
             * @type {string}
             */
            const href = item.firstChild({ tag: "href" })?.string?.replace(baseUrl, "")
            if (href.endsWith("/")) return
            if (href.startsWith("original")) {
                original.push(href.substring(9))
            } else if (href.startsWith("preview")) {
                preview.push(href.substring(8))
            }
        })
        return { original, preview }
    }

    updateLocalTimestamp() {
        const localTimestamp = JSON.parse(this.localSyncData.string).timestamp
        if (localTimestamp === this.initLocalTimestamp) {
            return
        }
        this.newLocalTimestamp()
    }
    newLocalTimestamp() {
        this.localSyncData = { timestamp: Date.now() }
    }

    async syncStatus() {
        const localTimestamp = JSON.parse(this.localSyncData.string).timestamp

        let webdavResp
        try {
            webdavResp = await this.webdav.get(this.webdavSyncDataPath)
        } catch (error) {
            if (error.code === 404) {
                if (localTimestamp === this.initLocalTimestamp) {
                    // init
                    this.updateLocalTimestamp()
                }
                return WebDAVSync.step.needPush
            }
            throw error
        }
        const webdavTimestamp = webdavResp.data.timestamp

        const li = Number(localTimestamp)
        const wi = Number(webdavTimestamp)

        if (wi === 0) {
            // 重置 webdav 数据
            this.newLocalTimestamp()
            await this.push()
            return WebDAVSync.step.stay
        }

        if (li > wi) {
            return WebDAVSync.step.needPush
        } else if (li < wi) {
            if (!this.kernel.storage.isEmpty() && localTimestamp === this.initLocalTimestamp) {
                return WebDAVSync.step.conflict
            }
            return WebDAVSync.step.needPull
        } else {
            return WebDAVSync.step.stay
        }
    }

    async syncImages() {
        const webdavImages = await this.webdavImages()
        const dbImages = this.kernel.storage.allImageFromDb(false)
        const localImages = this.kernel.storage.localImagesFromFile()
        // 删除本地多余图片
        Object.keys(localImages).map(key => {
            localImages[key].forEach(async image => {
                if (!dbImages[key].includes(image)) {
                    const localPath = FileStorage.join(this.kernel.storage.imagePath[key], image)
                    this.kernel.fileStorage.delete(localPath)
                    this.kernel.print(`Local image deleted: ${localPath}`)
                }
            })
        })
        // 从 webdav 下载本地缺失图片或上传 webdav 缺失图片
        Object.keys(dbImages).map(key => {
            dbImages[key].forEach(async image => {
                const webdavPath = FileStorage.join(this.webdavImagePath, key, image)
                const localPath = FileStorage.join(this.kernel.storage.imagePath[key], image)
                if (webdavImages[key].includes(image) && !this.kernel.fileStorage.exists(localPath)) {
                    const resp = await this.webdav.get(webdavPath)
                    this.kernel.fileStorage.writeSync(localPath, resp.rawData)
                    this.kernel.print(`WebDAV image downloaded: ${localPath}`)
                } else if (!webdavImages[key].includes(image)) {
                    const file = this.kernel.fileStorage.readSync(localPath)
                    await this.webdav.put(webdavPath, file)
                    this.kernel.print(`WebDAV image uploaded: ${webdavPath}`)
                }
            })
        })
        // 遍历 webdavImages 删除 webdav 中本地没有的图片
        Object.keys(webdavImages).map(key => {
            webdavImages[key].forEach(async image => {
                if (!dbImages[key].includes(image)) {
                    const webdavPath = FileStorage.join(this.webdavImagePath, key, image)
                    await this.webdav.delete(webdavPath)
                    this.kernel.print(`WebDAV image deleted: ${webdavPath}`)
                }
            })
        })
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

        await this.syncImages()
    }
    async push() {
        await this.webdav.put(this.webdavDbPath, this.localDb)
        await this.webdav.put(this.webdavSyncDataPath, this.localSyncData)

        await this.syncImages()
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
                await this.push()
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
                if (resp.index === 0) {
                    await this.pull()
                } else {
                    this.newLocalTimestamp()
                    await this.push()
                }
            } else {
                $app.notify({
                    name: "clipSyncStatus",
                    object: { status: WebDAVSync.status.nochange }
                })
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
