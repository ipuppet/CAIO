const { UIKit } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class ClipsData {
    /**
     * @type {AppKernel}
     */
    kernel

    pasteboard = $objc("UIPasteboard").$generalPasteboard()

    #allClips = []
    // 键为 md5，值为 1 或 undefined 用来去重
    savedClipboardIndex = {}

    tabItems = [$l10n("FAVORITE"), $l10n("CLIPS")]
    tabItemsIndex = ["favorite", "clips"]

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
    }

    set tabIndex(index) {
        $cache.set("caio.main.tab.index", index)
    }

    get tabIndex() {
        return $cache.get("caio.main.tab.index") ?? 0
    }

    get table() {
        return this.tabItemsIndex[this.tabIndex]
    }

    get tableL10n() {
        return this.tabItems[this.tabIndex]
    }

    get allClips() {
        if (this.#allClips.length === 0) {
            this.loadAllClips()
        }
        return this.#allClips
    }

    set allClips(allClips) {
        this.#allClips = allClips.map(item => {
            return new Proxy(item ?? [], {
                set: (target, key, value) => {
                    return Reflect.set(target, key, value)
                },
                get: (target, key) => {
                    return Reflect.get(target, key)
                }
            })
        })
    }

    get clips() {
        return this.allClips[this.tabIndex]
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

    getCopy(src, assign = {}) {
        const copy = JSON.parse(JSON.stringify(src))
        return Object.assign(copy, assign)
    }

    /**
     * 警告！该方法可能消耗大量资源
     * @param {string} uuid
     */
    getRowByUUID(uuid) {
        let length = this.clips.length
        for (let i = 0; i < length; ++i) {
            if (this.clips[i].uuid === uuid) return i
        }

        return false
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
        const data = {
            uuid: $text.uuid,
            text: item,
            md5: null,
            image: null,
            prev: null,
            next: this.clips[0] ? this.clips[0].uuid : null
        }
        if (typeof item === "string") {
            if (item.trim() === "") return
            data.md5 = $text.MD5(item)
        } else if (typeof item === "object") {
            data.text = ""
            data.image = item
        } else {
            return
        }

        try {
            // 写入数据库
            this.kernel.storage.beginTransaction()
            this.kernel.storage.insert(this.table, data)
            if (data.next) {
                // 更改指针
                this.clips[0].prev = data.uuid
                this.kernel.storage.update(this.table, this.clips[0])
            }
            this.kernel.storage.commit()

            // 保存到内存中
            this.clips.unshift(data)
            this.savedClipboardIndex[$text.MD5(data.text)] = 1

            return data
        } catch (error) {
            this.kernel.storage.rollback()
            throw error
        }
    }

    deleteItem(row, deleteTag = true) {
        const table = this.table
        const item = this.clips[row]
        const prev = this.clips[row - 1]
        const next = this.clips[row + 1]

        try {
            // 删除数据库中的值
            this.kernel.storage.beginTransaction()
            this.kernel.storage.delete(table, item.uuid)
            // 更改指针
            if (prev) {
                // prev 的 next 指向被删除元素的 next
                prev.next = item.next
                this.kernel.storage.update(table, prev)
            }
            if (next) {
                // next 的 prev 指向被删除元素的 prev
                next.prev = item.prev
                this.kernel.storage.update(table, next)
            }

            if (deleteTag) {
                this.kernel.storage.deleteTag(item.uuid)
            }
            this.kernel.storage.commit()

            // update index
            delete this.savedClipboardIndex[item.md5]
            // 删除内存中的值
            this.clips.splice(row, 1)
        } catch (error) {
            this.kernel.storage.rollback()
            throw error
        }
    }

    updateItem(text, row) {
        const md5 = $text.MD5(text)
        const item = this.clips[row]

        // 更新索引
        delete this.savedClipboardIndex[item.md5]
        this.savedClipboardIndex[md5] = 1

        // 更新内存数据
        const oldData = item.text
        Object.assign(item, { text, md5 })

        try {
            this.kernel.storage.updateText(this.table, item.uuid, text)
            this.kernel.print(`data changed at index [${row}]\n${oldData}\n↓\n${text}`)
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

        const table = this.table
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
            const oldFromItem = this.getCopy(this.clips[from])
            const oldToItem = this.getCopy(this.clips[to])

            /**
             * 修改将被删除元素前后元素指针
             */
            if (this.clips[from - 1]) {
                // from 位置的上一个元素
                const fromPrevItem = this.getCopy(this.clips[from - 1], { next: this.clips[from].next })
                this.kernel.storage.update(table, fromPrevItem)
                this.clips[from - 1] = fromPrevItem
            }
            if (this.clips[from + 1]) {
                // from 位置的下一个元素
                const fromNextItem = this.getCopy(this.clips[from + 1], { prev: this.clips[from].prev })
                this.kernel.storage.update(table, fromNextItem)
                this.clips[from + 1] = fromNextItem
            }

            /**
             * 在 to 上方插入元素
             */
            if (this.clips[to - 1]) {
                const toPrevItem = this.getCopy(
                    this.clips[to - 1], // 原来 to 位置的上一个元素
                    { next: this.clips[from].uuid } // 指向即将被移动元素的 uuid
                )
                this.kernel.storage.update(table, toPrevItem)
                this.clips[to - 1] = toPrevItem
            }

            const toItem = this.getCopy(
                oldToItem, // 原来 to 位置的元素
                {
                    prev: oldFromItem.uuid, // 指向即将被移动的元素
                    next: this.clips[to].next // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                }
            )
            this.kernel.storage.update(table, toItem)
            const fromItem = this.getCopy(
                oldFromItem, // 被移动元素
                {
                    prev: this.clips[to].prev, // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                    next: oldToItem.uuid
                }
            )
            this.kernel.storage.update(table, fromItem)
            // 修改内存中的值
            this.clips[to] = toItem
            this.clips[from] = fromItem

            /**
             * 移动位置
             */
            this.clips.splice(to, 0, this.clips[from]) // 在 to 位置插入元素
            this.clips.splice(from > to ? from + 1 : from, 1) // 删除 from 位置元素

            // 提交事务
            this.kernel.storage.commit()
        } catch (error) {
            this.kernel.storage.rollback()
            throw error
        } finally {
            // 去掉补位元素
            if (this.clips[to].uuid === null) {
                this.clips.splice(to, 1)
            }
        }
    }

    favoriteItem(row) {
        const item = this.getCopy(this.clips[row])

        item.next = this.allClips[0][0]?.uuid ?? null
        item.prev = null

        try {
            // 写入数据库
            this.kernel.storage.beginTransaction()
            this.kernel.storage.insert("favorite", item)
            if (item.next) {
                // 更改指针
                this.allClips[0][0].prev = item.uuid
                this.kernel.storage.update("favorite", this.allClips[0][0])
            }
            this.kernel.storage.commit()

            // 删除原表数据，此处不删除标签
            this.deleteItem(row, false)

            // 保存到内存中
            this.allClips[0].unshift(item)
            this.savedClipboardIndex[item.md5] = 1
        } catch (error) {
            this.kernel.error(error)
            this.kernel.storage.rollback()
            throw error
        }
    }

    loadAllClips() {
        this.kernel.print("load all clips")
        const initData = data => {
            try {
                const sorted = this.kernel.storage.sort(data, this.kernel.setting.get("clipboard.maxItemLength"))
                return sorted.map(data => {
                    this.savedClipboardIndex[data.md5] = 1
                    return data
                })
            } catch (error) {
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
                this.kernel.error(error)
            }
        }
        this.allClips = [
            initData(this.kernel.storage.all(this.tabItemsIndex[0])),
            initData(this.kernel.storage.all(this.tabItemsIndex[1]))
        ]
    }
}

module.exports = ClipsData
