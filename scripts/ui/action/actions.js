const { NavigationView, Sheet } = require("../../libs/easy-jsbox")
const ActionsData = require("../../dao/action-data")
const WebDavSync = require("../../dao/webdav-sync")
const ActionEditor = require("./editor")
const ActionViews = require("./views")
const ActionDelegates = require("./delegates")

/**
 * @typedef {import("../../app-main").AppKernel} AppKernel
 * @typedef {Actions} Actions
 */

class Actions extends ActionsData {
    matrix
    reorder = {}
    addActionButtonId = "action-manager-button-add"
    sortActionButtonId = "action-manager-button-sort"
    syncButtonId = "action-manager-button-sync"
    syncLabelId = "action-manager-sync-label"

    constructor(...args) {
        super(...args)
        this.views = new ActionViews(this.kernel, this)
        this.delegates = new ActionDelegates(this.kernel, this, this.views)
    }

    get actionList() {
        return super.actions.map(type => {
            const items = []
            type.items.forEach(action => {
                items.push(this.views.actionToData(action))
            })

            // 返回新对象
            return {
                title: type.title,
                items: items
            }
        })
    }

    /**
     * 监听同步信息
     */
    actionSyncStatus() {
        $app.listen({
            actionSyncStatus: args => {
                if (args.status === WebDavSync.status.syncing && args.animate) {
                    this.updateNavButton(true)
                    this.updateSyncLabel($l10n("SYNCING"))
                } else if (args.status === WebDavSync.status.success) {
                    try {
                        // this.matrix.data = this.actionList
                    } catch (error) {
                        this.kernel.logger.error(error)
                        this.updateSyncLabel(error)
                    } finally {
                        this.updateSyncLabel()
                        this.updateNavButton(false)
                        $(this.matrix.id)?.endRefreshing()
                    }
                }
            }
        })
    }

    editActionInfoPageSheet(info, done) {
        const editor = new ActionEditor(this, info)
        editor.editActionInfoPageSheet(done)
    }

    editActionMainJs(text = "", info) {
        const editor = new ActionEditor(this, info)
        editor.editActionMainJs(text)
    }

    move(from, to) {
        if (from.section === to.section && from.row === to.row) return

        super.move(from, to)

        // // 跨 section 时先插入或先删除无影响，type 永远是 to 的 type
        // const actionsView = this.matrix
        // // 内存数据已经为排序后的数据，故此处去 to 位置的数据
        // const data = this.views.actionToData(this.actions[to.section].items[to.row])
        // if (from.row < to.row) {
        //     // 先插入时是插入到 to 位置的前面 to.row + 1
        //     actionsView.insert({
        //         indexPath: $indexPath(to.section, from.section === to.section ? to.row + 1 : to.row),
        //         value: data
        //     })
        //     actionsView.delete(from)
        // } else {
        //     actionsView.delete(from)
        //     actionsView.insert({ indexPath: to, value: data })
        // }
    }

    getNavButtons() {
        return [
            {
                // 添加
                symbol: "plus.circle",
                id: this.addActionButtonId,
                menu: {
                    pullDown: true,
                    asPrimary: true,
                    items: [
                        {
                            title: $l10n("CREATE_NEW_ACTION"),
                            handler: () => {
                                this.editActionInfoPageSheet(null, async info => {
                                    this.matrix.insert({
                                        indexPath: $indexPath(this.getActionTypes().indexOf(info.type), 0),
                                        value: this.views.actionToData(info)
                                    })
                                    const MainJsTemplate = $file.read(`${this.actionPath}/template.js`).string
                                    this.saveMainJs(info, MainJsTemplate)
                                    await $wait(0.3)
                                    this.editActionMainJs(MainJsTemplate, info)
                                })
                            }
                        },
                        {
                            title: $l10n("CREATE_NEW_TYPE"),
                            handler: () => {
                                $input.text({
                                    text: "",
                                    placeholder: $l10n("CREATE_NEW_TYPE"),
                                    handler: text => {
                                        text = text.trim()
                                        if (text === "") {
                                            $ui.toast($l10n("INVALID_VALUE"))
                                            return
                                        }
                                        const path = `${this.userActionPath}/${text}`
                                        if ($file.isDirectory(path)) {
                                            $ui.warning($l10n("TYPE_ALREADY_EXISTS"))
                                        } else {
                                            $file.mkdir(path)
                                            $ui.success($l10n("SUCCESS"))
                                        }
                                    }
                                })
                            }
                        }
                    ]
                }
            },
            {
                // 排序
                symbol: "arrow.up.arrow.down.circle",
                id: this.sortActionButtonId,
                tapped: (animate, sender) => {
                    $ui.popover({
                        sourceView: sender,
                        directions: $popoverDirection.up,
                        size: $size(200, 300),
                        views: [
                            this.views.getActionListView(
                                undefined,
                                {
                                    reorder: true,
                                    actions: [
                                        {
                                            // 删除
                                            title: "delete",
                                            handler: (sender, indexPath) => {
                                                const matrixView = this.matrix
                                                const info = matrixView.object(indexPath, false).info.info
                                                this.delete(info)
                                                matrixView.delete(indexPath, false)
                                            }
                                        }
                                    ]
                                },
                                {
                                    reorderBegan: indexPath => {
                                        this.reorder.from = indexPath
                                        this.reorder.to = undefined
                                    },
                                    reorderMoved: (fromIndexPath, toIndexPath) => {
                                        this.reorder.to = toIndexPath
                                    },
                                    reorderFinished: data => {
                                        if (this.reorder.to === undefined) return
                                        this.move(this.reorder.from, this.reorder.to, data)
                                    }
                                }
                            )
                        ]
                    })
                }
            }
        ]
    }

