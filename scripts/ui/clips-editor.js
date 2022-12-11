const { View, UIKit, Sheet } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 * @typedef {import("./clips")} Clips
 */

class ClipsEditor {
    static symbol = { selected: "checkmark.circle.fill", unselected: "circle" }
    #textHeightCache = {}

    listId = "clips-list-editor"
    reorder = {}
    toolBarHeight = 44
    containerMargin = 30

    #editorSelected = undefined
    #editorSelectedContainer = {}

    /**
     * @param {Clips} clipsInstance
     */
    constructor(clipsInstance) {
        this.clipsInstance = clipsInstance
        this.kernel = clipsInstance.kernel
    }

    get editorSelectedIsEmpty() {
        let isEmpty = true
        const editorSelected = this.editorSelected
        for (const i of Object.keys(editorSelected)) {
            if (editorSelected[i]) {
                isEmpty = false
                break
            }
        }

        return isEmpty
    }

    get editorSelectedIsFull() {
        let selected = 0
        let len = 0
        const editorSelected = this.editorSelected
        for (const i of Object.keys(editorSelected)) {
            ++len
            if (editorSelected[i]) {
                ++selected
            }
        }

        return len === selected
    }

    get editorSelected() {
        if (this.#editorSelected === undefined) {
            // this.#editorSelectedContainer[i] 初始化
            Array(this.clipsInstance.clips.length)
                .fill(0)
                .map((v, i) => (this.#editorSelectedContainer[i] = false))

            this.#editorSelected = new Proxy(this.#editorSelectedContainer, {
                set: (editorSelected, key, value, receiver) => {
                    Reflect.set(editorSelected, key, value, receiver)

                    key = Number(key)

                    const isEmpty = this.editorSelectedIsEmpty

                    const editorButton = $(this.listId + "-select-button")
                    const deleteButton = $(this.listId + "-delete-button")
                    editorButton.title = this.editorSelectedIsFull ? $l10n("DESELECT_ALL") : $l10n("SELECT_ALL")
                    deleteButton.hidden = isEmpty

                    const listView = $(this.listId)
                    listView.data = this.clipsInstance.clips.map((data, i) => {
                        const item = this.lineData(data)
                        item.checkmark = {
                            symbol: editorSelected[i] ? ClipsEditor.symbol.selected : ClipsEditor.symbol.unselected
                        }
                        return item
                    })

                    // 有行被选中则禁止排序
                    listView.reorder = isEmpty

                    return true
                }
            })
        }
        return this.#editorSelected
    }

    set editorSelected(editorSelected) {
        this.#editorSelected = editorSelected
    }

