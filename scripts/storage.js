const { compressImage } = require("./lib/easy-jsbox")

class Storage {
    constructor(sync = false, kernel) {
        this.sync = sync
        this.kernel = kernel
        this.dbName = "CAIO.db"
        this.localDb = `${this.kernel.fileStorage.basePath}/${this.dbName}`
        this.iCloudPath = "drive://CAIO"
        this.iCloudZipFile = `${this.iCloudPath}/CAIO.zip`
        this.syncInfoFile = `${this.kernel.fileStorage.basePath}/sync.json`
        this.imagePath = `${this.kernel.fileStorage.basePath}/image`
        this.imageOriginalPath = `${this.imagePath}/original`
        this.imagePreviewPath = `${this.imagePath}/preview`
        this.tempPath = `${this.kernel.fileStorage.basePath}/temp`
        this.tempSyncInfoFile = `${this.tempPath}/sync.json`
        this.tempDbFile = `${this.tempPath}/${this.dbName}`
        this.tempImagePath = `${this.tempPath}/image`
        this.init()
        if (this.sync) this.syncByiCloud()
    }

    init() {
        // 初始化表
        this.sqlite = $sqlite.open(this.localDb)
        this.sqlite.update("CREATE TABLE IF NOT EXISTS clipboard(uuid TEXT PRIMARY KEY NOT NULL, text TEXT, md5 TEXT, prev TEXT, next TEXT)")
        this.sqlite.update("CREATE TABLE IF NOT EXISTS pin(uuid TEXT PRIMARY KEY NOT NULL, text TEXT, md5 TEXT, prev TEXT, next TEXT)")
        // 初始化目录
        if (!$file.exists(this.tempPath)) $file.mkdir(this.tempPath)
        if (!$file.exists(this.iCloudPath)) $file.mkdir(this.iCloudPath)
        // image path
        if (!$file.isDirectory(this.imagePath)) { $file.mkdir(this.imagePath) }
        if (!$file.isDirectory(this.imagePreviewPath)) $file.mkdir(this.imagePreviewPath)
        if (!$file.isDirectory(this.imageOriginalPath)) $file.mkdir(this.imageOriginalPath)
    }

    async export(callback) {
        $file.copy({ src: this.syncInfoFile, dst: this.tempSyncInfoFile })
        $file.copy({ src: this.localDb, dst: this.tempDbFile })
        $file.copy({ src: this.imagePath, dst: this.tempImagePath })
        const exportFileName = "CAIO.zip"
        const exportFile = this.tempPath + "/" + exportFileName
        await $archiver.zip({ directory: this.tempPath, dest: exportFile })
        $share.sheet({
            items: [{
                name: exportFileName,
                data: $data({ path: exportFile })
            }],
            handler: success => {
                $file.delete(exportFile)
                callback(success)
            }
        })
    }

    import(data) {
        return new Promise(async (resolve, reject) => {
            if (data.fileName.slice(-2) === "db") {
                if (!$file.write({ data: data, path: this.localDb })) {
                    reject()
                    return
                }
            } else if (data.fileName.slice(-3) === "zip") {
                const success = await $archiver.unzip({ file: data, dest: this.tempPath })
                if (!success) {
                    reject("UNZIP_FAILED")
                    return
                }
                $file.write({ data: $data({ path: this.tempDbFile }), path: this.localDb })
                // image
                $file.move({ src: this.tempImagePath, dst: this.imagePath })
            }
            $sqlite.close(this.sqlite)
            this.sqlite = $sqlite.open(this.localDb)
            try {
                await this.upload(manual)
                resolve()
            } finally {
                resolve()
            }
        })
    }

    async upload(manual) {
        if (!this.sync && !manual) return
        if (this.all().length === 0) return

        const handler = status => {
            if (!status) {
                throw "upload failed"
            }
        }

        handler($file.write({
            data: $data({ string: JSON.stringify({ timestamp: Date.now() }) }),
            path: this.syncInfoFile
        }))
        handler($file.copy({ src: this.syncInfoFile, dst: this.tempSyncInfoFile }))
        handler($file.copy({ src: this.localDb, dst: this.tempDbFile }))
        handler($file.copy({ src: this.imagePath, dst: this.tempImagePath }))
        const success = await $archiver.zip({ directory: this.tempPath, dest: this.iCloudZipFile })
        handler(success)
    }

