const { UIKit, Sheet, NavigationItem, PageController } = require("../../libs/easy-jsbox")

/**
 * @typedef {import("../../app").AppKernel} AppKernel
 */

class TodayActions {
    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.listId = "today-action-list"
        this.kernel = kernel
    }

    getActions() {
        let cache = $cache.get("today.actions") ?? []
        if (typeof cache === "string") {
            cache = JSON.parse(cache)
            this.setActions(cache)
        }
        const actions = {}
        this.kernel.actionManager.getActionTypes().forEach(type => {
            this.kernel.actionManager.getActions(type).forEach(action => {
                actions[action.type + action.dir] = action
            })
        })

        const savedActions = []
        cache.forEach(action => {
            savedActions.push(actions[action.type + action.dir])
        })

        return savedActions
    }

    setActions(list = []) {
        list.map((item, i) => {
            if (item === null) {
                list.splice(i, 1)
            }
        })
        $cache.set("today.actions", list)
    }

    getAllActions() {
        let actions = []
        this.kernel.actionManager.getActionTypes().forEach(type => {
            actions = actions.concat(this.kernel.actionManager.getActions(type))
        })
        return actions
    }

    getUnsetActions() {
        const actions = this.getActions().map(action => action.name)
        const res = []
        this.getAllActions().forEach(action => {
            const name = action.name
            if (actions.indexOf(name) === -1) {
                res.push(action)
            }
        })
        return res
    }

    getListData(actions) {
        return actions.map(action => {
            return {
                action: {
                    text: action.name,
                    info: action
                },
                icon:
                    action.icon.slice(0, 5) === "icon_"
                        ? { icon: $icon(action.icon.slice(5, action.icon.indexOf(".")), $color("#ffffff")) }
                        : { image: $image(action.icon) },
                color: { bgcolor: this.kernel.setting.getColor(action.color) }
            }
        })
    }

    getListTemplate() {
        return {
            views: [
                {
                    type: "image",
                    props: {
                        id: "color",
                        cornerRadius: 8,
                        smoothCorners: true
                    },
                    layout: make => {
                        make.top.left.inset(10)
                        make.size.equalTo($size(30, 30))
                    }
                },
                {
                    type: "image",
                    props: {
                        id: "icon",
                        tintColor: $color("#ffffff")
                    },
                    layout: make => {
                        make.top.left.inset(15)
                        make.size.equalTo($size(20, 20))
                    }
                },
                {
                    type: "label",
                    props: { id: "action" },
                    layout: (make, view) => {
                        make.bottom.top.inset(10)
                        make.left.equalTo(view.prev.prev.right).offset(10)
                        make.right.inset(10)
                    }
                }
            ]
        }
    }

    add() {
        const view = {
            type: "list",
            props: {
                data: this.getListData(this.getUnsetActions()),
                template: this.getListTemplate(),
                rowHeight: 50
            },
            events: {
                didSelect: (sender, indexPath, data) => {
                    const action = data.action.info
                    const actions = this.getActions()
                    actions.unshift(action)
                    this.setActions(actions)
                    $(this.listId).insert({
                        indexPath: $indexPath(0, 0),
                        value: this.getListData([action])[0]
                    })
                    sender.delete(indexPath)
                }
            },
            layout: $layout.fill
        }
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

    getListView() {
        return {
            type: "list",
            props: {
                id: this.listId,
                data: this.getListData(this.getActions()),
                template: this.getListTemplate(),
                rowHeight: 50,
                reorder: true,
                actions: [
                    {
                        title: "delete",
                        handler: (sender, indexPath) => {
                            this.setActions(sender.data.map(data => data.action.info))
                        }
                    }
                ]
            },
            events: {
                reorderFinished: data => {
                    const actions = []
                    data.forEach(data => {
                        actions.push(data.action.info)
                    })
                    this.setActions(actions)
                }
            },
            layout: $layout.fill
        }
    }

    static getPageController(kernel) {
        const todayActions = new TodayActions(kernel)
        const pageController = new PageController()
        pageController
            .setView(todayActions.getListView())
            .navigationItem.setTitle($l10n("ACTIONS"))
            .setLargeTitleDisplayMode(NavigationItem.largeTitleDisplayModeNever)
            .setRightButtons(todayActions.getNavButtons())
        return pageController
    }

    static push(kernel) {
        const todayActions = new TodayActions(kernel)
        const navButtons = todayActions.getNavButtons().map(item => {
            item.handler = item.tapped
            delete item.tapped
            return item
        })
        UIKit.push({
            navButtons: navButtons,
            views: [todayActions.getListView()]
        })
    }
}

module.exports = TodayActions
