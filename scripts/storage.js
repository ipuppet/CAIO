class Storage {
    constructor(sync = false) {
        this.sync = sync
        this.dbName = "CAIO.db"
        this.localDb = `/assets/${this.dbName}`
        this.iCloudPath = "drive://CAIO"
        this.iCloudZipFile = `${this.iCloudPath}/CAIO.zip`
        this.syncInfoFile = "/assets/sync.json"
        this.tempPath = "/assets/temp"
        this.tempSyncInfoFile = `${this.tempPath}/sync.json`
        this.tempDbFile = `${this.tempPath}/${this.dbName}`
        this.init()
        if (this.sync) this.syncByiCloud()
    }

    init() {
        // 初始化表
        this.sqlite = $sqlite.open(this.localDb)
        this.sqlite.update("CREATE TABLE IF NOT EXISTS clipboard(uuid TEXT PRIMARY KEY NOT NULL, text TEXT, md5 TEXT, prev TEXT, next TEXT)")
        // 初始化目录
        if (!$file.exists(this.tempPath)) $file.mkdir(this.tempPath)
        if (!$file.exists(this.iCloudPath)) $file.mkdir(this.iCloudPath)
    }

    backup(callback) {
        $drive.save({
            data: $data({ path: this.localDb }),
            name: this.dbName,
            handler: callback
        })
    }

    recover(data) {
        const result = $file.write({
            data: data,
            path: this.localDb
        })
        if (result) this.sqlite = $sqlite.open(this.localDb)
        return result
    }

    upload(manual) {
        if (this.all().length === 0) return
        if (!this.sync && !manual) return
        $cache.set("sync.date", Date.now())
        $file.write({
            data: $data({ string: JSON.stringify({ timestamp: Date.now() }) }),
            path: this.syncInfoFile
        })
        $file.copy({ src: this.syncInfoFile, dst: this.tempSyncInfoFile })
        $file.copy({ src: this.localDb, dst: this.tempDbFile })
        $archiver.zip({ directory: this.tempPath, dest: this.iCloudZipFile })
    }

    async syncByiCloud(manual = false, callback) {
        const data = await $file.download(this.iCloudZipFile)
        if (data !== undefined) {
            const success = await $archiver.unzip({ file: data, dest: this.tempPath })
            if (!success) return
            const syncInfoLocal = $file.exists(this.syncInfoFile) ?
                JSON.parse($file.read(this.syncInfoFile).string) : {}
            const syncInfoIcloud = JSON.parse($file.read(this.tempSyncInfoFile).string)
            if (!syncInfoLocal.timestamp || syncInfoLocal.timestamp < syncInfoIcloud.timestamp) {
                $file.write({ data: $data({ path: this.tempDbFile }), path: this.localDb })
                $file.write({ data: $data({ path: this.tempSyncInfoFile }), path: this.syncInfoFile })
                // Update
                $sqlite.close(this.sqlite)
                this.sqlite = $sqlite.open(this.localDb)
                $app.notify({
                    name: "syncByiCloud",
                    object: { status: true }
                })
            } else {
                this.upload(manual)
            }
        } else this.upload(manual)
        callback()
    }

    parse(result) {
        if (result.error !== null) {
            $console.error(result.error)
            return false
        }
        const data = []
        while (result.result.next()) {
            data.push({
                uuid: result.result.get("uuid"),
                text: result.result.get("text"),
                md5: result.result.get("md5"),
                prev: result.result.get("prev") ?? null,
                next: result.result.get("next") ?? null
            })
        }
        result.result.close()
        return data
    }

    all() {
        const result = this.sqlite.query("SELECT * FROM clipboard")
        return this.parse(result)
    }

    getByText(text) {
        const result = this.sqlite.query({
            sql: "SELECT * FROM clipboard WHERE text = ?",
            args: [`${text}`]
        })
        return this.parse(result)[0]
    }

    getByUUID(uuid) {
        const result = this.sqlite.query({
            sql: "SELECT * FROM clipboard WHERE uuid = ?",
            args: [`${uuid}`]
        })
        return this.parse(result)[0]
    }

    getByMD5(md5) {
        const result = this.sqlite.query({
            sql: "SELECT * FROM clipboard WHERE md5 = ?",
            args: [`${md5}`]
        })
        return this.parse(result)[0]
    }

    search(kw) {
        const result = this.sqlite.query({
            sql: "SELECT * FROM clipboard WHERE text like ?",
            args: [`%${kw}%`]
        })
        return this.parse(result)
    }

    insert(clipboard) {
        const result = this.sqlite.update({
            sql: "INSERT INTO clipboard (uuid, text, md5, prev, next) values(?, ?, ?, ?, ?)",
            args: [clipboard.uuid, clipboard.text, $text.MD5(clipboard.text), clipboard.prev, clipboard.next]
        })
        if (result.result) {
            this.upload()
            return true
        }
        $console.error(result.error)
        return false
    }

    update(clipboard) {
        if (Object.keys(clipboard).length !== 4 || typeof clipboard.uuid !== "string") return
        const result = this.sqlite.update({
            sql: "UPDATE clipboard SET text = ?, md5 = ?, prev = ?, next = ? WHERE uuid = ?",
            args: [clipboard.text, $text.MD5(clipboard.text), clipboard.prev, clipboard.next, clipboard.uuid]
        })
        if (result.result) {
            this.upload()
            return true
        }
        $console.error(result.error)
        return false
    }

    updateText(uuid, text) {
        if (typeof uuid !== "string") return
        const result = this.sqlite.update({
            sql: "UPDATE clipboard SET text = ?, md5 = ? WHERE uuid = ?",
            args: [text, $text.MD5(text), uuid]
        })
        if (result.result) {
            this.upload()
            return true
        }
        $console.error(result.error)
        return false
    }

    delete(uuid) {
        const result = this.sqlite.update({
            sql: "DELETE FROM clipboard WHERE uuid = ?",
            args: [uuid]
        })
        if (result.result) {
            this.upload()
            return true
        }
        $console.error(result.error)
        return false
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
}

module.exports = Storage