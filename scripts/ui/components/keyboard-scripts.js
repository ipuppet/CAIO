const { Sheet } = require("../../libs/easy-jsbox")

class KeyboardScripts {
    constructor() {
        this.listId = "keyboard-script-list"
    }

    static getAddins() {
        const addins = $cache.get("keyboard.addins")
        if (!addins) {
            return []
        } else if ($cache.get("keyboard.addins.all")) {
            const current = $addin.current.name
            return $addin.list
                ?.filter(addin => {
                    return current !== addin.displayName
                })
                .map(i => i.displayName)
        }
        try {
            return JSON.parse(addins)
        } catch (error) {
            return []
        }
    }

    static setAddins(list = []) {
        list.map((item, i) => {
            if (item === null) {
                list.splice(i, 1)
            }
        })
        try {
            $cache.set("keyboard.addins", JSON.stringify(list))
        } catch (error) {
            $cache.set("keyboard.addins", undefined)
        }
    }

    static setAllAddins(useAll) {
        $cache.set("keyboard.addins.all", useAll)
    }

    getUnsetAddins() {
        const current = $addin.current.name
        const addins = KeyboardScripts.getAddins()
        return $addin.list
            ?.filter(addin => {
                return addins.indexOf(addin.displayName) === -1 && current !== addin.displayName
            })
            .map(i => i.displayName)
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

    static async sheet() {
        const selected = await $ui.menu({
            items: [$l10n("ALL_SCRIPTS"), $l10n("SELECT_SCRIPTS")]
        })
        if (selected.index === 0) {
            KeyboardScripts.setAllAddins(true)
        } else {
            KeyboardScripts.setAllAddins(false)
            const sheet = new Sheet()
            const keyboardScripts = new KeyboardScripts()
            sheet.setView(keyboardScripts.getListView()).addNavBar({
                title: $l10n("QUICK_START_SCRIPTS"),
                popButton: { title: $l10n("DONE") },
                rightButtons: keyboardScripts.getNavButtons()
            })

            sheet.init().present()
        }
    }
}

module.exports = KeyboardScripts