    getTextHeight(text) {
        if (!this.#textHeightCache[text]) {
            this.#textHeightCache[text] = Math.min(
                $text.sizeThatFits({
                    text: text,
                    width: UIKit.windowSize.width - (this.clipsInstance.horizontalMargin + this.containerMargin) * 2,
                    font: $font(this.clipsInstance.fontSize)
                }).height,
                this.clipsInstance.singleLineHeight * 2
            )
        }
        return this.#textHeightCache[text]
    }

    selectAll() {
        const isFull = this.editorSelectedIsFull
        this.clipsInstance.clips.forEach((item, i) => {
            this.editorSelected[i] = !isFull
        })
    }

    deleteSelected() {
        this.kernel.deleteConfirm($l10n("CONFIRM_DELETE_MSG"), () => {
            const listView = $(this.listId)
            const clipsListView = $(this.clipsInstance.listId)
            // 倒叙删除，防止索引错乱
            Object.keys(this.editorSelected)
                .reverse()
                .forEach(row => {
                    const isSelected = this.editorSelected[row]
                    if (isSelected) {
                        row = Number(row)

                        const clip = this.clipsInstance.clips[row]
                        this.kernel.print(`delete selected: [${row}]\n${clip.text}`)

                        this.clipsInstance.delete(clip.uuid, row)
                        clipsListView.delete(row)

                        listView.delete(row)
                    }
                })
        })
    }

    getToolBarView() {
        return UIKit.blurBox(
            {},
            [
                UIKit.separatorLine(),
                {
                    type: "view",
                    views: [
                        {
                            type: "button",
                            props: {
                                id: this.listId + "-select-button",
                                title: $l10n("SELECT_ALL"),
                                titleColor: $color("tint"),
                                bgcolor: $color("clear")
                            },
                            layout: (make, view) => {
                                make.left.inset(this.clipsInstance.horizontalMargin)
                                make.centerY.equalTo(view.super)
                            },
                            events: { tapped: () => this.selectAll() }
                        },
                        {
                            type: "button",
                            props: {
                                id: this.listId + "-delete-button",
                                symbol: "trash",
                                hidden: true,
                                tintColor: $color("red"),
                                bgcolor: $color("clear")
                            },
                            layout: (make, view) => {
                                make.right.inset(this.clipsInstance.horizontalMargin)
                                make.centerY.equalTo(view.super)
                            },
                            events: { tapped: () => this.deleteSelected() }
                        }
                    ],
                    layout: (make, view) => {
                        make.left.right.top.equalTo(view.super)
                        make.bottom.equalTo(view.super.safeAreaBottom)
                    }
                }
            ],
            (make, view) => {
                make.left.right.bottom.equalTo(view.super)
                make.top.equalTo(view.super.safeAreaBottom).offset(-this.toolBarHeight)
            }
        )
    }

    lineData(data) {
        const item = this.clipsInstance.lineData(data)
        item.checkmark = { symbol: ClipsEditor.symbol.unselected }
        return item
    }

    listTemplate() {
        const template = this.clipsInstance.listTemplate()
        template.views[0].layout = (make, view) => {
            make.height.right.equalTo(view.super)
            make.left.inset(this.containerMargin)
        }
        template.views[1].layout = (make, view) => {
            make.bottom.width.equalTo(view.super)
            make.left.inset(this.clipsInstance.horizontalMargin + this.containerMargin)
            make.height.equalTo(this.clipsInstance.tagContainerHeight)
        }
        template.views.push({
            type: "image",
            props: {
                id: "checkmark",
                symbol: ClipsEditor.symbol.unselected,
                contentMode: $contentMode.scaleAspectFit
            },
            layout: (make, view) => {
                make.centerY.equalTo(view.super)
                make.left.inset(this.containerMargin / 2)
                make.size.equalTo($size(25, 25))
            }
        })

        return template
    }

    getListEditerView() {
        return {
            type: "list",
            props: {
                id: this.listId,
                bgcolor: UIKit.primaryViewBackgroundColor,
                separatorInset: $insets(0, this.clipsInstance.horizontalMargin, 0, 0),
                indicatorInsets: $insets(0, 0, this.toolBarHeight, 0),
                data: this.clipsInstance.clips.map(data => this.lineData(data)),
                template: this.listTemplate(),
                reorder: true,
                footer: { height: this.toolBarHeight },
                crossSections: false
            },
            events: {
                rowHeight: (sender, indexPath) => {
                    const text = this.clipsInstance.clips[indexPath.row].text
                    const itemHeight = this.kernel.storage.isImage(text)
                        ? this.clipsInstance.imageContentHeight
                        : this.getTextHeight(text)

                    return itemHeight + this.clipsInstance.verticalMargin * 2
                },
                reorderBegan: indexPath => {
                    // 用于纠正 rowHeight 高度计算
                    this.reorder.began = true
                    this.reorder.from = indexPath.row
                    this.reorder.to = undefined
                },
                reorderMoved: (fromIndexPath, toIndexPath) => {
                    this.reorder.to = toIndexPath.row
                },
                reorderFinished: () => {
                    this.reorder.began = false
                    if (this.reorder.to === undefined) return
                    this.clipsInstance.move(this.reorder.from, this.reorder.to)
                },
                didSelect: (sender, indexPath, data) => {
                    this.editorSelected[indexPath.row] = !this.editorSelected[indexPath.row]
                }
            },
            layout: $layout.fill
        }
    }

    presentSheet() {
        const sheet = new Sheet()
        sheet
            .setView(View.createFromViews([this.getListEditerView(), this.getToolBarView()]))
            .addNavBar({
                title: "",
                popButton: { title: $l10n("CLOSE") },
                rightButtons: [
                    {
                        title: $l10n("CLEAR"),
                        color: $color("red"),
                        tapped: async () => {
                            const res = await $ui.alert({
                                title: $l10n("DELETE_DATA"),
                                message: $l10n("DELETE_TABLE").replace("${table}", this.clipsInstance.tableL10n),
                                actions: [
                                    { title: $l10n("DELETE"), style: $alertActionType.destructive },
                                    { title: $l10n("CANCEL") }
                                ]
                            })
                            if (res.index === 0) {
                                // 确认删除
                                try {
                                    this.kernel.storage.deleteTable(this.clipsInstance.table)
                                    sheet.dismiss()
                                    this.clipsInstance.updateList(true)
                                } catch (error) {
                                    this.kernel.error(error)
                                    $ui.error(error)
                                }
                            }
                        }
                    }
                ]
            })
            //.preventDismiss()
            .init()
            .present()
    }
}

module.exports = ClipsEditor
