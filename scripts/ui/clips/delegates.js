const { UIKit, Sheet } = require("../../libs/easy-jsbox")

const ClipsEditor = require("./clips-editor")
const { ActionData, ActionEnv } = require("../../action/action")

/**
 * @typedef {import("../../app-main").AppKernel} AppKernel
 * @typedef {import("./clips").Clips} Clips
 * @typedef {import("./views").ClipsViews} ClipsViews
 */

class ClipsDelegates {
    #setEditingCallback
    menuItemActionMaxCount = 5

    /**
     * @param {AppKernel} kernel
     * @param {Clips} data
     * @param {ClipsViews} views
     */
    constructor(kernel, data, views) {
        this.kernel = kernel
        this.data = data
        this.views = views
    }

    get listSelected() {
        const selected = $(this.views.listId)?.ocValue()?.$indexPathsForSelectedRows()?.jsValue()
        return Array.isArray(selected) ? selected : []
    }

    get defaultMenuItems() {
        return [
            {
                inline: true,
                items: [
                    {
                        title: $l10n("TAG"),
                        symbol: "tag",
                        handler: (sender, indexPath) => {
                            const clip = this.data.getByIndex(indexPath)
                            $input.text({
                                placeholder: $l10n("ADD_TAG"),
                                text: clip.tag,
                                handler: text => {
                                    text = text.trim()
                                    if (text.length > 0) {
                                        this.kernel.storage.setTag(clip.uuid, text)
                                    } else {
                                        this.kernel.storage.deleteTag(clip.uuid)
                                    }
                                    this.data.updateList(true)
                                }
                            })
                        }
                    }
                ]
            },
            {
                inline: true,
                items: [
                    {
                        title: $l10n("SHARE"),
                        symbol: "square.and.arrow.up",
                        handler: (sender, indexPath) => {
                            const clip = this.data.getByIndex(indexPath)
                            $share.sheet(clip.image ? clip.imageOriginal : clip.text)
                        }
                    },
                    {
                        title: $l10n("COPY"),
                        symbol: "square.on.square",
                        handler: (sender, indexPath) => this.data.copy(this.data.getByIndex(indexPath).uuid)
                    },
                    {
                        title: $l10n("DELETE"),
                        symbol: "trash",
                        destructive: true,
                        items: [
                            {
                                title: $l10n("CONFIRM"),
                                destructive: true,
                                handler: (sender, indexPath) => {
                                    sender.delete(indexPath)
                                    this.data.delete(this.data.getByIndex(indexPath).uuid)
                                    // 重新计算列表项高度
                                    $delay(0.25, () => sender.reload())
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    }

    get menu() {
        const action = action => {
            const handler = this.kernel.actionManager.getActionHandler(action.type, action.dir)
            action.handler = (sender, indexPath) => {
                const item = this.data.getByIndex(indexPath)
                const actionData = new ActionData({
                    env: ActionEnv.clipboard,
                    text: item.text,
                    section: item.section,
                    uuid: item.uuid
                })
                handler(actionData)
            }
            action.title = action.name
            action.symbol = action.icon
            return action
        }
        const actions = this.kernel.actionManager.getActions("clipboard")
        const actionButtons = {
            inline: true,
            items: actions.slice(0, this.menuItemActionMaxCount).map(action)
        }
        if (actions.length > this.menuItemActionMaxCount) {
            actionButtons.items.push({
                title: $l10n("MORE_ACTIONS"),
                symbol: "square.grid.2x2",
                items: actions.slice(this.menuItemActionMaxCount).map(action)
            })
        }

        return { items: [actionButtons, ...this.defaultMenuItems] }
    }

    setEditingCallback(callback) {
        this.#setEditingCallback = callback
    }

    createUIMenu = ({ title, image, actions, inline = false, destructive = false } = {}) => {
        let options
        if (inline) {
            options = options | (1 << 0)
        }
        if (destructive) {
            options = options | (1 << 1)
        }
        return $objc("UIMenu").$menuWithTitle_image_identifier_options_children(
            title ?? "",
            image,
            null,
            options ?? 0,
            actions
        )
    }

    createUIAction = ({ title, image, handler, destructive = false } = {}) => {
        const action = $objc("UIAction").$actionWithTitle_image_identifier_handler(
            title,
            image,
            null,
            $block("void, UIAction *", action => {
                handler(action)
            })
        )

        if (destructive) {
            action.$setAttributes(1 << 1)
        }

        return action
    }

    createUIContextualAction = ({
        title,
        handler,
        color,
        image,
        destructive = false,
        autoCloseEditing = true
    } = {}) => {
        const action = $objc("UIContextualAction").$contextualActionWithStyle_title_handler(
            destructive ? 1 : 0,
            title,
            $block("void, UIContextualAction *, UIView *, void", (action, sourceView, completionHandler) => {
                handler(action, sourceView, completionHandler)
                if (autoCloseEditing) {
                    $(this.views.listId).setEditing(false)
                }
            })
        )
        if (color) {
            action.$setBackgroundColor(color)
        }
        if (image) {
            action.$setImage(image)
        }

        return action
    }

    updateEditingToolBar() {
        const isEmpty = this.listSelected.length === 0

        const editButton = $(this.views.editingToolBarId + "-select-button")
        const deleteButton = $(this.views.editingToolBarId + "-delete-button")
        const reorderButton = $(this.views.editingToolBarId + "-reorder-button")

        editButton.title = isEmpty ? $l10n("SELECT_ALL") : $l10n("DESELECT_ALL")
        deleteButton.hidden = isEmpty
        reorderButton.hidden = !isEmpty
    }

    toggleAllSelected(deselecteAll = false, updateEditModeToolBar = true) {
        const length = this.data.clips.length
        const listViewOC = $(this.views.listId).ocValue()
        if (deselecteAll || this.listSelected.length !== 0) {
            for (let i = 0; i < length; i++) {
                const indexPath = $indexPath(0, i).ocValue()
                listViewOC.$deselectRowAtIndexPath_animated(indexPath, false)
            }
        } else if (this.listSelected.length === 0) {
            for (let i = 0; i < length; i++) {
                const indexPath = $indexPath(0, i).ocValue()
                listViewOC.$selectRowAtIndexPath_animated_scrollPosition(indexPath, false, 0)
            }
        }

        if (updateEditModeToolBar && listViewOC.$isEditing()) {
            this.updateEditingToolBar()
        }
    }

    toggleReorder() {
        this.setEditing(false)
        new ClipsEditor(this).presentSheet()
    }

    deleteSelected() {
        UIKit.deleteConfirm($l10n("DELETE_CONFIRM_MSG"), () => {
            const selected = this.listSelected.sort((a, b) => {
                return a.row < b.row
            }) // 倒序排序
            const uuids = selected.map(indexPath => {
                return this.data.getByIndex(indexPath).uuid
            })
            // 关闭编辑模式
            this.setEditing(false)
            uuids.forEach(uuid => this.data.delete(uuid))
            selected.forEach(item => {
                $(this.views.listId).delete(item)
            })
        })
    }

    /**
     * @param {boolean} mode
     */
    setEditing(mode) {
        const listView = $(this.views.listId)
        const listViewOC = $(this.views.listId).ocValue()
        let status = mode !== undefined ? mode : !listViewOC.$isEditing()

        if (status === listViewOC.$isEditing()) {
            return
        }

        listView.setEditing(status)
        if (typeof this.#setEditingCallback === "function") {
            this.#setEditingCallback(status)
        }

        if (!status) {
            // 非强制关闭编辑模式
            $(this.views.editingToolBarId).remove()
        } else {
            const toolBar = $ui.create(
                this.views.getListEditModeToolBarView({
                    selectButtonEvents: { tapped: () => this.toggleAllSelected() },
                    reorderButtonEvents: { tapped: () => this.toggleReorder() },
                    deleteButtonEvents: { tapped: () => this.deleteSelected() }
                })
            )
            $ui.window.add(toolBar)
            // 进入编辑模式
            $(this.views.editingToolBarId).layout((make, view) => {
                make.left.right.bottom.equalTo(view.super)
                make.top.equalTo(view.super.safeAreaBottom).offset(-this.views.editModeToolBarHeight)
            })
        }
    }

    shouldBeginMultipleSelectionInteractionAtIndexPath() {
        this.setEditing(true)
        return true
    }

    didSelectRowAtIndexPath(sender, indexPath) {
        if (sender.$isEditing()) {
            this.updateEditingToolBar()
            return
        }
        if (sender.$hasActiveDrag()) {
            return
        }

        const clip = this.data.getByIndex(indexPath.jsValue())
        if (clip.image) {
            Sheet.quickLookImage(clip.imageOriginal)
            sender.$deselectRowAtIndexPath_animated(indexPath, true)
        } else {
            this.views.edit(clip.text, text => {
                sender.$deselectRowAtIndexPath_animated(indexPath, true)
                if (clip.md5 !== $text.MD5(text)) this.data.update(text, clip.uuid)
            })
        }
    }
    didDeselectRowAtIndexPath(sender, indexPath) {
        if (sender.$isEditing()) {
            this.updateEditingToolBar()
        }
    }

    contextMenuConfigurationForRowAtIndexPath(sender, indexPath, point) {
        // 编辑模式不显示菜单
        if (sender.$isEditing()) return

        const generateUIMenu = menu => {
            const actions = []
            menu.items.forEach(item => {
                if (item.items) {
                    actions.push(generateUIMenu(item))
                } else {
                    actions.push(
                        this.createUIAction({
                            title: item.title,
                            image: item.symbol,
                            handler: () => {
                                item.handler(sender.jsValue(), indexPath.jsValue())
                            },
                            destructive: item.destructive
                        })
                    )
                }
            })

            return this.createUIMenu({
                title: menu.title,
                image: menu.symbol,
                actions: actions,
                inline: menu.inline,
                destructive: menu.destructive
            })
        }

        return $objc("UIContextMenuConfiguration").$configurationWithIdentifier_previewProvider_actionProvider(
            null,
            null,
            $block("UIMenu *, NSArray *", () => generateUIMenu(this.menu))
        )
    }

    leadingSwipeActionsConfigurationForRowAtIndexPath(sender, indexPath) {
        sender = sender.jsValue()
        indexPath = indexPath.jsValue()
        return $objc("UISwipeActionsConfiguration").$configurationWithActions([
            this.createUIContextualAction({
                title: $l10n("COPY"),
                color: $color("systemLink"),
                handler: (action, sourceView, completionHandler) => {
                    this.data.copy(this.data.getByIndex(indexPath).uuid)
                }
            })
        ])
    }
    trailingSwipeActionsConfigurationForRowAtIndexPath(sender, indexPath) {
        sender = sender.jsValue()
        indexPath = indexPath.jsValue()
        return $objc("UISwipeActionsConfiguration").$configurationWithActions([
            this.createUIContextualAction({
                destructive: true,
                autoCloseEditing: false,
                title: $l10n("DELETE"),
                handler: (action, sourceView, completionHandler) => {
                    this.data.delete(this.data.getByIndex(indexPath).uuid)
                    sender.delete(indexPath)
                    // 重新计算列表项高度
                    $delay(0.25, () => sender.reload())
                }
            }),
            this.createUIContextualAction({
                title: $l10n("FAVORITE"),
                color: $color("orange"),
                autoCloseEditing: false,
                handler: (action, sourceView, completionHandler) => {
                    this.data.favorite(indexPath.row)
                }
            })
        ])
    }

    heightForRowAtIndexPath(sender, indexPath) {
        sender = sender.jsValue()
        indexPath = indexPath.jsValue()
        const clip = this.data.getByIndex(indexPath)
        const tagHeight = clip?.hasTag ? this.views.tagHeight : this.views.verticalMargin
        const itemHeight = clip?.image ? this.views.imageContentHeight : this.views.getContentHeight(clip.text)
        return this.views.verticalMargin + itemHeight + tagHeight
    }

    listViewDelegate() {
        const events = {
            "tableView:shouldBeginMultipleSelectionInteractionAtIndexPath:": () => {
                return this.shouldBeginMultipleSelectionInteractionAtIndexPath()
            },
            "tableView:didBeginMultipleSelectionInteractionAtIndexPath:": (sender, indexPath) => {
                this.setEditing(true)
            },
            "tableView:didSelectRowAtIndexPath:": (sender, indexPath) => {
                this.didSelectRowAtIndexPath(sender, indexPath)
            },
            "tableView:didDeselectRowAtIndexPath:": (sender, indexPath) => {
                this.didDeselectRowAtIndexPath(sender, indexPath)
            },
            "tableView:contextMenuConfigurationForRowAtIndexPath:point:": (sender, indexPath, point) => {
                return this.contextMenuConfigurationForRowAtIndexPath(sender, indexPath, point)
            },
            "tableView:leadingSwipeActionsConfigurationForRowAtIndexPath:": (sender, indexPath) => {
                return this.leadingSwipeActionsConfigurationForRowAtIndexPath(sender, indexPath)
            },
            "tableView:trailingSwipeActionsConfigurationForRowAtIndexPath:": (sender, indexPath) => {
                return this.trailingSwipeActionsConfigurationForRowAtIndexPath(sender, indexPath)
            },
            "tableView:heightForRowAtIndexPath:": (sender, indexPath) => {
                return this.heightForRowAtIndexPath(sender, indexPath)
            }
        }

        return $delegate({
            type: "UITableViewDelegate",
            events
        })
    }

    dragDelegate() {
        const events = {
            "tableView:itemsForBeginningDragSession:atIndexPath": (sender, session, indexPath) => {
                const clip = this.data.getByIndex(indexPath.jsValue())
                const itemProvider = $objc("NSItemProvider").$alloc()
                if (clip.image) {
                    const filePath = $file.absolutePath(clip.imagePath.original)
                    const fileURL = NSURL.$fileURLWithPath(filePath)
                    itemProvider.$initWithContentsOfURL(fileURL)
                } else {
                    itemProvider.$initWithObject(clip.text)
                }
                const dragItem = $objc("UIDragItem").$alloc().$initWithItemProvider(itemProvider)

                return [dragItem]
            }
        }

        return $delegate({
            type: "UITableViewDragDelegate",
            events
        })
    }

    setDelegate() {
        const view = $(this.views.listId).ocValue()
        view.$setDelegate(this.listViewDelegate())
        view.$setDragDelegate(this.dragDelegate())
    }
}

module.exports = ClipsDelegates
