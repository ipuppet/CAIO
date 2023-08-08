const { Sheet } = require("../libs/easy-jsbox")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 * @typedef {import("./clips")} Clips
 */

class ClipsEditor {
    listId = "clips-list-editor"
    reorder = {}
    toolBarHeight = 44

    /**
     * @param {Clips} clipsInstance
     */
    constructor(clipsInstance) {
        this.clipsInstance = clipsInstance
        this.kernel = clipsInstance.kernel
    }

    getListEditerView() {
        return {
            type: "list",
            props: {
                id: this.listId,
                data: this.clipsInstance.clips.map(data => this.clipsInstance.lineData(data)),
                template: this.clipsInstance.listTemplate(),
                reorder: true,
                crossSections: false
            },
            events: {
                rowHeight: (sender, indexPath) => {
                    if (this.reorder.began) {
                        const row = indexPath.row
                        if (row === this.reorder.to) {
                            indexPath = this.reorder.from
                        } else if (this.reorder.to < this.reorder.from) {
                            // 向上移动
                            if (row > this.reorder.to && row <= this.reorder.from) {
                                indexPath = row - 1
                            }
                        } else if (this.reorder.to > this.reorder.from) {
                            if (row < this.reorder.to && row >= this.reorder.from) {
                                indexPath = row + 1
                            }
                        }
                    }

                    const clip = this.clipsInstance.getByIndex(indexPath)
                    const tagHeight = clip.hasTag ? this.clipsInstance.tagHeight : this.clipsInstance.verticalMargin
                    const itemHeight = clip.image
                        ? this.clipsInstance.imageContentHeight
                        : this.clipsInstance.getContentHeight(clip.text)
                    return this.clipsInstance.verticalMargin + itemHeight + tagHeight
                },
                reorderBegan: indexPath => {
                    // 用于纠正 rowHeight 高度计算
                    this.reorder.began = true
                    this.reorder.from = indexPath.row
                    this.reorder.to = indexPath.row
                },
                reorderMoved: (fromIndexPath, toIndexPath) => {
                    this.reorder.to = toIndexPath.row
                },
                reorderFinished: () => {
                    this.reorder.began = false
                    if (this.reorder.to === this.reorder.from) return
                    this.clipsInstance.move(this.reorder.from, this.reorder.to)
                }
            },
            layout: $layout.fill
        }
    }

    presentSheet() {
        this.sheet = new Sheet()
        this.sheet
            .setView(this.getListEditerView())
            .addNavBar({
                title: "",
                popButton: { title: $l10n("CLOSE") }
            })
            .init()
            .present()
    }
}

module.exports = ClipsEditor
