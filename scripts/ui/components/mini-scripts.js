const {
    UIKit,
    Sheet
} = require("../../lib/easy-jsbox")

class MiniScripts {
    constructor() {
        this.listId = "mini-clipboard-list"
    }

    static getAddins() {
        const addins = $cache.get("mini.addins")
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
        $cache.set("mini.addins", JSON.stringify(list))
    }

    getUnsetAddins() {
        const current = $addin.current.name // 用于排除自身
        const addins = MiniScripts.getAddins()
        const res = []
        $addin.list?.forEach(addin => {
            if (addins.indexOf(addin.name) === -1 && current !== addin.name) {
                res.push(addin.name)
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
                    const addins = MiniScripts.getAddins()
                    addins.unshift(data)
                    MiniScripts.setAddins(addins)
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
            .addNavBar(
                $l10n("ADD"),
                () => { }
            )
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
                data: MiniScripts.getAddins(),
                actions: [
                    {
                        title: "delete",
                        handler: (sender, indexPath) => {
                            MiniScripts.setAddins(sender.data)
                        }
                    }
                ]
            },
            layout: $layout.fill
        }
    }

    static push(disappeared) {
        const miniScripts = new MiniScripts()
        const navButtons = miniScripts.getNavButtons().map(item => {
            item.handler = item.tapped
            delete item.tapped
            return item
        })
        UIKit.push({
            navButtons: navButtons,
            views: [miniScripts.getListView()],
            disappeared: () => disappeared()
        })
    }
}

module.exports = MiniScripts