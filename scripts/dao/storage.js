const { Kernel } = require("../libs/easy-jsbox")
const WebDavSyncClip = require("./webdav-sync-clip")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class Storage {
    sqlite

    /**
     *
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel

        // 路径基于 this.kernel.fileStorage
        this.dbName = "CAIO.db"
        this.localDb = `/${this.dbName}`

        const imageBasePath = `/image`
        this.imagePath = {
            base: imageBasePath,
            original: `${imageBasePath}/original`,
            preview: `${imageBasePath}/preview`
        }

        this.tempPath = `/temp`
        this.tempDbFile = `${this.tempPath}/${this.dbName}`
        this.tempImagePath = `${this.tempPath}/image`

        this.exportFileName = "CAIO.zip"

        this.initWebdavSync()
        this.init()
    }

    async initWebdavSync() {
        if (!this.kernel.setting.get("webdav.status")) return

        try {
            this.webdavSync = new WebDavSyncClip({
                kernel: this.kernel,
                host: this.kernel.setting.get("webdav.host"),
                user: this.kernel.setting.get("webdav.user"),
                password: this.kernel.setting.get("webdav.password"),
                basepath: this.kernel.setting.get("webdav.basepath")
            })
            await this.webdavSync.init()
        } catch (error) {
            this.kernel.error(error)
            throw error
        }
    }

    needUpload() {
        if (!this.kernel.setting.get("webdav.status")) return
        this.webdavSync.upload()
    }

    sync() {
        if (!this.kernel.setting.get("webdav.status")) return false
        this.webdavSync.sync()
        return true
    }

    init() {
        if (this.sqlite) this.sqlite.close()
        // 初始化表
        this.sqlite = $sqlite.open(this.kernel.fileStorage.filePath(this.localDb))
        this.sqlite.update(
            "CREATE TABLE IF NOT EXISTS clips(uuid TEXT PRIMARY KEY NOT NULL, text TEXT, md5 TEXT, prev TEXT, next TEXT)"
        )
        this.sqlite.update(
            "CREATE TABLE IF NOT EXISTS favorite(uuid TEXT PRIMARY KEY NOT NULL, text TEXT, md5 TEXT, prev TEXT, next TEXT)"
        )
        this.sqlite.update("CREATE TABLE IF NOT EXISTS tag(uuid TEXT PRIMARY KEY NOT NULL, tag TEXT)")
    }

    rebuild() {
        const db = this.tempPath + "/rebuild.db"
        this.kernel.fileStorage.delete(db)
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

        ;["clips", "favorite"].map(folder => {
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

        this.kernel.fileStorage.copy(db, this.localDb)
        this.needUpload()
    }

    deleteAllData() {
        this.kernel.fileStorage.delete(this.imagePath.base)
        this.kernel.fileStorage.delete(this.localDb)
        this.needUpload()
    }

    clearTemp() {
        this.kernel.fileStorage.delete(this.tempPath)
    }

    async export(callback) {
        this.clearTemp()
        this.kernel.fileStorage.copy(this.localDb, this.tempDbFile)
        this.kernel.fileStorage.copy(this.imagePath.base, this.tempImagePath)
        const exportFile = this.tempPath + "/" + this.exportFileName
        await $archiver.zip({
            directory: this.kernel.fileStorage.filePath(this.tempPath),
            dest: this.kernel.fileStorage.filePath(exportFile)
        })
        $share.sheet({
            items: [
                {
                    name: this.exportFileName,
                    data: $data({ path: this.kernel.fileStorage.filePath(exportFile) })
                }
            ],
            handler: success => {
                this.kernel.fileStorage.delete(exportFile)
                callback(success)
            }
        })
    }

    async import(data) {
        if (data.fileName.slice(-2) === "db") {
            if (!this.kernel.fileStorage.writeSync(this.localDb, data)) {
                throw new Error("WRITE_DB_FILE_FAILED")
            }
        } else if (data.fileName.slice(-3) === "zip") {
            if (!(await $archiver.unzip({ file: data, dest: this.kernel.fileStorage.filePath(this.tempPath) }))) {
                throw new Error("UNZIP_FAILED")
            }
            this.kernel.fileStorage.move(this.tempDbFile, this.localDb)
            // image
            this.kernel.fileStorage.move(this.tempImagePath, this.imagePath.base)
        }
        this.webdavSync.updateLocalTimestamp()
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

    parse(execRes) {
        const result = execRes.result
        const error = execRes.error
        if (error !== null) {
            throw new Error(`Code [${error.code}] ${error.domain} ${error.localizedDescription}`)
        }
        const data = []
        while (result.next()) {
            data.push({
                uuid: result.get("uuid"),
                section: result.get("section"),
                text: result.get("text"),
                md5: result.get("md5"),
                tag: result.get("tag") ?? "",
                prev: result.get("prev") ?? null,
                next: result.get("next") ?? null
            })
        }
        result.close()
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
        uuid = uuid.replace("'", "")
        const result = this.sqlite.query({
            sql: `
                SELECT *, 'clips' AS section FROM clips WHERE uuid = '${uuid}'
                UNION
                SELECT *, 'favorite' AS section FROM favorite WHERE uuid = '${uuid}'
            `
            // args: [uuid, uuid]
        })
        return this.parse(result)[0]
    }
    getByMD5(md5) {
        md5 = md5.replace("'", "")
        const result = this.sqlite.query({
            sql: `
                SELECT *, 'clips' AS section FROM clips WHERE md5 = '${md5}'
                UNION
                SELECT *, 'favorite' AS section FROM favorite WHERE md5 = '${md5}'
            `
            // args: [md5, md5]
        })
        return this.parse(result)[0]
    }
    search(kw) {
        const result = this.sqlite.query({
            sql: `SELECT * from
                (SELECT clips.*, 'clips' AS section FROM clips WHERE text like ?
                UNION
                SELECT favorite.*, 'favorite' AS section FROM favorite WHERE text like ?) a
                LEFT JOIN tag ON a.uuid = tag.uuid
            `,
            args: [`%${kw}%`, `%${kw}%`]
        })
        return this.parse(result)
    }

    isImage(text) {
        return text?.startsWith("@image=")
    }
    pathToKey(path) {
        path = JSON.stringify(path)
        return `@image=${path}`
    }
    keyToPath(key, fileStoragePath = true) {
        if (this.isImage(key)) {
            const image = JSON.parse(key.slice(7))
            if (fileStoragePath) {
                return image
            }
            image.original = this.kernel.fileStorage.basePath + image.original
            image.preview = this.kernel.fileStorage.basePath + image.preview
            return image
        }
        return false
    }

    deleteTable(table) {
        const result = this.sqlite.update(`DELETE FROM ${table}`)
        if (!result.result) {
            throw result.error
        }
        this.needUpload()
    }

    all(table) {
        const result = this.sqlite.query(
            `SELECT ${table}.*, tag, '${table}' AS section FROM ${table} LEFT JOIN tag ON ${table}.uuid = tag.uuid`
        )
        return this.parse(result)
    }
    insert(table, clip) {
        if (clip.image) {
            const image = clip.image
            const fileName = $text.uuid
            const path = {
                original: `${this.imagePath.original}/${fileName}.png`,
                preview: `${this.imagePath.preview}/${fileName}.jpg`
            }
            this.kernel.fileStorage.write(path.original, image.png)
            this.kernel.fileStorage.write(path.preview, Kernel.compressImage(image).jpg(0.8))
            clip.text = this.pathToKey(path)
        }
        const result = this.sqlite.update({
            sql: `INSERT INTO ${table} (uuid, text, md5, prev, next) values (?, ?, ?, ?, ?)`,
            args: [clip.uuid, clip.text, $text.MD5(clip.text), clip.prev, clip.next]
        })
        if (!result.result) {
            throw result.error
        }
        this.needUpload()
    }
    update(table, clip) {
        if (Object.keys(clip).length < 4 || typeof clip.uuid !== "string") return
        const result = this.sqlite.update({
            sql: `UPDATE ${table} SET text = ?, md5 = ?, prev = ?, next = ? WHERE uuid = ?`,
            args: [clip.text, $text.MD5(clip.text), clip.prev, clip.next, clip.uuid]
        })
        if (!result.result) {
            throw result.error
        }
        this.needUpload()
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
        this.needUpload()
    }
    delete(table, uuid) {
        const clip = this.getByUUID(uuid)
        const result = this.sqlite.update({
            sql: `DELETE FROM ${table} WHERE uuid = ?`,
            args: [uuid]
        })
        if (!result.result) {
            throw result.error
        }

        // delete image file
        const path = this.keyToPath(clip?.text)
        if (path) {
            this.kernel.fileStorage.delete(path.original)
            this.kernel.fileStorage.delete(path.preview)
        }
        this.needUpload()
    }
    isEmpty() {
        const result = this.sqlite.query(`SELECT * FROM clips favorite limit 1`)
        return this.parse(result).length === 0
    }
    allImageFromDb(sortByImage = true) {
        const result = this.sqlite.query(`SELECT * FROM clips favorite WHERE text like "@image=%"`)
        const images = this.parse(result)?.map(item => {
            let path = this.keyToPath(item.text)
            path.preview = path.preview.replace(this.imagePath.preview, "")
            if (path.preview.startsWith("/")) {
                path.preview = path.preview.substring(1)
            }

            path.original = path.original.replace(this.imagePath.original, "")
            if (path.original.startsWith("/")) {
                path.original = path.original.substring(1)
            }
            return path
        })
        const original = [],
            preview = []
        if (!sortByImage) {
            // 图片单独分到 original 和 preview
            images.forEach(i => {
                original.push(i.original)
                preview.push(i.preview)
            })
        }
        return !sortByImage ? { original, preview } : images
    }
    localImagesFromFile() {
        const original = this.kernel.fileStorage.readSync(this.kernel.storage.imagePath.original)
        const preview = this.kernel.fileStorage.readSync(this.kernel.storage.imagePath.preview)
        return { original, preview }
    }

    setTag(uuid, tag) {
        const result = this.sqlite.update({
            sql: `INSERT OR REPLACE INTO tag (uuid, tag) values (?, ?)`,
            args: [uuid, tag]
        })
        if (!result.result) {
            throw result.error
        }
        this.needUpload()
    }
    deleteTag(uuid) {
        const tagResult = this.sqlite.update({
            sql: `DELETE FROM tag WHERE uuid = ?`,
            args: [uuid]
        })
        if (!tagResult.result) {
            throw tagResult.error
        }
        this.needUpload()
    }
}

module.exports = Storage
