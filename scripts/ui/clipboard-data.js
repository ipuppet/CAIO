const { UIKit } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class ClipboardData {
    /**
     * @type {AppKernel}
     */
    kernel

    copied = $cache.get("clipboard.copied") ?? {}
    pasteboard = $objc("UIPasteboard").$generalPasteboard()

    reorder = {}
    #savedClipboard = []
    // 键为 md5，值为 1 或 undefined 用来去重
    savedClipboardIndex = {}

    tabItems = [$l10n("PIN"), $l10n("CLIPS")]
    tabItemsIndex = ["pin", "clipboard"]

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

    get savedClipboard() {
        if (this.#savedClipboard.length === 0) {
            this.loadSavedClipboard()
        }
        return this.#savedClipboard
    }

    set savedClipboard(savedClipboard) {
        this.#savedClipboard = savedClipboard.map(item => {
            return new Proxy(item ?? [], {
                set: (obj, prop, value) => {
                    // 更新空列表背景
                    this.updateListBackground()

                    return Reflect.set(obj, prop, value)
                }
            })
        })
    }

    get clipboard() {
        return this.savedClipboard[this.tabIndex]
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
     * 警告！该方法可能消耗大量资源
     * @param {string} uuid
     */
    getRowByUUID(uuid) {
        let length = this.clipboard.length
        for (let i = 0; i < length; ++i) {
            if (this.clipboard[i].uuid === uuid) return i
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

    add(item) {
        // 元数据
        const data = {
            uuid: $text.uuid,
            text: item,
            md5: null,
            image: null,
            tag: "",
            prev: null,
            next: this.clipboard[0] ? this.clipboard[0].uuid : null
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
                this.clipboard[0].prev = data.uuid
                this.kernel.storage.update(this.table, this.clipboard[0])
            }
            this.kernel.storage.commit()

            // 保存到内存中
            this.clipboard.unshift(data)
            this.savedClipboardIndex[$text.MD5(data.text)] = 1

            return data
        } catch (error) {
            this.kernel.error(error)
            this.kernel.storage.rollback()
            throw error
        }
    }

    delete(uuid, row) {
        const folder = this.table

        try {
            // 删除数据库中的值
            this.kernel.storage.beginTransaction()
            this.kernel.storage.delete(folder, uuid)
            // 更改指针
            if (this.clipboard[row - 1]) {
                const prevItem = {
                    uuid: this.clipboard[row - 1].uuid,
                    text: this.clipboard[row - 1].text,
                    prev: this.clipboard[row - 1].prev,
                    next: this.clipboard[row].next // next 指向被删除元素的 next
                }
                this.kernel.storage.update(folder, prevItem)
                this.clipboard[row - 1] = prevItem
            }
            if (this.clipboard[row + 1]) {
                const nextItem = {
                    uuid: this.clipboard[row + 1].uuid,
                    text: this.clipboard[row + 1].text,
                    prev: this.clipboard[row].prev, // prev 指向被删除元素的 prev
                    next: this.clipboard[row + 1].next
                }
                this.kernel.storage.update(folder, nextItem)
                this.clipboard[row + 1] = nextItem
            }
            this.kernel.storage.commit()

            // update index
            delete this.savedClipboardIndex[this.clipboard[row].md5]
            // 删除内存中的值
            this.clipboard.splice(row, 1)
        } catch (error) {
            this.kernel.error(error)
            this.kernel.storage.rollback()
            throw error
        }
    }

    update(uuid, text, row) {
        const info = this.clipboard[row]
        const newMD5 = $text.MD5(text)

        // 更新索引
        delete this.savedClipboardIndex[info.md5]
        this.savedClipboardIndex[newMD5] = 1

        // 更新内存数据
        const oldData = info.text
        this.clipboard[row] = Object.assign(info, {
            text,
            md5: newMD5
        })

        try {
            this.kernel.storage.updateText(this.table, uuid, text)

            this.kernel.print(`data changed at index [${row}]\n${oldData}\n↓\n${text}`)

            return true
        } catch (error) {
            this.kernel.error(error)
            return false
        }
    }

    /**
     * 将from位置的元素移动到to位置
     * @param {number} from
     * @param {number} to
     * @param {number} section
     */
    move(from, to) {
        if (from === to) return
        if (from < to) to++ // 若向下移动则 to 增加 1，因为代码为移动到 to 位置的上面

        try {
            const folder = this.table
            if (!this.clipboard[to]) {
                this.clipboard[to] = {
                    uuid: null,
                    text: "",
                    next: null,
                    prev: this.clipboard[to - 1].uuid
                }
            }

            this.kernel.storage.beginTransaction() // 开启事务
            const oldFromItem = {
                uuid: this.clipboard[from].uuid,
                text: this.clipboard[from].text
            }
            const oldToItem = {
                uuid: this.clipboard[to].uuid,
                text: this.clipboard[to].text
            }
            // 删除元素
            {
                if (this.clipboard[from - 1]) {
                    const fromPrevItem = {
                        // from 位置的上一个元素
                        uuid: this.clipboard[from - 1].uuid,
                        text: this.clipboard[from - 1].text,
                        prev: this.clipboard[from - 1].prev,
                        next: this.clipboard[from].next
                    }
                    this.kernel.storage.update(folder, fromPrevItem)
                    this.clipboard[from - 1] = fromPrevItem
                }
                if (this.clipboard[from + 1]) {
                    const fromNextItem = {
                        // from 位置的下一个元素
                        uuid: this.clipboard[from + 1].uuid,
                        text: this.clipboard[from + 1].text,
                        prev: this.clipboard[from].prev,
                        next: this.clipboard[from + 1].next
                    }
                    this.kernel.storage.update(folder, fromNextItem)
                    this.clipboard[from + 1] = fromNextItem
                }
            }
            // 在 to 上方插入元素
            {
                if (this.clipboard[to - 1]) {
                    const toPrevItem = {
                        // 原来 to 位置的上一个元素
                        uuid: this.clipboard[to - 1].uuid,
                        text: this.clipboard[to - 1].text,
                        prev: this.clipboard[to - 1].prev,
                        next: oldFromItem.uuid // 指向即将被移动元素的uuid
                    }
                    this.kernel.storage.update(folder, toPrevItem)
                    this.clipboard[to - 1] = toPrevItem
                }
                const toItem = {
                    // 原来 to 位置的元素
                    uuid: oldToItem.uuid,
                    text: oldToItem.text,
                    prev: oldFromItem.uuid, // 指向即将被移动的元素
                    next: this.clipboard[to].next // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                }
                this.kernel.storage.update(folder, toItem)
                const fromItem = {
                    // 被移动元素
                    uuid: oldFromItem.uuid,
                    text: oldFromItem.text,
                    prev: this.clipboard[to].prev, // 前面的代码可能更改此值，因为 from 上下的元素可能就是 to
                    next: oldToItem.uuid
                }
                this.kernel.storage.update(folder, fromItem)
                // 修改内存中的值
                this.clipboard[to] = toItem
                this.clipboard[from] = fromItem
            }
            // 移动位置
            {
                this.clipboard.splice(to, 0, this.clipboard[from])
                this.clipboard.splice(from > to ? from + 1 : from, 1)
                this.kernel.storage.commit() // 提交事务
                // 去掉补位元素
                if (this.clipboard[to].uuid === null) {
                    this.clipboard.splice(to, 1)
                }
            }
        } catch (error) {
            this.kernel.error(error)
            this.kernel.storage.rollback()
            throw error
        }
    }

    pin(item, row) {
        item.next = this.savedClipboard[0][0]?.uuid ?? null
        item.prev = null

        try {
            // 写入数据库
            this.kernel.storage.beginTransaction()
            this.kernel.storage.insert("pin", item)
            if (item.next) {
                // 更改指针
                this.savedClipboard[0][0].prev = item.uuid
                this.kernel.storage.update("pin", this.savedClipboard[0][0])
            }
            this.kernel.storage.commit()

            // 删除原表数据
            this.delete(item.uuid, row)

            // 保存到内存中
            this.savedClipboard[0].unshift(item)
            this.savedClipboardIndex[item.md5] = 1
        } catch (error) {
            this.kernel.error(error)
            this.kernel.storage.rollback()
            throw error
        }
    }

    loadSavedClipboard() {
        this.kernel.print("load clipboard")
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
                    message: $l10n("CLIPBOARD_STRUCTURE_ERROR"),
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
        this.savedClipboard = [initData(this.kernel.storage.all("pin")), initData(this.kernel.storage.all("clipboard"))]
    }
}

module.exports = ClipboardData
