const { UIKit, Sheet } = require("../../libs/easy-jsbox")
const { ActionEnv, ActionData } = require("../../action/action")

/**
 * @typedef {import("../../app-main").AppKernel} AppKernel
 * @typedef {import("./actions").Actions} Actions
 * @typedef {import("./views").ActionViews} ActionViews
 */

class ActionDelegates {
    collectionView

    #setEditingCallback

    /**
     * @param {AppKernel} kernel
     * @param {Actions} data
     * @param {ActionViews} views
     */
    constructor(kernel, data, views) {
        this.kernel = kernel
        this.data = data
        this.views = views
    }

    getActionByIndexPath(indexPath) {
        const section = indexPath.$section()
        const item = indexPath.$item()
        const action = this.data.actions[section].items[item]
        return action
    }

    get matrixSelected() {
        const selected = this.collectionView?.$indexPathsForSelectedItems()?.jsValue()
        return Array.isArray(selected) ? selected : []
    }

    get menu() {
        const menus = [
            {
                // 编辑信息
                title: $l10n("EDIT_DETAILS"),
                symbol: "slider.horizontal.3",
                handler: (collectionView, indexPath, info) => {
                    this.data.editActionInfoPageSheet(info, info => {
                        this.data.applySnapshotToSectionAnimatingDifferences(indexPath.$section())
                    })
                }
            },
            {
                // 编辑脚本
                title: $l10n("EDIT_SCRIPT"),
                symbol: "square.and.pencil",
                handler: (collectionView, indexPath, info) => {
                    const main = this.data.getActionMainJs(info.category, info.dir)
                    this.data.editActionMainJs(main, info)
                }
            },
            {
                inline: true,
                items: [
                    {
                        // README
                        title: "README",
                        symbol: "book",
                        handler: (collectionView, indexPath, info) => {
                            let content

                            try {
                                content = __ACTIONS__[info.category][info.dir]["README.md"]
                            } catch {
                                content = this.data.getActionReadme(info.category, info.dir)
                            }
                            const sheet = new Sheet()
                            sheet
                                .setView({
                                    type: "markdown",
                                    props: { content: content },
                                    layout: (make, view) => {
                                        make.size.equalTo(view.super)
                                    }
                                })
                                .init()
                                .present()
                        }
                    }
                ]
            },
            {
                inline: true,
                items: [
                    {
                        // share
                        title: $l10n("SHARE"),
                        symbol: "square.and.arrow.up",
                        handler: (collectionView, indexPath, info) => {
                            this.data.exportAction(info)
                        }
                    },
                    {
                        // share
                        title: "URL Scheme",
                        symbol: "link",
                        handler: (collectionView, indexPath, info) => {
                            $clipboard.text = this.data.getActionURLScheme(info)
                            $ui.success($l10n("COPIED"))
                        }
                    },
                    {
                        // 删除
                        title: $l10n("DELETE"),
                        symbol: "trash",
                        destructive: true,
                        handler: (collectionView, indexPath, info) => {
                            UIKit.deleteConfirm($l10n("DELETE_CONFIRM_MSG"), () => {
                                this.data.delete(info)
                                this.data.applySnapshotToSectionAnimatingDifferences(indexPath.$section())
                            })
                        }
                    }
                ]
            }
        ]

        return { items: menus }
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

    createUICollectionViewDropPlaceholder(destinationIndexPath) {
        const placeholder = $objc("UICollectionViewDropPlaceholder").$alloc()
        placeholder.$initWithInsertionIndexPath_reuseIdentifier(
            destinationIndexPath,
            this.data.placeholderReuseIdentifier
        )

        return placeholder
    }

    updateEditingToolBar() {
        const isEmpty = this.matrixSelected.length === 0

        const editButton = $(this.views.editingToolBarId + "-select-button")
        const deleteButton = $(this.views.editingToolBarId + "-delete-button")

        editButton.title = isEmpty ? $l10n("SELECT_ALL") : $l10n("DESELECT_ALL")
        deleteButton.hidden = isEmpty
    }

    toggleAllSelected(deselecteAll = false, updateEditModeToolBar = true) {
        const length = this.data.clips.length
        if (deselecteAll || this.matrixSelected.length !== 0) {
            for (let i = 0; i < length; i++) {
                const indexPath = $indexPath(0, i).ocValue()
                this.collectionView.$deselectItemAtIndexPath_animated(indexPath, false)
            }
        } else if (this.matrixSelected.length === 0) {
            for (let i = 0; i < length; i++) {
                const indexPath = $indexPath(0, i).ocValue()
                this.collectionView.$selectItemAtIndexPath_animated_scrollPosition(indexPath, false, 0)
            }
        }

        if (updateEditModeToolBar && this.collectionView.$isEditing()) {
            this.updateEditingToolBar()
        }
    }

    deleteSelected() {
        UIKit.deleteConfirm($l10n("DELETE_CONFIRM_MSG"), () => {
            // 倒序排序
            const selected = this.matrixSelected.sort((a, b) => {
                return a.item < b.item
            })
            // 关闭编辑模式
            this.setEditing(false)

            //this.data.applySnapshotAnimatingDifferences()
        })
    }

    /**
     * @param {boolean} mode
     */
    setEditing(mode) {
        let status = mode !== undefined ? mode : !this.collectionView.$isEditing()

        if (status === this.collectionView.$isEditing()) {
            return
        }

        this.collectionView.$setEditing(status)
        if (typeof this.#setEditingCallback === "function") {
            this.#setEditingCallback(status)
        }

        if (!status) {
            // 非强制关闭编辑模式
            $(this.views.editingToolBarId).remove()
        } else {
            const toolBar = $ui.create(
                this.views.getMatrixEditModeToolBarView({
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

    didSelectItemAtIndexPath(collectionView, indexPath) {
        if (collectionView.$isEditing()) {
            this.updateEditingToolBar()
            return
        }
        if (collectionView.$hasActiveDrag()) {
            return
        }

        const info = this.getActionByIndexPath(indexPath)
        this.data.getActionHandler(info.category, info.dir)({ env: ActionEnv.action })
    }
    didDeselectItemAtIndexPath(collectionView, indexPath) {
        if (collectionView.$isEditing()) {
            this.updateEditingToolBar()
        }
    }

    contextMenuConfigurationForItemAtIndexPath(collectionView, indexPath, point) {
        // 编辑模式不显示菜单
        if (collectionView.$isEditing()) return

        const generateUIMenu = menu => {
            const actions = []
            menu.items.forEach(action => {
                if (action.items) {
                    actions.push(generateUIMenu(action))
                } else {
                    actions.push(
                        this.createUIAction({
                            title: action.title,
                            image: action.symbol,
                            handler: () => {
                                action.handler(collectionView, indexPath, this.getActionByIndexPath(indexPath))
                            },
                            destructive: action.destructive
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

    /**
     * 配合 easy-jsbox 大标题
     * @returns
     */
    scrollViewDelegate() {
        const events = this.data.navigationView.view.scrollableView.events
        return {
            "scrollViewDidScroll:": scrollView => {
                events.didScroll(scrollView.jsValue())
            },
            "scrollViewDidEndDragging:willDecelerate:": (scrollView, decelerate) => {
                events.didEndDragging(scrollView.jsValue(), decelerate)
            },
            "scrollViewDidEndDecelerating:": scrollView => {
                events.didEndDecelerating(scrollView.jsValue())
            },
            "handleRefresh:": async refreshControl => {
                if (this.kernel.setting.get("webdav.status")) {
                    this.data.sync()
                } else {
                    this.data.applySnapshotAnimatingDifferences()
                    refreshControl.$endRefreshing()
                }
            }
        }
    }

    setRefreshControl() {
        const refreshControl = $objc("UIRefreshControl").$alloc().$init()
        refreshControl.$addTarget_action_forControlEvents(this.collectionView.$delegate(), "handleRefresh:", 1 << 12)
        if (this.kernel.setting.get("webdav.status")) {
            const syncDate = $l10n("MODIFIED") + this.data.getLocalSyncDate().toLocaleString()
            const attributedString = $objc("NSAttributedString").$alloc().$initWithString(syncDate)
            refreshControl.$setAttributedTitle(attributedString)
        }
        this.collectionView.$setRefreshControl(refreshControl)
    }

    delegate() {
        const events = {
            ...this.scrollViewDelegate(),
            "collectionView:shouldBeginMultipleSelectionInteractionAtIndexPath:": (collectionView, indexPath) => {
                return false
            },
            "collectionView:didSelectItemAtIndexPath:": (collectionView, indexPath) => {
                this.didSelectItemAtIndexPath(collectionView, indexPath)
            },
            "collectionView:didDeselectItemAtIndexPath:": (collectionView, indexPath) => {
                this.didDeselectItemAtIndexPath(collectionView, indexPath)
            },
            "collectionView:contextMenuConfigurationForItemsAtIndexPaths:point:": (
                collectionView,
                indexPaths,
                point
            ) => {
                return this.contextMenuConfigurationForItemAtIndexPath(collectionView, indexPaths.$firstObject(), point)
            },
            "collectionView:contextMenuConfigurationForItemAtIndexPath:point:": (collectionView, indexPath, point) => {
                return this.contextMenuConfigurationForItemAtIndexPath(collectionView, indexPath, point)
            },
            "collectionView:layout:sizeForItemAtIndexPath:": (collectionView, layout, indexPath) => {
                const space = this.views.spacing * (this.views.columns + 1)
                const width = (collectionView.$frame().width - space) / this.views.columns
                return $size(width, this.views.itemHeight)
            },
            "collectionView:layout:referenceSizeForHeaderInSection:": (collectionView, layout, section) => {
                const width = collectionView.$frame().width - this.views.spacing * 2
                return $size(width, this.views.headerHeight)
            }
        }

        return $delegate({
            type: "UICollectionViewDelegate, UICollectionViewDelegateFlowLayout",
            events
        })
    }

    itemsForBeginningDragSession(session, indexPath) {
        const info = this.getActionByIndexPath(indexPath)
        const itemProvider = $objc("NSItemProvider").$alloc().$init()
        itemProvider.$setSuggestedName(info.name + ".json")
        itemProvider.$registerDataRepresentationForTypeIdentifier_visibility_loadHandler(
            "public.text",
            0,
            $block("NSProgress *, block", completionHandler => {
                const string = this.data.actionToString(info.category, info.dir)
                const data = $data({ string }).ocValue()
                completionHandler(data, null)
                return null
            })
        )
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
            "collectionView:itemsForBeginningDragSession:atIndexPath:": (collectionView, session, indexPath) => {
                return this.itemsForBeginningDragSession(session, indexPath)
            }
        }

        return $delegate({
            type: "UICollectionViewDragDelegate",
            events
        })
    }

    reorder(coordinator) {
        // 排序只有一个可以拖拽
        const item = coordinator.$items().$firstObject()
        const source = item.$sourceIndexPath().jsValue()
        const destinationIndexPath = coordinator.$destinationIndexPath()
        const destination = destinationIndexPath.jsValue()

        this.data.move(source, destination)

        this.data.applySnapshotAnimatingDifferences(false)
        this.data.applySnapshotToSectionAnimatingDifferences(source.section)
        if (source.section !== destination.section) {
            this.data.applySnapshotToSectionAnimatingDifferences(destination.section)
        }

        coordinator.$dropItem_toItemAtIndexPath(item.$dragItem(), destinationIndexPath)
    }

    dropItems(coordinator) {
        const destinationIndexPath = coordinator.$destinationIndexPath()
        if (!destinationIndexPath) return

        const items = coordinator.$items()
        const count = items.$count()

        for (let i = 0; i < count; i++) {
            const item = items.$objectAtIndex(i)

            const placeholder = this.createUICollectionViewDropPlaceholder(destinationIndexPath)
            const placeholderContext = coordinator.$dropItem_toPlaceholder(item.$dragItem(), placeholder)

            const itemProvider = placeholderContext.$dragItem().$itemProvider()
            const typeIdentifiers = itemProvider.$registeredTypeIdentifiers().jsValue()

            const hasText = itemProvider.$hasItemConformingToTypeIdentifier("public.text")
            if (!hasText && !hasImage) {
                return
            }

            const completionHandler = (data, error) => {
                if (error) {
                    $ui.alert(error.jsValue())
                    this.kernel.logger.error(error.jsValue())
                }

                placeholderContext.$commitInsertionWithDataSourceUpdates(
                    $block("void, NSIndexPath *", insertionIndexPath => {
                        insertionIndexPath = insertionIndexPath.jsValue()
                        const section = insertionIndexPath.section
                        const categories = this.data.getActionCategories()
                        const dataObj = JSON.parse(data.jsValue().string)
                        const dir = this.data.importAction(dataObj, categories[section])
                        // 查找动作保存位置
                        const actions = this.data.actions[section].items
                        let inserted
                        for (const i in actions) {
                            if (actions[i].dir === dir) {
                                inserted = i
                                break
                            }
                        }
                        if (inserted !== undefined) {
                            // 移动到新位置
                            this.data.move($indexPath(section, inserted), insertionIndexPath)
                        }

                        this.data.applySnapshotToSectionAnimatingDifferences(section)
                    })
                )
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
            "collectionView:canHandleDropSession:": (collectionView, session) => {
                // 编辑状态只能拖不能放
                return !collectionView.$isEditing()
            },
            "collectionView:dropSessionDidUpdate:withDestinationIndexPath:": (
                collectionView,
                session,
                destinationIndexPath
            ) => {
                const dropProposal = $objc("UICollectionViewDropProposal").$alloc()
                if (session.$localDragSession()) {
                    // app 内拖拽
                    dropProposal.$initWithDropOperation_intent(3, 1)
                } else {
                    // 来自外部 app
                    dropProposal.$initWithDropOperation_intent(2, 1)
                }
                return dropProposal
            },
            "collectionView:performDropWithCoordinator:": (collectionView, coordinator) => {
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
            type: "UICollectionViewDropDelegate",
            events
        })
    }

    setDelegate() {
        this.collectionView = this.data.collectionView

        this.collectionView.$setDelegate(this.delegate())
        this.collectionView.$setCollectionViewLayout(this.views.collectionViewFlowLayout())

        this.collectionView.$setDragDelegate(this.dragDelegate())
        this.collectionView.$setDropDelegate(this.dropDelegate())
    }
}

module.exports = ActionDelegates
