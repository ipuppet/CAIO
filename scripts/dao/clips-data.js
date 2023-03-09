const { UIKit } = require("../libs/easy-jsbox")
const { Clip } = require("./storage")

/**
 * @typedef {import("../app").AppKernel} AppKernel
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
     * @type {AppKernel}
     */
    kernel

    pasteboard = $objc("UIPasteboard").$generalPasteboard()

    #allClips = []
    clipsUUIDMap = {}
    clipsMD5Map = {} // 键为 md5，用来去重 boolean

    tabItems = [$l10n("FAVORITE"), $l10n("CLIPS")]
    tabItemsIndex = ["favorite", "clips"]
    tabItemsMap = array2object(this.tabItemsIndex)

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
    }

    get tabIndex() {
        return $cache.get("caio.main.tab.index") ?? 0
    }
    set tabIndex(index) {
        $cache.set("caio.main.tab.index", index)
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
                this.kernel.print(`init clips: ${table}`)
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
            this.kernel.print(`init clips: ${this.table}`)
        }
        return this.#allClips[this.tabIndex]
    }

    get isChanged() {
        const changeCount = this.pasteboard.$changeCount()

        const cache = $cache.get("clipboard.changeCount")
        $cache.set("clipboard.changeCount", changeCount)

        if (cache === changeCount) {
            return false
        }

        return true
    }

    /**
     *
     * @param {string} table
     * @returns
     */
    #initData(table) {
        try {
            const data = this.kernel.storage.all(table)
            const sorted = this.kernel.storage.sort(data, this.kernel.setting.get("clipboard.maxItemLength"))
            sorted.forEach((data, i) => {
                this.clipsMD5Map[data.md5] = true
                this.clipsUUIDMap[data.uuid] = { tab: table, index: i }
            })
            return this.#clipProxy(sorted)
        } catch (error) {
            this.kernel.error(error)
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
        this.kernel.print(`set need reload: ${table ?? "all"}`)
    }

    getClipCopy(src, assign = {}) {
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
        return Boolean(this.clipsMD5Map[$text.MD5(text)])
    }

    setClipboardText(text) {
        if (this.kernel.setting.get("clipboard.universal")) {
            $clipboard.text = text
        } else {
            $clipboard.setTextLocalOnly(text)
        }
    }

    addItem(item) {
        // 元数据
        const clip = new Clip({
            uuid: $text.uuid,
            section: this.table,
            md5: null,
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
            throw error
        }
    }

    deleteItem(uuid, deleteOther = true) {
        const index = this.getIndexByUUID(uuid)
        const clip = this.clips[index]
        const prev = this.clips[index - 1]
        const next = this.clips[index + 1]

        try {
            // 删除数据库中的值
            this.kernel.storage.beginTransaction()
            this.kernel.storage.delete(this.table, uuid, deleteOther)
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

            this.setNeedReload(this.table)
        } catch (error) {
            this.kernel.storage.rollback()
            throw error
        }
    }

    updateItem(text, uuid) {
        const md5 = $text.MD5(text)
        const clip = this.getClip(uuid)

        // 更新索引
        delete this.clipsMD5Map[clip.md5]
        this.clipsMD5Map[md5] = true

        // 更新内存数据
        const oldData = clip.text
        Object.assign(clip, { text, md5 })

        try {
            this.kernel.storage.updateText(this.table, clip.uuid, text)
            this.kernel.print(`data changed at index [${this.getIndexByUUID(uuid)}]\n${oldData}\n↓\n${text}`)
        } catch (error) {
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
        if (from < to) to++ // 若向下移动则 to 增加 1，因为代码为移动到 to 位置的上面

        if (!this.clips[to]) {
            // 补位元素
            this.clips[to] = {
                uuid: null,
                text: "",
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
            this.kernel.error(error)
            this.kernel.storage.rollback()
            throw error
        }
    }
}

module.exports = ClipsData
