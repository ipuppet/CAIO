const { FileStorage } = require("../libs/easy-jsbox")
const WebDavSync = require("./webdav-sync")

/**
 * @typedef {import("../app").AppKernel} AppKernel
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
        await this.sync()
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
            throw new Error("unzip failed")
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
            throw new Error("zip failed")
        }
        await $wait(0.5)
        await this.webdav.put(this.webdavActionsPath, this.kernel.fileStorage.readSync(actionsZip))
        await this.uploadSyncData()

        this.kernel.fileStorage.delete(actionsZip)
        this.kernel.print(`action webdav sync: pushed`)
    }

    async sync() {
        $app.notify({
            name: "actionSyncStatus",
            object: { status: WebDavSync.status.syncing }
        })
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
                $app.notify({
                    name: "actionSyncStatus",
                    object: { status: WebDavSync.status.nochange }
                })
                return
            }
        } catch (error) {
            $app.notify({
                name: "actionSyncStatus",
                object: {
                    status: WebDavSync.status.fail,
                    error
                }
            })
            throw error
        } finally {
            $app.notify({
                name: "actionSyncStatus",
                object: {
                    status: WebDavSync.status.success,
                    updateList: isPull
                }
            })
        }
    }
}

module.exports = WebDavSyncAction