    syncByiCloud(manual = false) {
        return new Promise(async (resolve, reject) => {
            const data = await $file.download(this.iCloudZipFile)

            if (data !== undefined) {
                const success = await $archiver.unzip({ file: data, dest: this.tempPath })
                if (!success) {
                    reject("UNZIP_FAILED")
                    return
                }

                const syncInfoLocal = $file.exists(this.syncInfoFile) ?
                    JSON.parse($file.read(this.syncInfoFile).string) : {}
                const syncInfoIcloud = JSON.parse($file.read(this.tempSyncInfoFile).string)

                if (!syncInfoLocal.timestamp || syncInfoLocal.timestamp < syncInfoIcloud.timestamp) {
                    $file.write({ data: $data({ path: this.tempSyncInfoFile }), path: this.syncInfoFile })
                    $file.write({ data: $data({ path: this.tempDbFile }), path: this.localDb })
                    // image
                    $file.move({ src: this.tempImagePath, dst: this.imagePath })
                    // Update
                    $sqlite.close(this.sqlite)
                    this.sqlite = $sqlite.open(this.localDb)
                    $app.notify({
                        name: "syncByiCloud",
                        object: { status: true }
                    })
                    resolve()
                    return
                }
            }

            try {
                await this.upload(manual)
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    }

    deleteIcloudData() {
        return $file.delete(this.iCloudZipFile)
    }

    parse(result) {
        if (result.error !== null) {
            throw result.error
        }
        const data = []
        while (result.result.next()) {
            data.push({
                uuid: result.result.get("uuid"),
                section: result.result.get("section"),
                text: result.result.get("text"),
                md5: result.result.get("md5"),
                prev: result.result.get("prev") ?? null,
                next: result.result.get("next") ?? null
            })
        }
        result.result.close()
        return data
    }

    beginTransaction() {
        this.sqlite.beginTransaction()
    }

    commit() {
        this.sqlite.commit()
        this.upload()
    }

    rollback() {
        this.sqlite.rollback()
    }

    getByText(text) {
        const result = this.sqlite.query({
            sql: "SELECT *, 'clipboard' AS section FROM clipboard WHERE text = ? UNION SELECT *, 'pin' AS section FROM pin WHERE text = ?",
            args: [text, text]
        })
        return this.parse(result)[0]
    }

    getByUUID(uuid) {
        const result = this.sqlite.query({
            sql: "SELECT *, 'clipboard' AS section FROM clipboard a WHERE uuid = ? UNION SELECT *, 'pin' AS section FROM pin a WHERE uuid = ?",
            args: [uuid, uuid]
        })
        return this.parse(result)[0]
    }

    getByMD5(md5) {
        const result = this.sqlite.query({
            sql: "SELECT *, 'clipboard' AS section FROM clipboard WHERE md5 = ? UNION SELECT *, 'pin' AS section FROM pin WHERE md5 = ?",
            args: [md5, md5]
        })
        return this.parse(result)[0]
    }

    search(kw) {
        const result = this.sqlite.query({
            sql: "SELECT *, 'clipboard' AS section FROM clipboard WHERE text like ? UNION SELECT *, 'pin' AS section FROM pin WHERE text like ?",
            args: [`%${kw}%`, `%${kw}%`]
        })
        return this.parse(result)
    }

    pathToKey(path) {
        path = JSON.stringify(path)
        return `@image=${path}`
    }

    keyToPath(key) {
        if (key.startsWith("@image=")) {
            return JSON.parse(key.slice(7))
        }
        return false
    }

    _all(table) {
        const result = this.sqlite.query(`SELECT *, '${table}' AS section FROM ${table}`)
        return this.parse(result)
    }
    _insert(table, clipboard) {
        if (clipboard.image) {
            const image = clipboard.image
            const fileName = $text.uuid
            const path = {
                original: `${this.imageOriginalPath}/${fileName}.png`,
                preview: `${this.imagePreviewPath}/${fileName}.jpg`
            }
            $file.write({
                data: image.png,
                path: path.original
            })
            $file.write({
                data: compressImage(image).jpg(0.8),
                path: path.preview
            })
            clipboard.text = this.pathToKey(path)
        }
        const result = this.sqlite.update({
            sql: `INSERT INTO ${table} (uuid, text, md5, prev, next) values (?, ?, ?, ?, ?)`,
            args: [clipboard.uuid, clipboard.text, $text.MD5(clipboard.text), clipboard.prev, clipboard.next]
        })
        if (result.result) {
            this.upload()
        } else {
            throw result.error
        }
    }
    _update(table, clipboard) {
        if (Object.keys(clipboard).length !== 4 || typeof clipboard.uuid !== "string") return
        const result = this.sqlite.update({
            sql: `UPDATE ${table} SET text = ?, md5 = ?, prev = ?, next = ? WHERE uuid = ?`,
            args: [clipboard.text, $text.MD5(clipboard.text), clipboard.prev, clipboard.next, clipboard.uuid]
        })
        if (result.result) {
            this.upload()
        } else {
            throw result.error
        }
    }
    _updateText(table, uuid, text) {
        if (typeof uuid !== "string") return
        const result = this.sqlite.update({
            sql: `UPDATE ${table} SET text = ?, md5 = ? WHERE uuid = ?`,
            args: [text, $text.MD5(text), uuid]
        })
        if (result.result) {
            this.upload()
        } else {
            throw result.error
        }
    }
    _delete(table, uuid) {
        const clipboard = this.getByUUID(uuid)
        const result = this.sqlite.update({
            sql: `DELETE FROM ${table} WHERE uuid = ?`,
            args: [uuid]
        })
        // delete image file
        const path = this.keyToPath(clipboard.text)
        if (path) {
            $file.delete(path.original)
            $file.delete(path.preview)
        }
        if (result.result) {
            this.upload()
        } else {
            throw result.error
        }
    }

    all() {
        return this._all("clipboard")
    }
    insert(clipboard) {
        return this._insert("clipboard", clipboard)
    }
    update(clipboard) {
        return this._update("clipboard", clipboard)
    }
    updateText(uuid, text) {
        return this._updateText("clipboard", uuid, text)
    }
    delete(uuid) {
        return this._delete("clipboard", uuid)
    }

    allPin() {
        return this._all("pin")
    }
    insertPin(clipboard) {
        return this._insert("pin", clipboard)
    }
    updatePin(clipboard) {
        return this._update("pin", clipboard)
    }
    updateTextPin(uuid, text) {
        return this._updateText("pin", uuid, text)
    }
    deletePin(uuid) {
        return this._delete("pin", uuid)
    }
}

module.exports = Storage