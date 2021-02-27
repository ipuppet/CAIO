class Storage {
    constructor(setting) {
        this.setting = setting
        this.localDb = "/assets/CAE.db"
        this.iCloudPath = "drive://CAE/"
        this.iCloudDb = this.iCloudPath + "CAE.db"
        this.iCloudAutoDb = this.iCloudPath + "auto.db"
        this.sqlite = $sqlite.open(this.localDb)
        this.sqlite.update("CREATE TABLE IF NOT EXISTS clipboard(uuid TEXT PRIMARY KEY NOT NULL, text TEXT, prev TEXT, next TEXT)")
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
                prev: result.result.get("prev"),
                next: result.result.get("next")
            })
        }
        // result.result.close()
        return data
    }

    all() {
        const result = this.sqlite.query("SELECT * FROM clipboard")
        return this.parse(result)
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
            sql: "INSERT INTO clipboard (uuid, text, prev, next) values(?, ?, ?, ?)",
            args: [clipboard.uuid, clipboard.text, clipboard.prev, clipboard.next]
        })
        if (result.result) {
            if (this.setting.get("backup.autoBackup")) {
                if (!$file.exists(this.iCloudPath)) {
                    $file.mkdir(this.iCloudPath)
                }
                $file.write({
                    data: $data({ path: this.localDb }),
                    path: this.iCloudAutoDb
                })
            }
            return true
        }
        $console.error(result.error)
        return false
    }

    hasBackup() {
        return $file.exists(this.iCloudDb)
    }

    backupToICloud() {
        if (!$file.exists(this.iCloudPath)) {
            $file.mkdir(this.iCloudPath)
        }
        return $file.write({
            data: $data({ path: this.localDb }),
            path: this.iCloudDb
        })
    }

    recoverFromICloud(data) {
        const result = $file.write({
            data: data,
            path: this.localDb
        })
        if (result) {
            this.sqlite = $sqlite.open(this.localDb)
        }
        return result
    }

    update(clipboard) {
        const result = this.sqlite.update({
            sql: "UPDATE clipboard SET text = ?, prev = ?, next = ? WHERE uuid = ?",
            args: [clipboard.text, clipboard.prev, clipboard.next, clipboard.uuid]
        })
        if (result.result) {
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
            return true
        }
        $console.error(result.error)
        return false
    }
}

module.exports = Storage