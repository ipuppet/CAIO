const { UIKit } = require("../libs/easy-jsbox")
const { Clip } = require("./storage")

/**
 * @typedef {import("../app-main").AppKernel} AppKernel
 * @typedef {import("../app-lite").AppKernel} AppKernelLite
 * @typedef {import("./storage").Clip} Clip
 */

function array2object(array) {
    const map = {}
    array.forEach((item, i) => {
        map[item] = i
    })
    return map
}

class ClipsData {
    /**
     * @type {AppKernel|AppKernelLite}
     */
    kernel

    pasteboard = $objc("UIPasteboard").$generalPasteboard()

    #allClips = []
    clipsUUIDMap = {}

    rememberTabIndex = true
    #tabIndex = 0 // use when rememberTabIndex = false
    tabItems = [$l10n("FAVORITE"), $l10n("CLIPS")]
    tabItemsIndex = ["favorite", "clips"] // 获取索引对应的表名
    tabItemsMap = array2object(this.tabItemsIndex) // 获取表名对应的索引

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
    }

    get tabIndex() {
        if (this.rememberTabIndex) {
            return $cache.get("caio.main.tab.index") ?? 0
        } else {
            return this.#tabIndex
        }
    }
    set tabIndex(index) {
        if (this.rememberTabIndex) {
            $cache.set("caio.main.tab.index", index)
        } else {
            this.#tabIndex = index
        }
    }

    get table() {
        return this.tabItemsIndex[this.tabIndex]
    }

    get tableL10n() {
        return this.tabItems[this.tabIndex]
    }

    get allClips() {
        this.tabItemsIndex.forEach((table, tabIndex) => {
            if (!this.#allClips[tabIndex]) {
                this.#allClips[tabIndex] = this.#initData(table)
            }
        })
        return this.#allClips
    }

    /**
     * @type {Clip[]}
     */
    get clips() {
        if (!this.#allClips[this.tabIndex]) {
            this.#allClips[this.tabIndex] = this.#initData(this.table)
        }
        return this.#allClips[this.tabIndex]
    }

    get isPasteboardChanged() {
        const changeCount = this.pasteboard.$changeCount()
        const cache = $cache.get("clipboard.changeCount")
        if (cache === changeCount) {
            return false
        }

        $cache.set("clipboard.changeCount", changeCount)

        return true
    }

    get needReload() {
        return $cache.get("caio.needReload") ?? false
    }
    set needReload(needReload) {
        $cache.get("caio.needReload", needReload)
    }

    /**
     *
     * @param {string} table
     * @returns {Clip[]}
     */
    #initData(table) {
        try {
            const data = this.kernel.storage.all(table)
            const sorted = this.kernel.storage.sort(data, this.kernel.setting.get("clipboard.maxItemLength"))
            sorted.forEach((data, i) => {
                this.clipsUUIDMap[data.uuid] = { tab: table, index: i }
            })
            this.kernel.logger.info(`init clip-data: ${this.table}`)
            return this.#clipProxy(sorted)
        } catch (error) {
            this.kernel.logger.error(error)
            this.rebuildDatabase()
        }
    }

    /**
     *
     * @param {Clip[]} clips
     * @returns
     */
    #clipProxy(clips) {
        return new Proxy(clips ?? [], {
            set: (target, key, value) => {
                return Reflect.set(target, key, value)
            },
            get: (target, key) => {
                return Reflect.get(target, key)
            }
        })
    }

    rebuildDatabase() {
        $ui.alert({
            title: $l10n("REBUILD_DATABASE"),
            message: $l10n("CLIPS_STRUCTURE_ERROR"),
            actions: [
                {
                    title: $l10n("OK"),
                    handler: () => {
                        const loading = UIKit.loading()
                        loading.start()
                        this.kernel.storage.rebuild()
                        loading.end()
                        $delay(0.8, () => $addin.restart())
                    }
                },
                { title: $l10n("CANCEL") }
            ]
        })
    }

    setNeedReload(table) {
        if (table) {
            this.#allClips[this.tabItemsMap[table]] = null
        } else {
            this.#allClips = []
        }
        this.needReload = true
        this.kernel.logger.info(`set need reload: ${table ?? "all"}`)
    }

    getClipCopy(src, assign = {}) {
        if (!src.uuid) return src
        const clip = new Clip(src)
        clip.fileStorage = src.fileStorage
        Object.assign(clip, assign)
        return clip
    }

    /**
     * @param {string} uuid
     * @returns {number}
     */
    getIndexByUUID(uuid) {
        return this.clipsUUIDMap[uuid]?.index ?? -1
    }

    /**
     *
     * @param {string} uuid
     * @returns
     */
    getClip(uuid) {
        const clip = this.clips[this.getIndexByUUID(uuid)]
        if (clip) return clip
        return this.kernel.storage.getByUUID(uuid)
    }

    exists(text) {
        try {
            const result = this.kernel.storage.getByText(text)
            return result !== undefined
        } catch {
            return false
        }
    }

    setClipboardText(text) {
        if (this.kernel.setting.get("clipboard.universal")) {
            $clipboard.text = text
        } else {
            $clipboard.setTextLocalOnly(text)
        }
    }

    addItem(item) {
        if (this.exists(item)) throw new Error("Item already exists")
        // 元数据
        const clip = new Clip({
            uuid: $text.uuid,
            section: this.table,
            prev: null,
            next: this.clips[0] ? this.clips[0].uuid : null
        })
        if (typeof item === "string") {
            if (item.trim() === "") return
            clip.text = item
        } else if (typeof item === "object") {
            clip.fileStorage = this.kernel.fileStorage
            clip.text = this.kernel.storage.saveImage(item)
        } else {
            return
        }

        try {
            // 写入数据库
            this.kernel.storage.beginTransaction()
            this.kernel.storage.insert(clip)
            if (clip.next) {
                // 更改指针
                this.clips[0].prev = clip.uuid
                this.kernel.storage.update(this.clips[0])
            }
            this.kernel.storage.commit()

            // 保存到内存中
            this.setNeedReload(this.table)

            return clip
        } catch (error) {
            this.kernel.storage.rollback()
            this.kernel.logger.error(error)
            throw error
        }
    }

    getRecycleBin() {
        return $cache.get("caio.recycleBin") ?? []
    }
    moveToRecycleBin(clip) {
        const recycleBin = this.getRecycleBin()
        recycleBin.push({
            text: clip.text,
            tag: clip.tag
        })
        $cache.set("caio.recycleBin", recycleBin)
    }
    removeFromRecycleBin(index) {
        const recycleBin = this.getRecycleBin()
        recycleBin.splice(index, 1)
        $cache.set("caio.recycleBin", recycleBin)
    }
    clearRecycleBin() {
        $cache.set("caio.recycleBin", [])
    }

    deleteItem(uuid, trueDelete = true) {
        const index = this.getIndexByUUID(uuid)
        const clip = this.clips[index]
        const prev = this.clips[index - 1]
        const next = this.clips[index + 1]

        try {
            // 删除数据库中的值
            this.kernel.storage.beginTransaction()
            this.kernel.storage.delete(this.table, uuid)
            // 更改指针
            if (prev) {
                // prev 的 next 指向被删除元素的 next
                prev.next = clip.next
                this.kernel.storage.update(prev)
            }
            if (next) {
                // next 的 prev 指向被删除元素的 prev
                next.prev = clip.prev
                this.kernel.storage.update(next)
            }
            this.kernel.storage.commit()

            if (trueDelete) {
                this.kernel.storage.deleteTag(uuid)
                if (clip?.image) {
                    // delete image file
                    // 图片不送入回收站
                    this.kernel.fileStorage.delete(clip.fsPath.original)
                    this.kernel.fileStorage.delete(clip.fsPath.preview)
                } else {
                    // RecycleBin
                    this.moveToRecycleBin(clip)
                }
            }

            this.setNeedReload(this.table)
        } catch (error) {
            this.kernel.storage.rollback()
            this.kernel.logger.error(error)
            throw error
        }
    }

    updateItem(text, uuid) {
        const clip = this.getClip(uuid)

        // 更新内存数据
        const oldData = clip.text
        Object.assign(clip, { text })

        try {
            this.kernel.storage.updateText(this.table, clip.uuid, text)
            this.kernel.logger.info(`data changed at index [${this.getIndexByUUID(uuid)}]\n${oldData}\n↓\n${text}`)
        } catch (error) {
            this.kernel.logger.error(error)
            throw error
        }
    }

    /**
     * 将from位置的元素移动到to位置
     * @param {number} from
     * @param {number} to
     */
    moveItem(from, to) {
        if (from === to) return
        if (this.clips.length === 1) return
        if (from < to) to++ // 若向下移动则 to 增加 1，因为代码为移动到 to 位置的上面

        if (!this.clips[to]) {
            // 补位元素
            this.clips[to] = {
                uuid: null,
                text: "",
                hasTag: false,
                image: null,
                next: null,
                prev: this.clips[to - 1].uuid
            }
        }

        try {
            this.kernel.storage.beginTransaction() // 开启事务

            // 保存上下文环境，from 上下的元素可能是 to
            const oldFromItem = this.getClipCopy(this.clips[from])
            const oldToItem = this.getClipCopy(this.clips[to])

            /**
             * 修改将被删除元素前后元素指针
             */
            if (this.clips[from - 1]) {
                // from 位置的上一个元素
                const fromPrevItem = this.getClipCopy(this.clips[from - 1], { next: this.clips[from].next })
                this.kernel.storage.update(fromPrevItem)
                this.clips[from - 1] = fromPrevItem
            }
            if (this.clips[from + 1]) {
                // from 位置的下一个元素
                const fromNextItem = this.getClipCopy(this.clips[from + 1], { prev: this.clips[from].prev })
                this.kernel.storage.update(fromNextItem)
                this.clips[from + 1] = fromNextItem
            }

            /**
             * 在 to 上方插入元素
             */
            if (this.clips[to - 1]) {
                const toPrevItem = this.getClipCopy(
                    this.clips[to - 1], // 原来 to 位置的上一个元素
                    { next: this.clips[from].uuid } // 指向即将被移动元素的 uuid
                )
                this.kernel.storage.update(toPrevItem)
                this.clips[to - 1] = toPrevItem
            }

            const toItem = this.getClipCopy(
                oldToItem, // 原来 to 位置的元素
                {
                    prev: oldFromItem.uuid, // 指向即将被移动的元素
                    next: this.clips[to].next // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                }
            )
            this.kernel.storage.update(toItem)
            const fromItem = this.getClipCopy(
                oldFromItem, // 被移动元素
                {
                    prev: this.clips[to].prev, // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                    next: oldToItem.uuid
                }
            )
            this.kernel.storage.update(fromItem)

            // 提交事务
            this.kernel.storage.commit()
        } catch (error) {
            this.kernel.storage.rollback()
            this.kernel.logger.error(error)
            throw error
        } finally {
            this.setNeedReload(this.table)
        }
    }

    favoriteItem(uuid) {
        const clip = this.getClipCopy(this.getClip(uuid), {
            next: this.allClips[0][0]?.uuid ?? null,
            prev: null,
            section: "favorite"
        })

        try {
            // 写入数据库
            this.kernel.storage.beginTransaction()
            this.kernel.storage.insert(clip)
            if (clip.next) {
                // 更改指针
                this.allClips[0][0].prev = clip.uuid
                this.allClips[0][0].section = "favorite"
                this.kernel.storage.update(this.allClips[0][0])
            }
            this.kernel.storage.commit()

            // 删除原表数据，此处不删除标签和图片
            this.deleteItem(clip.uuid, false)

            this.setNeedReload()
        } catch (error) {
            this.kernel.storage.rollback()
            this.kernel.logger.error(error)
            throw error
        }
    }
}

module.exports = ClipsData