    updateSyncLabel(message) {
        if (!message) {
            message = $l10n("MODIFIED") + this.getLocalSyncData().toLocaleString()
        }
        if ($(this.syncLabelId)) {
            $(this.syncLabelId).text = message
        }
    }

    updateNavButton(loading) {
        const addActionButton = this.navigationView?.navigationBarItems?.getButton(this.addActionButtonId)
        if (addActionButton) {
            addActionButton.setLoading(loading)
        }
        const sortActionButton = this.navigationView?.navigationBarItems?.getButton(this.sortActionButtonId)
        if (sortActionButton) {
            sortActionButton.setLoading(loading)
        }
        const syncButton = this.navigationView?.navigationBarItems?.getButton(this.syncButtonId)
        if (syncButton) {
            syncButton.setLoading(loading)
        }
    }

    initDataSource(collectionView) {
        const cellProvider = $block(
            "UICollectionViewCell *, UICollectionView *, NSIndexPath *, id",
            (collectionView, indexPath, itemIdentifier) => {
                const cell = collectionView.$dequeueReusableCellWithReuseIdentifier_forIndexPath(
                    "ActionCollectionViewCellReuseIdentifier",
                    indexPath
                )
                cell.$contentView().$setClipsToBounds(true)
                cell.$contentView().$layer().$setCornerRadius(10)
                const { section, item } = indexPath.jsValue()
                const view = this.views.matrixCell(this.actions[section].items[item])
                cell.$contentView().jsValue().add(view)
                return cell
            }
        )
        const supplementaryViewProvider = $block(
            "UICollectionReusableView *, UICollectionView *, NSString *, NSIndexPath *",
            (collectionView, kind, indexPath) => {
                const { section } = indexPath.jsValue()
                if (kind.jsValue() === "UICollectionElementKindSectionHeader") {
                    const headerView =
                        collectionView.$dequeueReusableSupplementaryViewOfKind_withReuseIdentifier_forIndexPath(
                            kind,
                            "ActionViewCustomHeaderReuseIdentifier",
                            indexPath
                        )
                    headerView.$titleLabel().$setText(this.actions[section].title)
                    return headerView
                } else {
                    const footerView =
                        collectionView.$dequeueReusableSupplementaryViewOfKind_withReuseIdentifier_forIndexPath(
                            kind,
                            "ActionViewCustomFooterReuseIdentifier",
                            indexPath
                        )
                    return footerView
                }
            }
        )
        const dataSource = $objc("UICollectionViewDiffableDataSource").$alloc()
        dataSource.$initWithCollectionView_cellProvider(collectionView, cellProvider)
        dataSource.$setSupplementaryViewProvider(supplementaryViewProvider)
        $objc_retain(dataSource)
    }

    applySnapshot(collectionView) {
        const snapshot = $objc("NSDiffableDataSourceSnapshot").$alloc().$init()
        const actions = this.actions
        snapshot.$appendSectionsWithIdentifiers(actions.map(i => i.id))
        for (const i in actions) {
            snapshot.$appendItemsWithIdentifiers_intoSectionWithIdentifier(
                actions[i].items.map(i => i.dir),
                actions[i].id
            )
        }

        collectionView.$dataSource().$applySnapshot_animatingDifferences(snapshot, true)
    }

    getMatrixView() {
        const events = {
            ready: collectionView => {
                collectionView = collectionView.ocValue()
                $delay(0.3, () => {
                    this.views.registerClass(collectionView)
                    this.initDataSource(collectionView)
                    this.applySnapshot(collectionView)
                    this.delegates.setDelegate(collectionView)
                })
            }
        }
        if (this.kernel.setting.get("webdav.status")) {
            events.pulled = () => this.sync()
        }
        const matrix = this.views.getMatrixView({ events })

        this.actionSyncStatus()

        return matrix
    }

    getPage() {
        this.navigationView = new NavigationView()
        this.navigationView.navigationBarItems.setRightButtons(this.getNavButtons())
        this.navigationView.setView(this.getMatrixView()).navigationBarTitle($l10n("ACTIONS"))
        return this.navigationView.getPage()
    }

    present() {
        const actionSheet = new Sheet()
        const rightButtons = this.getNavButtons()
        if (this.kernel.setting.get("webdav.status")) {
            rightButtons.push({
                // 同步
                id: this.syncButtonId,
                symbol: "arrow.triangle.2.circlepath.circle",
                tapped: () => this.sync()
            })
        }
        actionSheet
            .setView(this.getMatrixView())
            .addNavBar({
                title: $l10n("ACTIONS"),
                popButton: { symbol: "xmark.circle" },
                rightButtons: rightButtons
            })
            .init()

        this.navigationView = actionSheet.navigationView
        actionSheet.present()
    }
}

module.exports = Actions
