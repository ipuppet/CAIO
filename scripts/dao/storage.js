const { Kernel } = require("../libs/easy-jsbox")
const WebDavSyncClip = require("./webdav-sync-clip")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 * @typedef {import("../libs/easy-jsbox").FileStorage} FileStorage
 */

class Clip {
    /**
     * @type {FileStorage}
     */
    fileStorage
    fsPath
    imagePath
    #text

    static isImage(text = "") {
        return text?.startsWith("@image=")
    }
    static pathToKey(path) {
        path = JSON.stringify(path)
        return `@image=${path}`
    }
    static keyToPath(key) {
        if (Clip.isImage(key)) {
            const image = JSON.parse(key.slice(7))
            return image
        }
        return false
    }

    constructor({ uuid, section, text = "", md5, tag = null, prev = null, next = null } = {}) {
        if (!uuid) {
            throw new Error("Clip create faild: uuid undefined")
        }
        if (!section) {
            throw new Error("Clip create faild: section undefined")
        }
        this.uuid = uuid
        this.section = section
        this.text = text
        this.md5 = md5 ?? $text.MD5(this.text)
        this.tag = tag
        this.prev = prev
        this.next = next
    }

    get text() {
        return this.#text
    }
    set text(text) {
        this.#text = text
        if (Clip.isImage(text)) {
            this.#setFsPath(Clip.keyToPath(text))
        }
    }

    get hasTag() {
        return this.tag !== null
    }

    /**
     * @type {boolean}
     */
    get image() {
        return Clip.isImage(this.text)
    }

    get imageOriginal() {
        return this.#getImage("original")
    }
    get imagePreview() {
        return this.#getImage("preview")
    }

