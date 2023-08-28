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
    collectionView

    placeholderReuseIdentifier = "UICollectionViewPlaceholderReuseIdentifier"
    cellReuseIdentifier = "ActionCollectionViewCellReuseIdentifier"
    headerReuseIdentifier = "ActionViewCustomHeaderReuseIdentifier"
    footerReuseIdentifier = "ActionViewCustomFooterReuseIdentifier"

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

    getNavButtons() {
        return [
            {
                // 添加
                symbol: "plus.circle",
                id: this.views.addActionButtonId,
                menu: {
                    pullDown: true,
                    asPrimary: true,
                    items: [
                        {
                            title: $l10n("CREATE_NEW_ACTION"),
                            handler: () => {
                                this.editActionInfoPageSheet(null, async info => {
                                    const MainJsTemplate = $file.read(`${this.actionPath}/template.js`).string
                                    this.saveMainJs(info, MainJsTemplate)
                                    this.applySnapshotAnimatingDifferences()
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
            }
        ]
    }

    updateSyncLabel(message) {
        if (!message) {
            message = $l10n("MODIFIED") + this.getLocalSyncData().toLocaleString()
        }
        if ($(this.views.syncLabelId)) {
            $(this.views.syncLabelId).text = message
        }
    }

    updateNavButton(loading) {
        const addActionButton = this.navigationView?.navigationBarItems?.getButton(this.views.addActionButtonId)
        if (addActionButton) {
            addActionButton.setLoading(loading)
        }
        const sortActionButton = this.navigationView?.navigationBarItems?.getButton(this.views.sortActionButtonId)
        if (sortActionButton) {
            sortActionButton.setLoading(loading)
        }
        const syncButton = this.navigationView?.navigationBarItems?.getButton(this.views.syncButtonId)
        if (syncButton) {
            syncButton.setLoading(loading)
        }
    }

    initReuseIdentifier() {
        this.collectionView.$registerClass_forCellReuseIdentifier(
            $objc("UICollectionViewCell").$class(),
            this.placeholderReuseIdentifier
        )
        this.collectionView.$registerClass_forCellWithReuseIdentifier(
            $objc("UICollectionViewCell").$class(),
            this.cellReuseIdentifier
        )

        this.views.actionViewCustomHeader()
        this.collectionView.$registerClass_forSupplementaryViewOfKind_withReuseIdentifier(
            $objc("ActionViewCustomHeader").$class(),
            "UICollectionElementKindSectionHeader",
            this.headerReuseIdentifier
        )

        this.views.actionViewCustomFooter()
        this.collectionView.$registerClass_forSupplementaryViewOfKind_withReuseIdentifier(
            $objc("ActionViewCustomFooter").$class(),
            "UICollectionElementKindSectionFooter",
            this.footerReuseIdentifier
        )
    }

    initDataSource() {
        const cellProvider = $block(
            "UICollectionViewCell *, UICollectionView *, NSIndexPath *, id",
            (collectionView, indexPath, itemIdentifier) => {
                const cell = collectionView.$dequeueReusableCellWithReuseIdentifier_forIndexPath(
                    this.cellReuseIdentifier,
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
                            this.headerReuseIdentifier,
                            indexPath
                        )
                    headerView.$titleLabel().$setText(this.actions[section].title)
                    return headerView
                } else {
                    const footerView =
                        collectionView.$dequeueReusableSupplementaryViewOfKind_withReuseIdentifier_forIndexPath(
                            kind,
                            this.footerReuseIdentifier,
                            indexPath
                        )
                    return footerView
                }
            }
        )
        const dataSource = $objc("UICollectionViewDiffableDataSource").$alloc()
        dataSource.$initWithCollectionView_cellProvider(this.collectionView, cellProvider)
        dataSource.$setSupplementaryViewProvider(supplementaryViewProvider)
        $objc_retain(dataSource)
    }

    applySnapshotUsingReloadData() {
        const snapshot = $objc("NSDiffableDataSourceSnapshot").$alloc().$init()
        const actions = this.actions
        snapshot.$appendSectionsWithIdentifiers(actions.map(i => i.id))
        for (const i in actions) {
            snapshot.$appendItemsWithIdentifiers_intoSectionWithIdentifier(
                actions[i].items.map(i => i.dir),
                actions[i].id
            )
        }

        this.collectionView.$dataSource().$applySnapshotUsingReloadData(snapshot)
    }

    applySnapshotAnimatingDifferences(animating = true) {
        const snapshot = $objc("NSDiffableDataSourceSnapshot").$alloc().$init()
        const actions = this.actions
        snapshot.$appendSectionsWithIdentifiers(actions.map(i => i.id))
        for (const i in actions) {
            snapshot.$appendItemsWithIdentifiers_intoSectionWithIdentifier(
                actions[i].items.map(i => i.dir),
                actions[i].id
            )
        }

        this.collectionView.$dataSource().$applySnapshot_animatingDifferences(snapshot, animating)
    }

    getMatrixView() {
        const events = {
            ready: collectionView => {
                this.collectionView = collectionView.ocValue()
                $delay(0.3, () => {
                    this.initReuseIdentifier()
                    this.delegates.setDelegate()
                    this.initDataSource()
                    this.applySnapshotUsingReloadData()
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
                id: this.views.syncButtonId,
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
