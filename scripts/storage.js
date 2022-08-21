const { Kernel } = require("./libs/easy-jsbox")

/**
 * @typedef {import("./app").AppKernel} AppKernel
 */

class Storage {
    /**
     *
     * @param {boolean} sync
     * @param {AppKernel} kernel
     */
    constructor(sync = false, kernel) {
        this.sync = sync
        this.kernel = kernel
        this.dbName = "CAIO.db"
        this.localDb = `${this.kernel.fileStorage.basePath}/${this.dbName}`
        this.syncInfoFile = `${this.kernel.fileStorage.basePath}/sync.json`
        this.imagePath = `${this.kernel.fileStorage.basePath}/image`
        this.imageOriginalPath = `${this.imagePath}/original`
        this.imagePreviewPath = `${this.imagePath}/preview`

        this.icloudPath = "CAIO"
        this.icloudSyncInfoFile = `${this.icloudPath}/sync.json`
        this.icloudDbFile = `${this.icloudPath}/${this.dbName}`
        this.icloudImagePath = `${this.icloudPath}/image`

        this.tempPath = `${this.kernel.fileStorage.basePath}/temp`
        this.tempSyncInfoFile = `${this.tempPath}/sync.json`
        this.tempDbFile = `${this.tempPath}/${this.dbName}`
        this.tempImagePath = `${this.tempPath}/image`

        this.exportFileName = "CAIO.zip"

        this.init()
        if (this.sync) this.syncByIcloud()
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

        // 初始化目录
        const pathList = [this.tempPath, this.imagePath, this.imagePreviewPath, this.imageOriginalPath]

        pathList.forEach(path => {
            if (!$file.exists(path)) {
                $file.mkdir(path)
            }
        })

        if (!$drive.exists(this.icloudPath)) {
            $drive.mkdir(this.icloudPath)
        }
    }