    #getImage(type) {
        if (this.image) {
            if (this.fileStorage.exists(this.fsPath[type])) {
                return this.fileStorage.readSync(this.fsPath[type])
            }
        }
    }

    #setFsPath(path) {
        if (!this.fileStorage) return
        this.fsPath = path
        this.imagePath = {
            original: this.fileStorage.filePath(path.original),
            preview: this.fileStorage.filePath(path.preview)
        }
    }
}

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
            this.kernel.error(`${error}\n${error.stack}`)
            throw error
        }
    }

    needUpload() {
        if (!this.kernel.setting.get("webdav.status")) return
        this.webdavSync.needUpload()
    }

    sync() {
        if (!this.kernel.setting.get("webdav.status")) return
        this.webdavSync.sync()
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

        this.kernel.print("init database")
    }

    rebuild() {
        const db = this.tempPath + "/rebuild.db"
        this.kernel.fileStorage.delete(db)
        const storage = new Storage(this.kernel)
        storage.localDb = db
        storage.init()

        const action = (data, folder) => {
            const rebuildData = []
            data.forEach(clip => {
                const data = new Clip({
                    uuid: clip.uuid,
                    text: clip.text,
                    section: clip.section,
                    md5: clip.md5,
                    tag: clip.tag,
                    prev: null,
                    next: rebuildData[0]?.uuid ?? null
                })
                storage.beginTransaction()
                try {
                    storage.insert(data)
                    if (data.next) {
                        // 更改指针
                        rebuildData[0].prev = data.uuid
                        rebuildData[0].section = folder
                        storage.update(rebuildData[0])
                    }
                    storage.commit()
                    rebuildData.unshift(data)
                } catch (error) {
                    storage.rollback()
                    this.kernel.error(`${error}\n${error.stack}`)
                    throw error
                }
            })
        }

        ;["clips", "favorite"].map(folder => {
            let data = this.all(folder)
            try {
                const sorted = this.sort(data)
                if (sorted.length > data.length) {
                    throw new Error()
                }
                data = sorted.reverse()
            } catch {}
            action(data, folder)
        })

        // tag
        const tagQuery = this.sqlite.query(`SELECT * FROM tag`)
        this.parseTag(tagQuery).forEach(clip => {
            storage.beginTransaction()
            try {
                storage.setTag(clip.uuid, clip.tag)
                storage.commit()
            } catch (error) {
                storage.rollback()
                this.kernel.error(`${error}\n${error.stack}`)
                throw error
            }
        })

        this.kernel.fileStorage.copy(db, this.localDb)
        this.needUpload()

        this.kernel.print("database rebuild")
    }

    deleteAllData() {
        this.kernel.fileStorage.delete(this.imagePath.base)
        this.kernel.fileStorage.delete(this.localDb)
        this.needUpload()
        this.kernel.print("delete all database")
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
        if (this.webdavSync) this.webdavSync.updateLocalTimestamp()
    }

    /**
     *
     * @param {Clip[]} data
     * @param {number} maxLoop
     * @returns {Clip[]}
     */
    sort(data, maxLoop = 9000) {
        const dataObj = {}
        let length = 0
        let header = null
        data.forEach(clip => {
            // 构建结构
            dataObj[clip.uuid] = clip
            // 寻找头节点
            if (clip.prev === null) {
                header = clip.uuid
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
        const data = []
        try {
            if (error !== null) {
                throw new Error(`Code [${error.code}] ${error.domain} ${error.localizedDescription}`)
            }
            while (result.next()) {
                const text = result.get("text")
                const clip = new Clip({
                    uuid: result.get("uuid"),
                    section: result.get("section"),
                    md5: result.get("md5"),
                    tag: result.get("tag"),
                    prev: result.get("prev"),
                    next: result.get("next")
                })
                if (Clip.isImage(text)) {
                    clip.fileStorage = this.kernel.fileStorage
                }
                clip.text = text
                data.push(clip)
            }
        } catch (error) {
            throw error
        } finally {
            result.close()
        }
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

    getByUUID(uuid = "") {
        uuid = uuid.replaceAll("'", "")
        // TODO: 占位符导致大概率查询无结果
        const result = this.sqlite.query({
            sql: `
                SELECT a.*, tag from
                (SELECT *, 'clips' AS section FROM clips WHERE uuid = '${uuid}'
                UNION
                SELECT *, 'favorite' AS section FROM favorite WHERE uuid = '${uuid}') a
                LEFT JOIN tag ON a.uuid = tag.uuid
            `
            // args: [uuid, uuid]
        })
        return this.parse(result)[0]
    }
    getByMD5(md5 = "") {
        md5 = md5.replaceAll("'", "")
        const result = this.sqlite.query({
            sql: `
                SELECT a.*, tag from
                (SELECT *, 'clips' AS section FROM clips WHERE md5 = '${md5}'
                UNION
                SELECT *, 'favorite' AS section FROM favorite WHERE md5 = '${md5}') a
                LEFT JOIN tag ON a.uuid = tag.uuid
            `
            // args: [md5, md5]
        })
        return this.parse(result)[0]
    }
    async search(kw) {
        const kwArr = await $text.tokenize({ text: kw })
        const searchStr = `%${kwArr.join("%")}%`.replaceAll(`\\`, `\\\\`).replaceAll(`"`, `\"`)
        // TODO: 占位符导致大概率查询无结果
        const result = this.sqlite.query({
            sql: `
                SELECT a.*, tag from
                (SELECT *, 'clips' AS section FROM clips WHERE text like "${searchStr}"
                UNION
                SELECT *, 'favorite' AS section FROM favorite WHERE text like "${searchStr}") a
                LEFT JOIN tag ON a.uuid = tag.uuid
            `
            // args: [searchStr, searchStr]
        })
        const res = { result: this.parse(result), keyword: kwArr }
        return res
    }
    searchByTag(tag) {
        if (tag.startsWith("#")) tag = tag.substring(1)
        const tagResult = this.sqlite.query({
            sql: `SELECT * FROM tag WHERE tag like ?`,
            args: [`%${tag}%`]
        })
        const tags = this.parseTag(tagResult)
        const result = []
        tags.forEach(tag => {
            result.push(this.getByUUID(tag.uuid))
        })

        return { result, keyword: [tag] }
    }

    deleteTable(table) {
        const result = this.sqlite.update(`DELETE FROM ${table}`)
        if (!result.result) {
            throw result.error
        }
        this.needUpload()
        this.kernel.print(`delete table ${table}`)
    }

    all(table) {
        const result = this.sqlite.query(
            `SELECT ${table}.*, tag, '${table}' AS section FROM ${table} LEFT JOIN tag ON ${table}.uuid = tag.uuid`
        )
        return this.parse(result)
    }
    saveImage(image) {
        if (typeof image === "object") {
            const fileName = $text.uuid
            const path = {
                original: `${this.imagePath.original}/${fileName}.png`,
                preview: `${this.imagePath.preview}/${fileName}.jpg`
            }
            this.kernel.fileStorage.write(path.original, image.png)
            this.kernel.fileStorage.write(path.preview, Kernel.compressImage(image).jpg(0.8))
            return Clip.pathToKey(path)
        }
        throw new Error("saveImageError: image not an object")
    }
    insert(clip) {
        const result = this.sqlite.update({
            sql: `INSERT INTO ${clip.section} (uuid, text, md5, prev, next) values (?, ?, ?, ?, ?)`,
            args: [clip.uuid, clip.text, $text.MD5(clip.text), clip.prev, clip.next]
        })
        if (!result.result) {
            throw result.error
        }
        this.needUpload()
    }
    update(clip) {
        if (Object.keys(clip).length < 4 || typeof clip.uuid !== "string") return
        const result = this.sqlite.update({
            sql: `UPDATE ${clip.section} SET text = ?, md5 = ?, prev = ?, next = ? WHERE uuid = ?`,
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
    delete(table, uuid, deleteOther = true) {
        const clip = this.getByUUID(uuid)
        const result = this.sqlite.update({
            sql: `DELETE FROM ${table} WHERE uuid = ?`,
            args: [uuid]
        })
        if (!result.result) {
            throw result.error
        }

        if (deleteOther) {
            this.deleteTag(uuid)
            if (clip?.image) {
                // delete image file
                this.kernel.fileStorage.delete(clip.fsPath.original)
                this.kernel.fileStorage.delete(clip.fsPath.preview)
            }
        }
        this.needUpload()
    }
    isEmpty() {
        const clipsResult = this.sqlite.query(`SELECT * FROM clips limit 1`).result
        const favoriteResult = this.sqlite.query(`SELECT * FROM favorite limit 1`).result
        clipsResult.next()
        favoriteResult.next()
        return clipsResult.isNull(0) && favoriteResult.isNull(0)
    }
    allImageFromDb(sortByImage = true) {
        const result = this.sqlite.query(`
            SELECT a.* from
            (SELECT *, 'clips' AS section FROM clips WHERE text like "@image=%"
            UNION
            SELECT *, 'favorite' AS section FROM favorite WHERE text like "@image=%") a
            LEFT JOIN tag ON a.uuid = tag.uuid
        `)
        const images = this.parse(result)?.map(clip => {
            if (clip.image) {
                const path = clip.fsPath
                path.preview = path.preview.replace(this.imagePath.preview, "")
                if (path.preview.startsWith("/")) {
                    path.preview = path.preview.substring(1)
                }

                path.original = path.original.replace(this.imagePath.original, "")
                if (path.original.startsWith("/")) {
                    path.original = path.original.substring(1)
                }
                return path
            }
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

    /**
     *
     * @param {string} uuid Clip.uuid
     * @param {string} tag
     */
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

module.exports = { Clip, Storage }
