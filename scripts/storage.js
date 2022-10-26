const { Kernel } = require("./libs/easy-jsbox")

/**
 * @typedef {import("./app").AppKernel} AppKernel
 */

class Storage {
    /**
     *
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
        this.dbName = "CAIO.db"
        this.localDb = `${this.kernel.fileStorage.basePath}/${this.dbName}`
        this.imagePath = `${this.kernel.fileStorage.basePath}/image`
        this.imageOriginalPath = `${this.imagePath}/original`
        this.imagePreviewPath = `${this.imagePath}/preview`

        this.tempPath = `${this.kernel.fileStorage.basePath}/temp`
        this.tempDbFile = `${this.tempPath}/${this.dbName}`
        this.tempImagePath = `${this.tempPath}/image`

        this.exportFileName = "CAIO.zip"

        this.init()
    }

    init() {
        // 初始化表
        this.sqlite = $sqlite.open(this.localDb)
        this.sqlite.update(
            "CREATE TABLE IF NOT EXISTS clipboard(uuid TEXT PRIMARY KEY NOT NULL, text TEXT, md5 TEXT, prev TEXT, next TEXT)"
        )
        this.sqlite.update(
            "CREATE TABLE IF NOT EXISTS pin(uuid TEXT PRIMARY KEY NOT NULL, text TEXT, md5 TEXT, prev TEXT, next TEXT)"
        )
        this.sqlite.update("CREATE TABLE IF NOT EXISTS tag(uuid TEXT PRIMARY KEY NOT NULL, tag TEXT)")

        // 初始化目录
        const pathList = [this.tempPath, this.imagePath, this.imagePreviewPath, this.imageOriginalPath]

        pathList.forEach(path => {
            if (!$file.exists(path)) {
                $file.mkdir(path)
            }
        })
    }

    rebuild() {
        const db = this.tempPath + "/rebuild.db"
        $file.delete(db)
        const storage = new Storage(this.kernel)
        storage.localDb = db
        storage.init()

        const action = (data, folder) => {
            const rebuildData = []
            data.forEach(item => {
                const data = {
                    uuid: item.uuid,
                    text: item.text,
                    md5: item.md5,
                    tag: item.tag,
                    image: item.image,
                    prev: null,
                    next: rebuildData[0]?.uuid ?? null
                }
                storage.beginTransaction()
                try {
                    storage.insert(folder, data)
                    if (data.next) {
                        // 更改指针
                        rebuildData[0].prev = data.uuid
                        storage.update(folder, rebuildData[0])
                    }
                    storage.commit()
                    rebuildData.unshift(data)
                } catch (error) {
                    storage.rollback()
                    this.kernel.error(error)
                    throw error
                }
            })
        }

        ;["clipboard", "pin"].map(folder => {
            let data = this.all(folder)
            try {
                const sorted = this.sort(JSON.parse(JSON.stringify(data)))
                if (sorted.length > data.length) {
                    throw new Error()
                }
                data = sorted.reverse()
            } catch {}
            action(data, folder)
        })

        // tag
        const tagQuery = this.sqlite.query(`SELECT * FROM tag`)
        this.parseTag(tagQuery).forEach(item => {
            storage.beginTransaction()
            try {
                storage.setTag(item.uuid, item.tag)
                storage.commit()
            } catch (error) {
                storage.rollback()
                this.kernel.error(error)
                throw error
            }
        })

        $file.copy({
            src: db,
            dst: this.localDb
        })
    }

    clearTemp() {
        $file.delete(this.tempPath)
        $file.mkdir(this.tempPath)
    }

    async export(callback) {
        $file.copy({ src: this.localDb, dst: this.tempDbFile })
        $file.copy({ src: this.imagePath, dst: this.tempImagePath })
        const exportFile = this.tempPath + "/" + this.exportFileName
        await $archiver.zip({ directory: this.tempPath, dest: exportFile })
        $share.sheet({
            items: [
                {
                    name: this.exportFileName,
                    data: $data({ path: exportFile })
                }
            ],
            handler: success => {
                $file.delete(exportFile)
                callback(success)
            }
        })
    }

    async import(data) {
        if (data.fileName.slice(-2) === "db") {
            if (!$file.write({ data: data, path: this.localDb })) {
                throw new Error("WRITE_DB_FILE_FAILED")
            }
        } else if (data.fileName.slice(-3) === "zip") {
            if (!(await $archiver.unzip({ file: data, dest: this.tempPath }))) {
                throw new Error("UNZIP_FAILED")
            }
            $file.write({ data: $data({ path: this.tempDbFile }), path: this.localDb })
            // image
            $file.move({ src: this.tempImagePath, dst: this.imagePath })
        }
        $sqlite.close(this.sqlite)
        this.sqlite = $sqlite.open(this.localDb)
    }

    sort(data, maxLoop = 9000) {
        const dataObj = {}
        let length = 0
        let header = null
        data.forEach(item => {
            // 构建结构
            dataObj[item.uuid] = item
            // 寻找头节点
            if (item.prev === null) {
                header = item.uuid
            }
            // 统计长度
            length++
        })
        // 排序
        const sorted = []
        if (length > 0) {
            try {
                let p = dataObj[header]
                while (p.next !== null && maxLoop > 0) {
                    maxLoop--
                    sorted.push(p)
                    p = dataObj[p.next]
                }
                sorted.push(p) // 将最后一个元素推入
            } catch (error) {
                throw "Unable to sort: " + error
            }
        }

        return sorted
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
                tag: result.result.get("tag") ?? "",
                prev: result.result.get("prev") ?? null,
                next: result.result.get("next") ?? null
            })
        }
        result.result.close()
        return data
    }

    parseTag(result) {
        if (result.error !== null) {
            throw result.error
        }
        const data = []
        while (result.result.next()) {
            data.push({
                uuid: result.result.get("uuid"),
                tag: result.result.get("tag")
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
    }
    rollback() {
        this.sqlite.rollback()
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
        if (key?.startsWith("@image=")) {
            return JSON.parse(key.slice(7))
        }
        return false
    }

    all(table) {
        const result = this.sqlite.query(
            `SELECT ${table}.*, tag, '${table}' AS section FROM ${table} LEFT JOIN tag ON ${table}.uuid = tag.uuid`
        )
        return this.parse(result)
    }
    insert(table, clipboard) {
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
                data: Kernel.compressImage(image).jpg(0.8),
                path: path.preview
            })
            clipboard.text = this.pathToKey(path)
        }
        const result = this.sqlite.update({
            sql: `INSERT INTO ${table} (uuid, text, md5, prev, next) values (?, ?, ?, ?, ?)`,
            args: [clipboard.uuid, clipboard.text, $text.MD5(clipboard.text), clipboard.prev, clipboard.next]
        })
        if (!result.result) {
            throw result.error
        }
    }
    update(table, clipboard) {
        if (Object.keys(clipboard).length < 4 || typeof clipboard.uuid !== "string") return
        const result = this.sqlite.update({
            sql: `UPDATE ${table} SET text = ?, md5 = ?, prev = ?, next = ? WHERE uuid = ?`,
            args: [clipboard.text, $text.MD5(clipboard.text), clipboard.prev, clipboard.next, clipboard.uuid]
        })
        if (!result.result) {
            throw result.error
        }
    }
    updateText(table, uuid, text) {
        if (typeof uuid !== "string") return
        const result = this.sqlite.update({
            sql: `UPDATE ${table} SET text = ?, md5 = ? WHERE uuid = ?`,
            args: [text, $text.MD5(text), uuid]
        })
        if (!result.result) {
            throw result.error
        }
    }
    delete(table, uuid) {
        const clipboard = this.getByUUID(uuid)
        this.beginTransaction()
        try {
            const result = this.sqlite.update({
                sql: `DELETE FROM ${table} WHERE uuid = ?`,
                args: [uuid]
            })
            if (!result.result) {
                throw result.error
            }
            this.deleteTag(uuid)
            this.commit()
        } catch (error) {
            this.rollback()
            throw error
        }

        // delete image file
        const path = this.keyToPath(clipboard?.text)
        if (path) {
            $file.delete(path.original)
            $file.delete(path.preview)
        }
    }

    setTag(uuid, tag) {
        const result = this.sqlite.update({
            sql: `INSERT OR REPLACE INTO tag (uuid, tag) values (?, ?)`,
            args: [uuid, tag]
        })
        if (!result.result) {
            throw result.error
        }
    }
    deleteTag(uuid) {
        const tagResult = this.sqlite.update({
            sql: `DELETE FROM tag WHERE uuid = ?`,
            args: [uuid]
        })
        if (!tagResult.result) {
            throw tagResult.error
        }
    }
}

module.exports = Storage