    rebuild() {
        const db = this.tempPath + "/rebuild.db"
        $file.delete(db)
        const storage = new Storage(false, this.kernel)
        storage.localDb = db
        storage.init()

        const action = (data, flag = true) => {
            const rebuildData = []
            data.forEach(item => {
                const data = {
                    uuid: item.uuid,
                    text: item.text,
                    md5: item.md5,
                    image: item.image,
                    prev: null,
                    next: rebuildData[0]?.uuid ?? null
                }
                storage.beginTransaction()
                try {
                    if (flag) {
                        storage.insert(data)
                    } else {
                        storage.insertPin(data)
                    }
                    if (data.next) {
                        // 更改指针
                        rebuildData[0].prev = data.uuid
                        if (flag) {
                            storage.update(rebuildData[0])
                        } else {
                            storage.updatePin(rebuildData[0])
                        }
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

        let data
        try {
            data = this.all()
            const sorted = this.sort(JSON.parse(JSON.stringify(data)))
            if (sorted.length > data.length) {
                throw new Error()
            }
            action(sorted.reverse())
        } catch {
            action(this.all())
        }
        try {
            data = this.allPin()
            const sorted = this.sort(JSON.parse(JSON.stringify(data)))
            if (sorted.length > data.length) {
                throw new Error()
            }
            action(sorted.reverse(), false)
        } catch {
            action(this.allPin(), false)
        }

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
        $file.copy({ src: this.syncInfoFile, dst: this.tempSyncInfoFile })
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
        await this.upload()
    }

    async upload(manual = false) {
        if (!this.sync && !manual) return
        if (this.all().length === 0) return

        const fileWrite = async item => {
            // 加读写锁
            const lock = item.path + ".lock"
            const lockIcloud = item.path + ".lock.icloud"
            const isLocked = $drive.exists(lock)
            const isLockedIcloud = $drive.exists(lockIcloud)
            if (isLocked || isLockedIcloud) {
                // 文件被锁，等待 500ms 重试
                await new Promise(resolve => {
                    setTimeout(() => resolve(), 500)
                })
                await fileWrite(item)
                return
            } else {
                await $drive.write({ data: $data({ string: "" }), path: lock })
                this.kernel.print("file locked: " + item.path)
            }

            try {
                // 清除多余文件
                const dir = item.path.substring(0, item.path.lastIndexOf("/") + 1)
                const file = item.path.substring(item.path.lastIndexOf("/") + 1)
                const filename = file.substring(0, file.lastIndexOf("."))

                for (let icloudFile of $drive.list(dir) ?? []) {
                    if (icloudFile === file || icloudFile.startsWith(filename + " ")) {
                        $drive.delete(dir + icloudFile)
                    }
                    if ($drive.exists(file + ".icloud")) {
                        $drive.delete(dir + file + ".icloud")
                    }
                }

                // 写入文件
                const status = await $drive.write(item)
                if (!status) {
                    throw new Error("FILE_WRITE_ERROR: " + item.path)
                }
            } catch (error) {
                this.kernel.error(error)
                throw error
            } finally {
                // 解除锁
                await $drive.delete(lock)
                this.kernel.print("file unlocked: " + item.path)
            }
        }

        const now = Date.now()

        await fileWrite({
            data: $data({ string: JSON.stringify({ timestamp: now }) }),
            path: this.icloudSyncInfoFile
        })
        await fileWrite({
            data: $data({ path: this.localDb }),
            path: this.icloudDbFile
        })
        if (!$drive.exists(this.icloudImagePath)) {
            $drive.mkdir(this.icloudImagePath)
        }
        await $drive.copy({
            src: this.imagePath,
            dst: this.icloudImagePath
        })

        // 更新同步信息
        await $drive.write({
            data: $data({ string: JSON.stringify({ timestamp: now }) }),
            path: this.syncInfoFile
        })
    }

    async syncByIcloud() {
        if ($drive.exists(this.icloudSyncInfoFile + ".icloud")) {
            await $drive.download(this.icloudSyncInfoFile)
        }
        if (!$drive.exists(this.icloudSyncInfoFile)) {
            await this.upload(true)
            return
        }

        const data = await $drive.read(this.icloudSyncInfoFile)
        const syncInfoICloud = JSON.parse(data.string)
        const syncInfoLocal = $file.exists(this.syncInfoFile) ? JSON.parse($file.read(this.syncInfoFile).string) : {}

        let syncStatus = { status: true }
        try {
            if (!syncInfoLocal.timestamp || syncInfoLocal.timestamp < syncInfoICloud.timestamp) {
                let data = await $drive.download(this.icloudSyncInfoFile)
                await $file.write({
                    data,
                    path: this.syncInfoFile
                })
                data = await $drive.download(this.icloudDbFile)
                await $file.write({
                    data,
                    path: this.localDb
                })
                // image
                await $file.copy({ src: "drive://" + this.icloudImagePath, dst: this.imagePath })
                // Update
                $sqlite.close(this.sqlite)
                this.sqlite = $sqlite.open(this.localDb)
            } else {
                await this.upload(true)
            }
        } catch (error) {
            syncStatus.status = false
            syncStatus.error = error
            throw error
        } finally {
            $app.notify({
                name: "syncByIcloud",
                object: syncStatus
            })
        }
    }

    deleteIcloudData() {
        return (
            $drive.delete(this.icloudSyncInfoFile) &&
            $drive.delete(this.icloudDbFile) &&
            $drive.delete(this.icloudImagePath)
        )
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
    // 分页无法排序
    _page(table, page, size) {
        const result = this.sqlite.query(`SELECT *, '${table}' AS section FROM ${table} LIMIT ${page * size},${size}`)
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
                data: Kernel.compressImage(image).jpg(0.8),
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
        if (Object.keys(clipboard).length < 4 || typeof clipboard.uuid !== "string") return
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
    page(page, size) {
        return this._page("clipboard", page, size)
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
    pagePin(page, size) {
        return this._page("pin", page, size)
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

    getPinByMD5(md5) {
        const result = this.sqlite.query({
            sql: "SELECT * FROM pin WHERE md5 = ?",
            args: [md5]
        })
        return this.parse(result)[0]
    }
}

module.exports = Storage
