const { FileStorage } = require("../libs/easy-jsbox")
const WebDavSync = require("./webdav-sync")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class WebDavSyncClip extends WebDavSync {
    localSyncDataPath = "/sync.json"
    webdavSyncDataPath = "/sync.json"

    webdavDbPath = "/CAIO.db"
    webdavImagePath = "/image"
    get localDb() {
        return $data({ path: this.kernel.fileStorage.filePath(this.kernel.storage.localDb) })
    }
    set localDb(data) {
        this.kernel.fileStorage.writeSync(this.kernel.storage.localDb, data)
    }
    get localImagePath() {
        return this.kernel.fileStorage.filePath("/image")
    }

    async init() {
        await super.init()
        await this.initImagePath()
        this.sync()
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

    isNew() {
        return this.kernel.storage.isEmpty()
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
        let resp = await this.webdav.get(this.webdavDbPath)
        this.localDb = resp.rawData
        await this.downloadSyncData()

        this.kernel.storage.init()
        await this.syncImages()
        this.kernel.print(`clip webdav sync: pulled`)
    }
    async push() {
        await this.webdav.put(this.webdavDbPath, this.localDb)
        await this.uploadSyncData()
        await this.syncImages()
        this.kernel.print(`clip webdav sync: pushed`)
    }

    async #sync() {
        $app.notify({
            name: "clipSyncStatus",
            object: { status: WebDavSync.status.syncing }
        })
        let isPull = false
        try {
            const syncStep = await this.nextSyncStep()
            this.kernel.print(`clip nextSyncStep: ${WebDavSync.stepName[syncStep]}`)
            if (syncStep === WebDavSync.step.needPush || syncStep === WebDavSync.step.init) {
                await this.push()
            } else if (syncStep === WebDavSync.step.needPull) {
                await this.pull()
                isPull = true
            } else if (syncStep === WebDavSync.step.conflict) {
                const resp = await this.conflict($l10n("CLIPS"))
                if (resp === WebDavSyncClip.conflictKeep.webdav) {
                    isPull = true
                }
            } else {
                $app.notify({
                    name: "clipSyncStatus",
                    object: { status: WebDavSync.status.nochange }
                })
                return
            }
        } catch (error) {
            $app.notify({
                name: "clipSyncStatus",
                object: {
                    status: WebDavSync.status.fail,
                    error
                }
            })
            throw error
        } finally {
            $app.notify({
                name: "clipSyncStatus",
                object: {
                    status: WebDavSync.status.success,
                    updateList: isPull
                }
            })
        }
    }

    sync() {
        if (this.syncTimer) this.syncTimer.cancel()
        this.syncTimer = $delay(0.5, () => {
            this.#sync()
        })
    }

    upload() {
        if (this.uploadTimer) this.uploadTimer.cancel()
        this.uploadTimer = $delay(0.5, () => {
            this.updateLocalTimestamp()
            this.#sync()
        })
    }
}

module.exports = WebDavSyncClip
