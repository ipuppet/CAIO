const { View, UIKit, Sheet, NavigationView, NavigationBar, Toast } = require("../../libs/easy-jsbox")
const ClipsData = require("../../dao/clips-data")
const ClipsSearch = require("./search")
const ClipsViews = require("./views")
const ClipsDelegates = require("./delegates")
const WebDavSync = require("../../dao/webdav-sync")

/**
 * @typedef {Clips} Clips
 * @typedef {import("../../dao/storage").Clip} Clip
 * @typedef {import("../../app-main").AppKernel} AppKernel
 */

class Clips extends ClipsData {
    copied = $cache.get("clips.copied") ?? {}
    itemSize = {}
    scrollToOffsetDirectionX = false

    /**
     * @type {NavigationView}
     */
    navigationView

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)

        this.views = new ClipsViews(kernel)
        this.delegates = new ClipsDelegates(kernel, this, this.views)
    }

    getByIndex(index) {
        if (typeof index === "object") {
            index = index.row
        }
        return this.clips[index]
    }

    appListen() {
        if (UIKit.isTaio) return
        $app.listen({
            resume: () => {
                // 重载小组件
                $widget.reloadTimeline()
                // 在应用恢复响应后调用
                if (!this.needReload && $(this.views.listId).ocValue().$isEditing()) {
                    return
                }
                this.updateList(true)
                $delay(0.5, () => {
                    this.readClipboard()
                })
            },
            clipSyncStatus: args => {
                const list = $(this.views.listId)
                if (args.status === WebDavSync.status.success || args.status === WebDavSync.status.nochange) {
                    if (args.updateList) {
                        this.updateList(true)
                    }
                    if (list) list.endRefreshing()
                } else if (args.status === WebDavSync.status.syncing && args.animate) {
                    if (list) list.beginRefreshing()
                }
            }
        })
    }

    setDelegate() {
        this.delegates.setEditingCallback(status => {
            this.navigationView.navigationBarItems.getButtons().forEach(button => {
                if (button.id === this.views.listId + "-navbtn-edit") {
                    button.setTitle(status ? $l10n("DONE") : $l10n("EDIT"))
                } else {
                    status ? button.hide() : button.show()
                }
            })
        })
        this.delegates.setDelegate()
    }

    async checkUrlScheme() {
        // actions widget
        // checked in kernel constructor
        if (this.kernel.runActionFlag) return
        // clips widget
        if ($context.query["copy"]) {
            const uuid = $context.query["copy"]
            this.setCopied(uuid)
            $ui.success($l10n("COPIED"))
        } else if ($context.query["add"]) {
            this.getAddTextView()
        } else if ($context.query["actions"]) {
            if (this.kernel.isUseJsboxNav) {
                this.kernel.actions.present()
            } else {
                this.kernel.tabBarController.switchPageTo("actions")
            }
        }
    }

    /**
     * list view ready event
     */
    listReady() {
        this.setDelegate()

        this.updateList()

        // readClipboard
        $delay(0.5, () => {
            this.readClipboard()
        })

        if (UIKit.isTaio) return

        // check url scheme
        $delay(0, () => this.checkUrlScheme())

        this.appListen()
    }

    updateList(reload = false) {
        if (reload) {
            this.setNeedReload()
        }
        $(this.views.listId).data = this.clips.map(data => this.views.lineData(data, this.copied.uuid === data.uuid))
        this.updateListBackground()
    }

    updateListBackground() {
        const view = $(this.views.listId)
        if (!view) return
        if (this.clips.length > 0) {
            view.ocValue().$setBackgroundView(undefined)
        } else {
            view.ocValue().$setBackgroundView($ui.create(this.views.getEmptyBackground(this.clips.length > 0)))
        }
    }

    updateCopied(copied = null) {
        const oldUuid = this.copied?.uuid // 防止延迟执行导致的数据错误
        $delay(0, () => {
            const listView = $(this.views.listId)
            const oldCell = listView.cell($indexPath(0, this.getIndexByUUID(oldUuid)))
            if (oldCell) {
                oldCell.get("copied").hidden = true
            }
            if (copied) {
                const index = this.getIndexByUUID(copied.uuid)
                if (listView.cell($indexPath(0, index))) {
                    listView.cell($indexPath(0, index)).get("copied").hidden = false
                }
            }
        })

        if (!copied) {
            this.copied = {}
        } else {
            Object.assign(this.copied, copied)
        }
        this.kernel.logger.info(`this.copied: ${JSON.stringify(this.copied, null, 2)}`)
        $cache.set("clips.copied", this.copied)
    }

    focusAnimation(uuid) {
        $delay(0.3, () => {
            const listView = $(this.views.listId)
            const index = this.getIndexByUUID(uuid)
            let height = 0
            for (let i = 0; i < index; i++) {
                height += this.itemSize[i]
            }
            height -= 5 // 防止完全对其
            if (this.views.scrollToOffsetDirectionX) {
                listView.scrollToOffset($point(height, 0))
            } else {
                listView.scrollToOffset($point(0, height))
            }
        })
    }

    /**
     * 将元素标记为 copied
     * @param {string} uuid
     * @param {boolean} isUpdateIndicator
     * @returns
     */
    setCopied(uuid, animate = true) {
        let copied = {}
        if (this.copied.uuid !== uuid) {
            copied = this.getClip(uuid) ?? {}
            this.setClipboardText(copied.text)
            this.isPasteboardChanged // 更新缓存
        }
        copied.tabIndex = this.tabIndex

        this.updateCopied(copied)

        if (animate) {
            this.focusAnimation(uuid)
        }
    }

    clearCopied() {
        const listView = $(this.views.listId)
        const oldCell = listView.cell($indexPath(0, this.getIndexByUUID(this.copied.uuid)))
        if (oldCell) {
            oldCell.get("copied").hidden = true
        }
        this.updateCopied()
    }

    async readClipboard(manual = false) {
        if (manual || this.kernel.setting.get("clipboard.autoSave")) {
            this.kernel.logger.info("read clipboard")

            // 剪切板没有变化则直接退出
            if (!manual && !this.isPasteboardChanged) {
                this.kernel.logger.info("clipboard no change")
                return
            }

            // 仅手动模式下保存图片
            if ($clipboard.images?.length > 0) {
                if (manual) {
                    await $wait(0.1)
                    $clipboard.images.forEach(image => {
                        this.add(image)
                    })
                    return
                }
                return
            }

            const text = $clipboard.text
            if (!text || text === "") {
                this.clearCopied()
                return
            }
            // 判断 copied 是否和剪切板一致
            // 开发模式下，清空数据后该值仍然存在，可能造成：无法保存相同的数据
            if (this.getClip(this.copied?.uuid)?.text === text) {
                if (manual) {
                    $ui.toast($l10n("CLIPBOARD_NO_CHANGE"))
                }
                this.switchTab(this.tabItemsMap[this.copied.section], true)
                this.focusAnimation(this.copied.uuid)
                return
            }
            if (this.exists(text)) {
                const clip = this.kernel.storage.getByText(text)
                this.switchTab(this.tabItemsMap[clip.section], true)
                this.setCopied(clip.uuid)
            } else {
                this.switchTab(1, true) // clips
                const data = await this.add(text)
                this.setCopied(data.uuid)
            }
        }
    }

    async add(item, updateUI = true) {
        try {
            const data = super.addItem(item)

            if (!updateUI) return

            // 先修改背景，让 list 显示出来
            this.updateListBackground()

            await $wait(0.1) // 直接操作可能造成键盘 matrix 闪退

            // 在列表中插入行
            $(this.views.listId).insert({
                indexPath: $indexPath(0, 0),
                value: this.views.lineData(data)
            })
            return data
        } catch (error) {
            $ui.warning(error)
        }
    }

    delete(uuid) {
        try {
            super.deleteItem(uuid)
            // 删除剪切板信息
            if (this.copied.uuid === uuid) {
                this.updateCopied()
                $clipboard.clear()
            }

            this.updateListBackground()
        } catch (error) {
            $ui.alert(error)
            throw error
        }
    }

    update(text, uuid) {
        try {
            super.updateItem(text, uuid)
            // 更新列表
            this.updateList()
            if (uuid === this.copied.uuid) {
                this.setClipboardText(text)
            }

            return true
        } catch (error) {
            $ui.alert(error)
            return false
        }
    }

    favorite(index) {
        const clip = this.getByIndex(index)

        if (clip?.section === "favorite") {
            return
        }

        const res = this.kernel.storage.getByUUID(clip.uuid)
        if (res?.section === "favorite") {
            Toast.warning("Already exists")
            return
        }

        try {
            super.favoriteItem(clip.uuid)
            // UI 操作
            $(this.views.listId).delete(index)
        } catch (error) {
            $ui.alert(error)
        }
    }

    /**
     * 复制
     * @param {string} uuid 被复制的 uuid
     */
    copy(uuid) {
        const clip = this.getClip(uuid)
        if (clip.image) {
            $clipboard.image = clip.imageOriginal
        } else {
            this.setCopied(uuid, false)
        }
        // 将被复制的行移动到最前端
        if (this.tabIndex !== 0) {
            const from = this.getIndexByUUID(uuid)
            const to = 0
            try {
                super.moveItem(from, to)
                // 操作 UI
                const tableView = $(this.views.listId).ocValue()
                const fip = $indexPath(0, from).ocValue()
                const tip = $indexPath(0, to).ocValue()
                tableView.$moveRowAtIndexPath_toIndexPath(fip, tip)
            } catch (error) {
                $ui.alert(error)
            }
        }
    }

    getAddTextView() {
        this.views.edit("", text => {
            if (text !== "") this.add(text)
        })
    }

    switchTab(index, manual = false) {
        this.tabIndex = index
        this.updateList()

        if (manual) {
            $(this.views.listId + "-tab").index = this.tabIndex
        }

        this.delegates.setEditing(false)
    }

    getTabView() {
        return this.views.tabView(this.tabItems, this.tabIndex, {
            changed: sender => this.switchTab(sender.index)
        })
    }

    getListView() {
        return this.views.getListView(this.views.listId, [], {
            ready: () => this.listReady(),
            pulled: sender => {
                this.updateList(true)
                this.kernel.storage.sync()
                if (!this.kernel.setting.get("webdav.status")) {
                    $delay(0.5, () => sender.endRefreshing())
                }
            }
        })
    }

    getNavigationView() {
        const search = new ClipsSearch(this.kernel)
        search.setCallback(obj => {
            const sheet = new Sheet()
            const getView = obj => {
                const { keyword, result, isTagKeyword } = obj
                const view = this.views.getListView(
                    this.views.listId + "-search-result",
                    result.map(clip => {
                        const targetText = isTagKeyword ? clip.tag : clip.text
                        let styles = []
                        keyword.forEach(kw => {
                            let pos = targetText.indexOf(kw)
                            while (pos > -1) {
                                styles.push({
                                    range: $range(pos, kw.length),
                                    color: $color("red")
                                })
                                pos = targetText.indexOf(kw, pos + 1)
                            }
                        })
                        clip.styledText = {}
                        if (isTagKeyword) {
                            clip.tagStyledText = {
                                color: this.views.tagColor,
                                text: targetText,
                                styles
                            }
                        } else {
                            clip.textStyledText = {
                                text: targetText,
                                styles
                            }
                        }
                        return this.views.lineData(clip, false)
                    }),
                    {
                        ready: () => this.updateList(),
                        didSelect: (sender, indexPath) => {
                            const clip = result[indexPath.row]
                            if (clip.image) {
                                Sheet.quickLookImage(clip.imageOriginal)
                            } else {
                                sheet.dismiss()
                                this.views.edit(clip.text, text => {
                                    if (clip.text !== text) this.update(text, clip.uuid)
                                })
                            }
                        },
                        rowHeight: (sender, indexPath) => {
                            const clip = result[indexPath.row]
                            const tagHeight = clip?.hasTag ? this.views.tagHeight : this.views.verticalMargin
                            const itemHeight = clip.image
                                ? this.views.imageContentHeight
                                : this.views.getContentHeight(clip.text)
                            return this.views.verticalMargin + itemHeight + tagHeight
                        }
                    }
                )
                return view
            }
            const view = getView(obj)
            view.props.bgcolor = UIKit.primaryViewBackgroundColor
            sheet
                .setView(view)
                .addNavBar({
                    title: $l10n("SEARCH_RESULT"),
                    popButton: { title: $l10n("DONE"), tapped: () => search.dismiss() }
                })
                .init()
                .present()
        })

        const menuView = this.getTabView()
        menuView.type = "menu"
        menuView.layout = (make, view) => {
            make.left.right.equalTo(view.super)
            make.height.equalTo(this.views.tabHeight)
            if (this.kernel.isUseJsboxNav && UIKit.isTaio) {
                make.top.equalTo(view.super).offset(UIKit.PageSheetNavigationBarNormalHeight)
            } else {
                make.top.equalTo(view.super)
            }
        }

        const view = View.createFromViews([menuView, this.getListView(), search.getSearchHistoryView()])

        this.navigationView = new NavigationView().navigationBarTitle($l10n("CLIPS")).setView(view)
        this.navigationView.navigationBarItems
            .setTitleView(search.getSearchBarView())
            .pinTitleView()
            .setRightButtons([
                {
                    symbol: "plus.circle",
                    tapped: () => this.getAddTextView()
                }
            ])
            .setLeftButtons([
                {
                    id: this.views.listId + "-navbtn-edit",
                    title: $l10n("EDIT"),
                    tapped: () => this.delegates.setEditing()
                },
                {
                    symbol: "square.and.arrow.down.on.square",
                    tapped: async animate => {
                        animate.start()
                        try {
                            await this.readClipboard(true)
                            animate.done()
                        } catch (error) {
                            animate.cancel()
                            this.kernel.logger.error(error)
                        }
                    }
                }
            ])

        this.navigationView.navigationBar
            .setBackgroundColor(UIKit.primaryViewBackgroundColor)
            .setLargeTitleDisplayMode(NavigationBar.largeTitleDisplayModeNever)
        if (this.kernel.isUseJsboxNav) {
            this.navigationView.navigationBar.removeTopSafeArea()
        }

        return this.navigationView
    }
}

module.exports = Clips
