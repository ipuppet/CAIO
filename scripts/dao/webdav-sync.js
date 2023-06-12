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
    static conflictKeep = {
        local: 0,
        webdav: 1,
        cancel: 2
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

    /**
     *
     * @param {string} path
     */
    async init(path = this.webdav.basepath) {
        const webdav = new WebDAV({
            host: this.webdav.host,
            user: this.webdav.user,
            password: this.webdav.password,
            basepath: path
        })
        let exists = await webdav.exists("/")
        if (!exists) {
            try {
                await webdav.mkdir("/")
            } catch (error) {
                if (error.code === 409) {
                    // 递归创建目录
                    await this.init(path.substring(0, path.lastIndexOf("/")))
                    await this.init(path)
                    return
                }
                throw error
            }
        }
    }

    /**
     * 要同步的数据是否是刚刚初始化的（无内容）状态
     * @returns {boolean}
     */
    isNew() {
        return false
    }

    async webdavSyncData() {
        this.webdav.clearNSURLCache()
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
            if (!this.isNew() && localTimestamp === this.initLocalTimestamp) {
                return WebDavSync.step.conflict
            }
            return WebDavSync.step.needPull
        }
    }

    async conflict(name = "") {
        const actions = []
        actions[WebDavSync.conflictKeep.local] = $l10n("LOCAL_DATA")
        actions[WebDavSync.conflictKeep.webdav] = $l10n("WEBDAV_DATA")
        actions[WebDavSync.conflictKeep.cancel] = $l10n("CANCEL")
        const resp = await $ui.alert({
            title: $l10n("DATA_CONFLICT"),
            message: $l10n("DATA_CONFLICT_MESSAGE") + ` (${name})`,
            actions
        })
        if (resp.index !== WebDavSync.conflictKeep.cancel) {
            if (resp.index === WebDavSync.conflictKeep.local) {
                this.kernel.print(`conflict resolve: keep local database`)
                await this.push()
            } else {
                this.kernel.print(`conflict resolve: keep WebDAV database`)
                await this.pull()
            }
        }
        return resp.index
    }
}

module.exports = WebDavSync
