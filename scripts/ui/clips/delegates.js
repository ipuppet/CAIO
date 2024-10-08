const { UIKit, Sheet } = require("../../libs/easy-jsbox")
const { ActionData, ActionEnv } = require("../../action/action")

/**
 * @typedef {import("../../app-main").AppKernel} AppKernel
 * @typedef {import("./clips").Clips} Clips
 * @typedef {import("./views").ClipsViews} ClipsViews
 */

class ClipsDelegates {
    #setEditingCallback
    menuItemActionMaxCount = 5
    placeholderReuseIdentifier = "UITableViewPlaceholderReuseIdentifier"

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

    initReuseIdentifier(tableView) {
        let cell = tableView.$dequeueReusableCellWithIdentifier(this.placeholderReuseIdentifier)
        if (!cell) {
            const UITableViewCellClass = $objc("UITableViewCell").$class()
            tableView.$registerClass_forCellReuseIdentifier(UITableViewCellClass, this.placeholderReuseIdentifier)
        }
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
                        handler: (tableView, indexPath) => {
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
                        handler: (tableView, indexPath) => {
                            const clip = this.data.getByIndex(indexPath)
                            $share.sheet(clip.image ? clip.imageOriginal : clip.text)
                        }
                    },
                    {
                        title: $l10n("COPY"),
                        symbol: "square.on.square",
                        handler: (tableView, indexPath) => this.data.copy(this.data.getByIndex(indexPath).uuid)
                    },
                    {
                        title: $l10n("DELETE"),
                        symbol: "trash",
                        destructive: true,
                        items: [
                            {
                                title: $l10n("CONFIRM"),
                                destructive: true,
                                handler: (tableView, indexPath) => {
                                    tableView.delete(indexPath)
                                    this.data.delete(this.data.getByIndex(indexPath).uuid)
                                    // 重新计算列表项高度
                                    $delay(0.25, () => tableView.reload())
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
            const handler = this.kernel.actions.getActionHandler(action.category, action.dir)
            action.handler = (tableView, indexPath) => {
                const item = this.data.getByIndex(indexPath)
                handler({
                    env: ActionEnv.clipboard,
                    text: item.text,
                    section: item.section,
                    uuid: item.uuid
                })
            }
            action.title = action.name
            action.symbol = action.icon
            return action
        }
        const actions = this.kernel.actions.getActions("clipboard")
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

    createUIContextualAction = ({ title, handler, color, image, destructive = false } = {}) => {
        const action = $objc("UIContextualAction").$contextualActionWithStyle_title_handler(
            destructive ? 1 : 0,
            title,
            $block("void, UIContextualAction *, UIView *, block", async (action, sourceView, completionHandler) => {
                // completionHandler 只有第一次触发时生效，原因未知
                completionHandler = actionPerformed => {
                    if (actionPerformed) {
                        $(this.views.listId).ocValue().$setEditing_animated(false, true)
                    }
                }
                await handler(action, sourceView, completionHandler)
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

    createUITableViewDropPlaceholder(destinationIndexPath) {
        const placeholder = $objc("UITableViewDropPlaceholder").$alloc()
        const rowHeight = this.views.verticalMargin * 2 + this.views.getContentHeight("A")
        placeholder.$initWithInsertionIndexPath_reuseIdentifier_rowHeight(
            destinationIndexPath,
            this.placeholderReuseIdentifier,
            rowHeight
        )

        return placeholder
    }

    updateEditingToolBar() {
        const isEmpty = this.listSelected.length === 0

        const editButton = $(this.views.editingToolBarId + "-select-button")
        const deleteButton = $(this.views.editingToolBarId + "-delete-button")

        editButton.title = isEmpty ? $l10n("SELECT_ALL") : $l10n("DESELECT_ALL")
        deleteButton.hidden = isEmpty
    }

    toggleAllSelected(deselecteAll = false, updateEditModeToolBar = true) {
        const length = this.data.clips.length
        const tableView = $(this.views.listId).ocValue()
        if (deselecteAll || this.listSelected.length !== 0) {
            for (let i = 0; i < length; i++) {
                const indexPath = $indexPath(0, i).ocValue()
                tableView.$deselectRowAtIndexPath_animated(indexPath, false)
            }
        } else if (this.listSelected.length === 0) {
            for (let i = 0; i < length; i++) {
                const indexPath = $indexPath(0, i).ocValue()
                tableView.$selectRowAtIndexPath_animated_scrollPosition(indexPath, false, 0)
            }
        }

        if (updateEditModeToolBar && tableView.$isEditing()) {
            this.updateEditingToolBar()
        }
    }

    deleteSelected() {
        UIKit.deleteConfirm($l10n("DELETE_CONFIRM_MSG"), () => {
            // 倒序排序
            const selected = this.listSelected.sort((a, b) => {
                return a.row < b.row
            })
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
        const tableView = $(this.views.listId).ocValue()
        let status = mode !== undefined ? mode : !tableView.$isEditing()

        if (status === tableView.$isEditing()) {
            return
        }

        tableView.$setEditing(status)
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

    didSelectRowAtIndexPath(tableView, indexPath) {
        if (tableView.$isEditing()) {
            this.updateEditingToolBar()
            return
        }
        if (tableView.$hasActiveDrag()) {
            return
        }

        const clip = this.data.getByIndex(indexPath.jsValue())
        if (clip.image) {
            Sheet.quickLookImage(clip.imageOriginal)
            tableView.$deselectRowAtIndexPath_animated(indexPath, true)
        } else {
            this.views.edit(clip.text, text => {
                tableView.$deselectRowAtIndexPath_animated(indexPath, true)
                if (clip.text !== text) this.data.update(text, clip.uuid)
            })
        }
    }
    didDeselectRowAtIndexPath(tableView, indexPath) {
        if (tableView.$isEditing()) {
            this.updateEditingToolBar()
        }
    }

    contextMenuConfigurationForRowAtIndexPath(tableView, indexPath, point) {
        // 编辑模式不显示菜单
        if (tableView.$isEditing()) return

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
                                item.handler(tableView.jsValue(), indexPath.jsValue())
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

    leadingSwipeActionsConfigurationForRowAtIndexPath(tableView, indexPath) {
        return $objc("UISwipeActionsConfiguration").$configurationWithActions([
            this.createUIContextualAction({
                title: $l10n("COPY"),
                color: $color("systemLink"),
                handler: async (action, sourceView, completionHandler) => {
                    this.data.copy(this.data.getByIndex(indexPath.jsValue()).uuid)
                    completionHandler(true)
                }
            })
        ])
    }
    trailingSwipeActionsConfigurationForRowAtIndexPath(tableView, indexPath) {
        tableView = tableView.jsValue()
        indexPath = indexPath.jsValue()
        const actions = [
            this.createUIContextualAction({
                destructive: true,
                title: $l10n("DELETE"),
                handler: (action, sourceView, completionHandler) => {
                    this.data.delete(this.data.getByIndex(indexPath).uuid)
                    tableView.delete(indexPath)
                    // 重新计算列表项高度
                    $delay(0.25, () => tableView.reload())
                }
            })
        ]
        if (this.data.tabIndex === 1) {
            actions.push(
                this.createUIContextualAction({
                    title: $l10n("FAVORITE"),
                    color: $color("orange"),
                    handler: (action, sourceView, completionHandler) => {
                        this.data.favorite(indexPath.row)
                    }
                })
            )
        }
        return $objc("UISwipeActionsConfiguration").$configurationWithActions(actions)
    }

    heightForRowAtIndexPath(tableView, indexPath) {
        tableView = tableView.jsValue()
        indexPath = indexPath.jsValue()
        const clip = this.data.getByIndex(indexPath)
        const tagHeight = clip?.hasTag ? this.views.tagHeight : this.views.verticalMargin
        const itemHeight = clip?.image ? this.views.imageContentHeight : this.views.getContentHeight(clip?.text ?? "a")
        this.data.itemSize[indexPath.row] = this.views.verticalMargin + itemHeight + tagHeight
        return this.data.itemSize[indexPath.row]
    }

    delegate() {
        const events = {
            "tableView:shouldBeginMultipleSelectionInteractionAtIndexPath:": () => {
                return this.shouldBeginMultipleSelectionInteractionAtIndexPath()
            },
            "tableView:didBeginMultipleSelectionInteractionAtIndexPath:": (tableView, indexPath) => {
                this.setEditing(true)
            },
            "tableView:didSelectRowAtIndexPath:": (tableView, indexPath) => {
                this.didSelectRowAtIndexPath(tableView, indexPath)
            },
            "tableView:didDeselectRowAtIndexPath:": (tableView, indexPath) => {
                this.didDeselectRowAtIndexPath(tableView, indexPath)
            },
            "tableView:contextMenuConfigurationForRowAtIndexPath:point:": (tableView, indexPath, point) => {
                return this.contextMenuConfigurationForRowAtIndexPath(tableView, indexPath, point)
            },
            "tableView:leadingSwipeActionsConfigurationForRowAtIndexPath:": (tableView, indexPath) => {
                return this.leadingSwipeActionsConfigurationForRowAtIndexPath(tableView, indexPath)
            },
            "tableView:trailingSwipeActionsConfigurationForRowAtIndexPath:": (tableView, indexPath) => {
                return this.trailingSwipeActionsConfigurationForRowAtIndexPath(tableView, indexPath)
            },
            "tableView:heightForRowAtIndexPath:": (tableView, indexPath) => {
                return this.heightForRowAtIndexPath(tableView, indexPath)
            }
        }

        return $delegate({
            type: "UITableViewDelegate",
            events
        })
    }

    itemsForBeginningDragSession(session, indexPath) {
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

        const context = session.$localContext()
        if (context) {
            context.$addObject(dragItem)
        } else {
            const mutableArray = NSMutableArray.$new()
            mutableArray.$addObject(dragItem)
            session.$setLocalContext(mutableArray)
        }

        return [dragItem]
    }

    dragDelegate() {
        const events = {
            "tableView:itemsForBeginningDragSession:atIndexPath:": (tableView, session, indexPath) => {
                return this.itemsForBeginningDragSession(session, indexPath)
            }
        }

        return $delegate({
            type: "UITableViewDragDelegate",
            events
        })
    }

    reorder(coordinator) {
        // 排序只有一个可以拖拽
        const item = coordinator.$items().$firstObject()
        const source = item.$sourceIndexPath().jsValue().row
        const destinationIndexPath = coordinator.$destinationIndexPath()
        const destination = destinationIndexPath.jsValue().row

        this.data.moveItem(source, destination)
        this.data.updateList()

        coordinator.$dropItem_toRowAtIndexPath(item.$dragItem(), destinationIndexPath)
    }

    dropItems(coordinator) {
        let destinationIndexPath = coordinator.$destinationIndexPath()
        if (!destinationIndexPath) destinationIndexPath = $indexPath(0, 0)

        const items = coordinator.$items()
        const count = items.$count()

        for (let i = 0; i < count; i++) {
            const item = items.$objectAtIndex(i)

            const placeholder = this.createUITableViewDropPlaceholder(destinationIndexPath)
            const placeholderContext = coordinator.$dropItem_toPlaceholder(item.$dragItem(), placeholder)

            const itemProvider = placeholderContext.$dragItem().$itemProvider()
            const typeIdentifiers = itemProvider.$registeredTypeIdentifiers().jsValue()

            const hasText = itemProvider.$hasItemConformingToTypeIdentifier("public.text")
            const hasImage = itemProvider.$hasItemConformingToTypeIdentifier("public.image")
            if (!hasText && !hasImage) {
                return
            }

            const completionHandler = (data, error) => {
                if (error) {
                    $ui.alert(error.jsValue())
                    this.kernel.logger.error(error.jsValue())
                }

                try {
                    if (hasText) {
                        this.data.addItem(data.jsValue().string, false)
                    } else if (hasImage) {
                        this.data.addItem(data.jsValue().image, false)
                    }
                    placeholderContext.$commitInsertionWithDataSourceUpdates(
                        $block("void, NSIndexPath *", insertionIndexPath => {
                            this.data.moveItem(0, insertionIndexPath.jsValue().row)
                            this.data.updateList()
                        })
                    )
                } catch (error) {
                    placeholderContext.$deletePlaceholder()
                    $ui.warning(error)
                    return false
                }
            }

            const progress = itemProvider.$loadDataRepresentationForTypeIdentifier_completionHandler(
                typeIdentifiers[0],
                $block("void, NSData *, NSError *", (data, error) => {
                    $delay(0, () => completionHandler(data, error))
                })
            )
        }
    }

    dropDelegate() {
        const events = {
            "tableView:canHandleDropSession:": (tableView, session) => {
                // 编辑状态只能拖不能放
                return !tableView.$isEditing()
            },
            "tableView:dropSessionDidUpdate:withDestinationIndexPath:": (tableView, session, destinationIndexPath) => {
                const dropProposal = $objc("UITableViewDropProposal").$alloc()
                if (session.$localDragSession()) {
                    // app 内拖拽
                    dropProposal.$initWithDropOperation_intent(3, 1)
                } else {
                    // 来自外部 app
                    dropProposal.$initWithDropOperation_intent(2, 1)
                }
                return dropProposal
            },
            "tableView:performDropWithCoordinator:": (tableView, coordinator) => {
                const session = coordinator.$session()

                if (session.$localDragSession()) {
                    // 排序
                    this.reorder(coordinator)
                } else {
                    this.dropItems(coordinator)
                }
            }
        }

        return $delegate({
            type: "UITableViewDropDelegate",
            events
        })
    }

    setDelegate() {
        const view = $(this.views.listId).ocValue()

        this.initReuseIdentifier(view)

        view.$setDelegate(this.delegate())
        view.$setDragDelegate(this.dragDelegate())
        view.$setDropDelegate(this.dropDelegate())
    }
}

module.exports = ClipsDelegates
