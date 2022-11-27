const { UIKit, SearchBar } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class ClipsSearch {
    /**
     * @type {AppKernel}
     */
    kernel
    callback = () => {}
    onBegin = () => {}
    onDismiss = () => {}

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
        this.listId = "clips-list-search"

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

    getAccessoryView() {
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
                    tapped: () => this.dismiss()
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
                    tapped: () => $(this.searchBarId).blur()
                }
            }
        ])
    }

    getSearchHistoryView() {
        return {
            type: "list",
            props: {
                id: this.listId + "-history",
                hidden: true,
                stickyHeader: true,
                data: this.searchHistory,
                separatorInset: $insets(0, 13, 0, 0),
                actions: [
                    {
                        title: $l10n("DELETE"),
                        handler: (sender, indexPath) => {
                            const data = sender.data
                            this.updateSearchHistory(data[0].rows.reverse())
                        }
                    }
                ]
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

    setCallback(callback) {
        this.callback = callback
    }

    setOnBegin(callback) {
        this.onBegin = callback
    }

    setOnDismiss(callback) {
        this.onDismiss = callback
    }

    begin() {
        this.searchHistoryView.show()
        this.onBegin()
    }

    dismiss() {
        $(this.searchBarId).blur()
        $(this.searchBarId).text = ""

        this.searchHistoryView.hide()
        this.onDismiss()
    }

    searchAction(text) {
        try {
            if (text !== "") {
                const res = this.kernel.storage.search(text)
                if (res && res.length > 0) {
                    $(this.searchBarId).blur()
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
            if (history.length > 20) {
                history = history.slice(-20)
            }
            $(this.listId + "-history").data = this.searchHistory
            $cache.set("caio.search.history", history)
        }
    }

    updateSearchHistory(data = []) {
        $cache.set("caio.search.history", data)
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
        this.searchBar.setEvent("didBeginEditing", sender => {
            if (sender.text === "") this.begin()
        })

        this.searchBar.setAccessoryView(this.getAccessoryView())

        return this.searchBar
    }
}

module.exports = ClipsSearch
