const { Sheet } = require("../../libs/easy-jsbox")

/**
 * @typedef {import("../../app-main").AppKernel} AppKernel
 */

class SelectActions {
    cacheKey

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
    }

    setKernel(kernel) {
        this.kernel = kernel
        return this
    }

    getRawActions() {
        const actions = $cache.get(this.cacheKey)
        if (!Array.isArray(actions)) {
            return []
        }
        return actions
    }

    getActions(defaultAll = false) {
        const actions = this.getRawActions()
        const existsAction = actions.filter(action => this.kernel.actions.exists(action.category, action.dir))
        if (existsAction.length === 0 && defaultAll) {
            return Object.values(this.kernel.actions.allActions)
        }
        return existsAction
    }

    addAction(action) {
        const actions = this.getActions()
        actions.push(action)
        $cache.set(this.cacheKey, actions)
    }

    setActions(actions = []) {
        $cache.set(this.cacheKey, actions)
    }

    updateAction(from, to) {
        this.setActions(
            // Using getRawActions to ensure not losing actions
            // this.kernel.actions.exists will filter out actions that do not exist if using getActions
            this.getRawActions().map(action => {
                if (action.category === from.category && action.dir === from.dir) {
                    this.kernel.logger.info(
                        `Updating action from ${from.category}/${from.dir} to ${to.category}/${to.dir}`
                    )
                    return to
                }
                return action
            })
        )
    }

    add() {
        const selectionId = "keyboard.add.sheet"
        const getSelectionData = () => {
            const selected = this.getActions().map(a => a.name)
            const data = this.kernel.actions.actionList
            for (let i = 0; i < data.length; i++) {
                data[i].items = data[i].items.filter(action => {
                    return selected.indexOf(action.name.text) === -1
                })
            }
            data.map(category => {
                category.rows = category.items
                return category
            })
            return data
        }
        const view = this.kernel.actions.views.getActionListView(
            (_, action) => {
                this.addAction(action)
                $(this.listId).data = this.getListData()
                $(selectionId).data = getSelectionData()
            },
            {
                id: selectionId,
                bgcolor: $color("primarySurface"),
                stickyHeader: false,
                data: getSelectionData()
            },
            {},
            $layout.fill
        )
        const sheet = new Sheet()
        sheet
            .setView(view)
            .addNavBar({ title: $l10n("ADD") })
            .init()
            .present()
    }

    getNavButtons() {
        return [
            {
                symbol: "plus",
                tapped: () => this.add()
            }
        ]
    }

    getListData(actions = this.getActions()) {
        return actions.map(action => {
            return this.kernel.actions.views.actionToData(action)
        })
    }

    getListView() {
        return this.kernel.actions.views.getActionListView(
            undefined,
            {
                id: this.listId,
                bgcolor: $color("primarySurface"),
                stickyHeader: false,
                reorder: true,
                data: this.getListData(),
                actions: [
                    {
                        title: "delete",
                        handler: (sender, indexPath) => {
                            const data = sender.data
                            this.setActions(data.map(data => data.info.info))
                        }
                    }
                ]
            },
            {
                reorderFinished: data => {
                    this.setActions(data.map(data => data.info.info))
                }
            },
            $layout.fill
        )
    }

    async sheet() {
        const sheet = new Sheet()
        sheet.setView(this.getListView()).addNavBar({
            title: $l10n("PIN_ACTION"),
            popButton: { title: $l10n("DONE") },
            rightButtons: this.getNavButtons()
        })

        sheet.init().present()
    }
}

module.exports = {
    SelectActions
}
