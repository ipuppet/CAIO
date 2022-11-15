const { UIKit, SearchBar } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class ClipboardSearch {
    /**
     * @type {AppKernel}
     */
    kernel
    callback = () => {}
    dismiss = () => {}

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
        this.listId = "clipboard-list-search"

        this.searchBar = new SearchBar()
        this.searchBarId = this.searchBar.id + "-input"
    }

    get searchHistoryView() {
        return {
            hide: () => ($(this.listId + "-history").hidden = true),
            show: () => ($(this.listId + "-history").hidden = false)
        }
    }

    get searchHistory() {
        return [
            {
                title: $l10n("SEARCH_HISTORY"),
                rows: $cache.get("caio.search.history")?.reverse() ?? []
            }
        ]
    }

    get historyView() {
        return {
            type: "list",
            props: {
                id: this.listId + "-history",
                hidden: true,
                stickyHeader: true,
                data: this.searchHistory,
                separatorInset: $insets(0, 13, 0, 0)
            },
            events: {
                didSelect: (sender, indexPath, data) => {
                    this.searchAction(data)
                    $(this.searchBarId).text = data
                }
            },
            layout: $layout.fill
        }
    }

    get accessoryView() {
        return UIKit.blurBox({ height: 50 }, [
            {
                type: "button",
                props: {
                    bgcolor: $color("clear"),
                    tintColor: $color("primaryText"),
                    symbol: "xmark.circle"
                },
                layout: (make, view) => {
                    make.right.inset(0)
                    make.height.equalTo(view.super)
                    make.width.equalTo(view.super.height)
                },
                events: {
                    tapped: sender => {
                        $(this.searchBarId).blur()
                        $(this.searchBarId).text = ""

                        this.searchHistoryView.hide()

                        this.dismiss()
                    }
                }
            },
            {
                type: "button",
                props: {
                    bgcolor: $color("clear"),
                    tintColor: $color("primaryText"),
                    symbol: "keyboard.chevron.compact.down"
                },
                layout: (make, view) => {
                    make.right.equalTo(view.prev.left)
                    make.height.equalTo(view.super)
                    make.width.equalTo(view.super.height)
                },
                events: {
                    tapped: sender => {
                        $(this.searchBarId).blur()
                    }
                }
            }
        ])
    }

    setCallback(callback) {
        this.callback = callback
    }

    setDismiss(callback) {
        this.dismiss = callback
    }

    searchAction(text) {
        try {
            if (text !== "") {
                const res = this.kernel.storage.search(text)
                if (res && res.length > 0) {
                    this.searchHistoryView.hide()
                    this.callback(res)
                } else {
                    $ui.toast($l10n("NO_SEARCH_RESULT"))
                }
                // history
                this.pushSearchHistory(text)
            }
        } catch (error) {
            throw error
        }
    }

    pushSearchHistory(text) {
        let history = $cache.get("caio.search.history") ?? []
        if (history.indexOf(text) === -1) {
            history.push(text)
            if (history > 20) {
                history = history.slice(-20)
            }
            $(this.listId + "-history").data = this.searchHistory
            $cache.set("caio.search.history", history)
        }
    }

    getSearchBarView() {
        // 初始化搜索功能
        this.searchBar.controller.setEvent("onReturn", text => {
            if (text !== "") {
                this.searchAction(text)
            } else {
                this.searchHistoryView.show()
            }
        })
        this.searchBar.controller.setEvent("onChange", text => {
            if (text === "") this.searchHistoryView.show()
        })

        this.searchBar.setEvent("didBeginEditing", () => {
            if ($(this.searchBarId).text === "") {
                this.searchHistoryView.show()
            }
        })

        this.searchBar.setAccessoryView(this.accessoryView)

        return this.searchBar
    }
}

module.exports = ClipboardSearch
