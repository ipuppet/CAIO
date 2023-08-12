const { FileStorage } = require("../libs/easy-jsbox")
const WebDavSync = require("./webdav-sync")

/**
 * @typedef {import("../app-main").AppKernel} AppKernel
 */

class WebDavSyncAction extends WebDavSync {
    localSyncDataPath = "/user_action/sync.json"
    webdavSyncDataPath = "/sync.json"

    tempPath = "/temp"
    webdavActionsPath = "/actions.zip"
    localActionsPath = "/user_action"

    constructor({ host, user, password, basepath, kernel } = {}) {
        basepath = FileStorage.join(basepath, "user_action")
        super({ host, user, password, basepath, kernel })
    }

    async init() {
        await super.init()
        this.sync()
    }

    isNew() {
        return this.kernel.actionManager.isNew
    }

    async pull() {
        const tempPath = FileStorage.join(this.tempPath, "user_action")
        const rawTempPath = this.kernel.fileStorage.filePath(tempPath)
        const resp = await this.webdav.get(this.webdavActionsPath)
        const success = await $archiver.unzip({ file: resp.rawData, dest: rawTempPath })
        if (!success) {
            throw new Error($l10n("UNZIP_FAILED"))
        }
        await this.downloadSyncData()

        this.kernel.fileStorage.move(tempPath, this.localActionsPath)
        this.kernel.print(`action webdav sync: pulled`)
    }
    async push() {
        const actionsZip = FileStorage.join(this.tempPath, "actions.zip")
        const success = $archiver.zip({
            directory: this.kernel.fileStorage.filePath(this.localActionsPath),
            dest: this.kernel.fileStorage.filePath(actionsZip)
        })
        if (!success) {
            throw new Error($l10n("ZIP_FAILED"))
        }
        await $wait(0.5)
        await this.webdav.put(this.webdavActionsPath, this.kernel.fileStorage.readSync(actionsZip))
        await this.uploadSyncData()

        this.kernel.fileStorage.delete(actionsZip)
        this.kernel.print(`action webdav sync: pushed`)
    }

    notify(option) {
        $app.notify({
            name: "actionSyncStatus",
            object: option
        })
    }

    async #sync() {
        let isPull = false
        try {
            const syncStep = await this.nextSyncStep()
            this.kernel.print(`action nextSyncStep: ${WebDavSync.stepName[syncStep]}`)
            if (syncStep === WebDavSync.step.needPush || syncStep === WebDavSync.step.init) {
                await this.push()
            } else if (syncStep === WebDavSync.step.needPull) {
                await this.pull()
                isPull = true
            } else if (syncStep === WebDavSync.step.conflict) {
                const resp = await this.conflict($l10n("ACTIONS"))
                if (resp === WebDavSyncAction.conflictKeep.webdav) {
                    isPull = true
                }
            } else {
                this.notify({ status: WebDavSync.status.nochange })
                return
            }
        } catch (error) {
            this.notify({
                status: WebDavSync.status.fail,
                error
            })
            throw error
        } finally {
            this.notify({
                status: WebDavSync.status.success,
                updateList: isPull
            })
        }
    }

    sync() {
        this.notify({ status: WebDavSync.status.syncing, animate: true })
        if (this.syncTimer) this.syncTimer.cancel()
        this.syncTimer = $delay(0.5, () => {
            this.#sync(true)
        })
    }

    needUpload() {
        this.notify({ status: WebDavSync.status.syncing })
        if (this.uploadTimer) this.uploadTimer.cancel()
        this.uploadTimer = $delay(0.5, () => {
            this.updateLocalTimestamp()
            this.#sync()
        })
    }
}

module.exports = WebDavSyncAction
