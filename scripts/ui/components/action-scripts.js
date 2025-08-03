const { Sheet } = require("../../libs/easy-jsbox")

/**
 * @typedef {import("../../app-main").AppKernel} AppKernel
 */

class ActionScripts {
    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
        this.listId = "action-category-list"
    }

    getNavButtons() {
        return [
            {
                symbol: "plus",
                tapped: () => this.kernel.actions.addActionCategory()
            }
        ]
    }

    getActionCategories() {
        return this.kernel.actions.getActionCategories()
    }

    getListView() {
        return {
            type: "list",
            props: {
                id: this.listId,
                reorder: true,
                data: this.getActionCategories(),
                actions: [
                    {
                        title: " " + $l10n("DELETE") + " ",
                        color: $color("red"),
                        handler: async (sender, indexPath) => {
                            const result = await this.kernel.actions.deleteActionCategory(sender.object(indexPath))
                            if (result) {
                                sender.delete(indexPath)
                            }
                        }
                    }
                ]
            },
            events: {
                didSelect: async (sender, indexPath, data) => {
                    try {
                        const result = await this.kernel.actions.renameActionCategory(data)
                        if (result) {
                            sender.data = this.getActionCategories()
                        }
                    } catch (error) {
                        this.kernel.logger.error(`Failed to rename action category: ${error}`)
                    }
                },
                swipeEnabled: (sender, indexPath) => {
                    return sender.data.length > 1 // 禁止删除最后一个分类
                },
                reorderFinished: data => {
                    this.kernel.actions.saveActionCategoryOrder(data)
                }
            },
            layout: $layout.fill
        }
    }

    static async sheet(kernel) {
        const sheet = new Sheet()
        const actionScripts = new ActionScripts(kernel)
        sheet.setView(actionScripts.getListView()).addNavBar({
            title: $l10n("EDIT_CATEGORY"),
            popButton: { title: $l10n("DONE") },
            rightButtons: actionScripts.getNavButtons()
        })

        sheet.init().present()
    }
}

module.exports = ActionScripts
