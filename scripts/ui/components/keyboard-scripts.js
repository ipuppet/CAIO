const {
    UIKit,
    Sheet,
    NavigationItem,
    PageController
} = require("../../libs/easy-jsbox")

class KeyboardScripts {
    constructor() {
        this.listId = "keyboard-clipboard-list"
    }

    static getAddins() {
        const addins = $cache.get("keyboard.addins")
        if (addins === undefined) {
            this.setAddins()
            return []
        }
        return JSON.parse(addins)
    }

    static setAddins(list = []) {
        list.map((item, i) => {
            if (item === null) {
                list.splice(i, 1)
            }
        })
        $cache.set("keyboard.addins", JSON.stringify(list))
    }

    getUnsetAddins() {
        const current = $addin.current.name // 用于排除自身
        const addins = KeyboardScripts.getAddins()
        const res = []
        $addin.list?.forEach(addin => {
            const name = addin.displayName
            if (addins.indexOf(name) === -1 && current !== name) {
                res.push(name)
            }
        })
        return res
    }

    add() {
        const view = {
            type: "list",
            props: {
                data: this.getUnsetAddins()
            },
            events: {
                didSelect: (sender, indexPath, data) => {
                    const addins = KeyboardScripts.getAddins()
                    addins.unshift(data)
                    KeyboardScripts.setAddins(addins)
                    $(this.listId).insert({
                        indexPath: $indexPath(0, 0),
                        value: data
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
                data: KeyboardScripts.getAddins(),
                actions: [
                    {
                        title: "delete",
                        handler: (sender, indexPath) => {
                            KeyboardScripts.setAddins(sender.data)
                        }
                    }
                ]
            },
            layout: $layout.fill
        }
    }

    static getPageController() {
        const keyboardScripts = new KeyboardScripts()
        const pageController = new PageController()
        pageController
            .setView(keyboardScripts.getListView())
            .navigationItem
            .setTitle($l10n("QUICK_START_SCRIPTS"))
            .setLargeTitleDisplayMode(NavigationItem.largeTitleDisplayModeNever)
            .setRightButtons(keyboardScripts.getNavButtons())
        return pageController
    }

    static push() {
        const keyboardScripts = new KeyboardScripts()
        const navButtons = keyboardScripts.getNavButtons().map(item => {
            item.handler = item.tapped
            delete item.tapped
            return item
        })
        UIKit.push({
            navButtons: navButtons,
            views: [keyboardScripts.getListView()]
        })
    }
}

module.exports = KeyboardScripts