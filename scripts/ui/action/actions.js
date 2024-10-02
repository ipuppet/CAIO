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
        return super.actions.map(category => {
            const items = []
            category.items.forEach(action => {
                items.push(this.views.actionToData(action))
            })

            // 返回新对象
            return {
                title: category.title,
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
                } else if (args.status === WebDavSync.status.success || args.status === WebDavSync.status.nochange) {
                    try {
                        this.setNeedReload(true)
                    } catch (error) {
                        this.kernel.logger.error(error)
                        this.updateSyncLabel(error)
                    } finally {
                        this.updateSyncLabel()
                        this.updateNavButton(false)
                        this.collectionView.jsValue().endRefreshing()
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
        const importAction = [
            {
                title: $l10n("IMPORT_FROM_FILE"),
                handler: async () => {
                    const data = await $drive.open()
                    try {
                        if (!data) return
                        this.importAction(JSON.parse(data.string))
                        this.applySnapshotAnimatingDifferences()
                    } catch (error) {
                        this.kernel.logger.error(error)
                    }
                }
            }
        ]
        const addItems = [
            {
                title: $l10n("CREATE_NEW_ACTION"),
                handler: () => {
                    this.editActionInfoPageSheet(null, async info => {
                        const MainJsTemplate = $file.read(`${this.actionPath}/template.js`).string
                        this.saveMainJs(info, MainJsTemplate)
                        const section = this.getActionCategorySection(info.category)
                        this.applySnapshotToSectionAnimatingDifferences(section)
                        await $wait(0.3)
                        this.editActionMainJs(MainJsTemplate, info)
                    })
                }
            },
            {
                title: $l10n("CREATE_NEW_TYPE"),
                handler: () => this.addActionCategory()
            },
            {
                inline: true,
                items: importAction
            }
        ]

        return [
            {
                symbol: "plus.circle",
                id: this.views.addActionButtonId,
                menu: {
                    pullDown: true,
                    asPrimary: true,
                    items: addItems
                }
            }
        ]
    }

    getActionURLScheme(action) {
        const needed = {
            dir: action.dir,
            category: action.category
        }
        const encodedAction = $text.base64Encode(JSON.stringify(needed))
        return `jsbox://run?name=${$addin.current.name}&runAction=${encodedAction}`
    }

    updateSyncLabel(message) {
        if (!message) {
            message = $l10n("MODIFIED") + this.getLocalSyncDate().toLocaleString()
        }
        const refreshControl = this.collectionView?.$refreshControl()
        if (!refreshControl) return
        const syncDate = message
        const attributedString = $objc("NSAttributedString").$alloc().$initWithString(syncDate)
        refreshControl.$setAttributedTitle(attributedString)
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
        this.collectionView.$registerClass_forCellWithReuseIdentifier(
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
        snapshot.$appendSectionsWithIdentifiers(actions.map(i => i.dir))
        for (const i in actions) {
            snapshot.$appendItemsWithIdentifiers_intoSectionWithIdentifier(
                actions[i].items.map(i => i.dir),
                actions[i].dir
            )
        }

        this.collectionView.$dataSource().$applySnapshotUsingReloadData(snapshot)
    }
    applySnapshotAnimatingDifferences(animating = true) {
        const snapshot = $objc("NSDiffableDataSourceSnapshot").$alloc().$init()
        const actions = this.actions
        snapshot.$appendSectionsWithIdentifiers(actions.map(i => i.dir + i.items.length))
        for (const i in actions) {
            snapshot.$appendItemsWithIdentifiers_intoSectionWithIdentifier(
                actions[i].items.map(i => i.category + i.dir + i.name + i.icon),
                actions[i].dir + actions[i].items.length
            )
        }

        this.collectionView.$dataSource().$applySnapshot_animatingDifferences(snapshot, animating)
    }
    applySnapshotToSectionAnimatingDifferences(section, animating = true) {
        const snapshot = $objc("NSDiffableDataSourceSectionSnapshot").$alloc().$init()
        let { items: actions, dir: sectionIdentifier } = this.actions[section]
        sectionIdentifier = sectionIdentifier + actions.length
        snapshot.$appendItems(actions.map(i => i.category + i.dir + i.name + i.icon))

        this.collectionView
            .$dataSource()
            .$applySnapshot_toSection_animatingDifferences(snapshot, sectionIdentifier, animating)
    }

    getMatrixView() {
        const matrix = this.views.getMatrixView({
            ready: collectionView => {
                this.collectionView = collectionView.ocValue()
                this.initReuseIdentifier()
                this.delegates.setDelegate()
                this.delegates.setRefreshControl()
                this.initDataSource()
                this.applySnapshotUsingReloadData()
            }
        })

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
