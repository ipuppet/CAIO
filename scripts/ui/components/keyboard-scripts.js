const { Sheet } = require("../../libs/easy-jsbox")

class KeyboardScripts {
    constructor() {
        this.listId = "keyboard-script-list"
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
                reorder: true,
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
            events: {
                reorderFinished: data => {
                    KeyboardScripts.setAddins(data)
                }
            },
            layout: $layout.fill
        }
    }

    static sheet() {
        const sheet = new Sheet()
        const keyboardScripts = new KeyboardScripts()
        sheet.setView(keyboardScripts.getListView()).addNavBar({
            title: $l10n("QUICK_START_SCRIPTS"),
            popButton: { title: $l10n("CLOSE") },
            rightButtons: keyboardScripts.getNavButtons()
        })

        sheet.init().present()
    }
}

module.exports = KeyboardScripts
