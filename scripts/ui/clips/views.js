const { UIKit, ViewController } = require("../../libs/easy-jsbox")
const Editor = require("../components/editor")

/**
 * @typedef {ClipsViews} ClipsViews
 * @typedef {import("../../dao/storage").Clip} Clip
 * @typedef {import("../../app-main").AppKernel} AppKernel
 */

class ClipsViews {
    listId = $text.uuid

    editingToolBarId = this.listId + "-edit-mode-tool-bar"

    // 剪贴板列个性化设置
    #singleLine = false
    #singleLineContentHeight = 0
    tabLeftMargin = 20 // tab 左边距
    horizontalMargin = 20 // 列表边距
    verticalMargin = 14 // 列表边距
    containerMargin = 0 // list 单边边距。如果 list 未贴合屏幕左右边缘，则需要此值辅助计算文字高度
    fontSize = 16 // 字体大小
    copiedIndicatorSize = 6 // 已复制指示器（小绿点）大小
    imageContentHeight = 50
    tagHeight = this.verticalMargin + 5
    tagColor = $color("lightGray")

    tabHeight = 44
    editModeToolBarHeight = 44

    #textHeightCache = {}

    viewController

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel

        this.viewController = new ViewController()
    }

    get singleLineContentHeight() {
        if (this.#singleLineContentHeight === 0) {
            this.#singleLineContentHeight = this.getTextHeight($font(this.fontSize))
        }
        return this.#singleLineContentHeight
    }

    setSingleLine() {
        this.#singleLine = true
        // 图片高度与文字一致
        this.imageContentHeight = this.singleLineContentHeight
        this.#singleLineContentHeight = 0
    }

    getTextHeight(font, text = "a") {
        return $text.sizeThatFits({
            text,
            font,
            width: UIKit.windowSize.width - (this.horizontalMargin + this.containerMargin) * 2
        }).height
    }

    getContentHeight(text) {
        if (!this.#textHeightCache[text]) {
            this.#textHeightCache[text] = this.#singleLine
                ? this.singleLineContentHeight
                : Math.min(this.getTextHeight($font(this.fontSize), text), this.singleLineContentHeight * 2)
        }
        return this.#textHeightCache[text]
    }

    edit(text, callback) {
        const editor = new Editor(this.kernel)
        const navButtons = [
            {
                symbol: "square.and.arrow.up",
                tapped: () => {
                    if (editor.text) {
                        $share.sheet(editor.text)
                    } else {
                        $ui.warning($l10n("NONE"))
                    }
                }
            }
        ]

        if (this.kernel.isUseJsboxNav) {
            editor.uikitPush(text, text => callback(text), navButtons)
        } else {
            const navigationView = editor.getNavigationView(text, text => callback(text), navButtons)
            this.viewController.push(navigationView)
        }
    }

    tabView(tabItems, tabIndex, events) {
        return {
            type: "tab",
            props: {
                id: this.listId + "-tab",
                items: tabItems,
                index: tabIndex,
                dynamicWidth: true
            },
            events,
            layout: (make, view) => {
                make.centerY.equalTo(view.super)
                if (view.prev) {
                    make.left.equalTo(view.prev.right).offset(this.tabLeftMargin)
                } else {
                    make.left.inset(this.tabLeftMargin)
                }
            }
        }
    }

    /**
     * @param {Clip} clip
     * @param {boolean} indicator
     * @returns
     */
    lineData(clip, indicator = false) {
        const image = { hidden: true }
        const content = { text: "" }
        const tag = { hidden: !clip?.hasTag }

        if (clip.image) {
            //image.src = clip.imagePath.preview
            image.data = clip.imagePreview
            image.hidden = false
        } else {
            if (clip.textStyledText) {
                content.styledText = clip.textStyledText
            } else {
                content.text = clip.text
            }
            if (clip.tagStyledText) {
                tag.styledText = clip.tagStyledText
            } else {
                tag.text = clip.tag
            }
        }

        return {
            copied: { hidden: !indicator },
            image,
            tag,
            content
        }
    }

    listTemplate() {
        return {
            props: { bgcolor: $color("clear") },
            views: [
                {
                    type: "view",
                    views: [
                        {
                            type: "view",
                            props: {
                                id: "copied",
                                circular: this.copiedIndicatorSize,
                                hidden: true,
                                bgcolor: $color("green")
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.size.equalTo(this.copiedIndicatorSize)
                                // 放在前面小缝隙的中间 `this.copyedIndicatorSize / 2` 指大小的一半
                                make.left
                                    .equalTo(view.super)
                                    .inset(this.horizontalMargin / 2 - this.copiedIndicatorSize / 2)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "content",
                                lines: this.#singleLine ? 1 : 2,
                                font: $font(this.fontSize)
                            },
                            layout: (make, view) => {
                                make.left.right.equalTo(view.super).inset(this.horizontalMargin)
                                make.top.equalTo(this.verticalMargin)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "tag",
                                lines: 1,
                                color: this.tagColor,
                                autoFontSize: true,
                                align: $align.leading
                            },
                            layout: (make, view) => {
                                make.bottom.equalTo(view.super)
                                make.left.right.equalTo(view.prev)
                                make.height.equalTo(this.tagHeight)
                            }
                        }
                    ],
                    layout: $layout.fill
                },
                {
                    type: "image",
                    props: {
                        id: "image",
                        hidden: true
                    },
                    layout: $layout.fill
                }
            ]
        }
    }

    getEmptyBackground(hidden = false) {
        return {
            type: "label",
            props: {
                color: $color("secondaryText"),
                hidden,
                text: $l10n("NONE"),
                align: $align.center
            },
            events: {
                ready: sender => {
                    sender.layout((make, view) => {
                        make.top.equalTo(this.tabHeight)
                        make.left.right.bottom.equalTo(view.super)
                    })
                }
            }
        }
    }

    getListEditModeToolBarView({ selectButtonEvents, deleteButtonEvents } = {}) {
        const blurBox = UIKit.blurBox({ id: this.editingToolBarId }, [
            UIKit.separatorLine(),
            {
                type: "view",
                views: [
                    {
                        type: "button",
                        props: {
                            id: this.editingToolBarId + "-select-button",
                            title: $l10n("SELECT_ALL"),
                            titleColor: $color("tint"),
                            bgcolor: $color("clear")
                        },
                        layout: (make, view) => {
                            make.left.inset(this.horizontalMargin)
                            make.centerY.equalTo(view.super)
                        },
                        events: selectButtonEvents
                    },
                    {
                        type: "button",
                        props: {
                            id: this.editingToolBarId + "-delete-button",
                            symbol: "trash",
                            hidden: true,
                            tintColor: $color("red"),
                            bgcolor: $color("clear")
                        },
                        layout: (make, view) => {
                            make.height.equalTo(view.super)
                            make.width.equalTo(this.horizontalMargin * 2)
                            make.right.inset(this.horizontalMargin / 2)
                            make.centerY.equalTo(view.super)
                        },
                        events: deleteButtonEvents
                    }
                ],
                layout: (make, view) => {
                    make.left.right.top.equalTo(view.super)
                    make.bottom.equalTo(view.super.safeAreaBottom)
                }
            }
        ])
        return blurBox
    }

    getListView(id = this.listId, data = [], events) {
        const listView = {
            // 剪切板列表
            type: "list",
            props: {
                id,
                associateWithNavigationBar: false,
                bgcolor: $color("clear"),
                separatorInset: $insets(0, this.horizontalMargin, 0, 0),
                data,
                allowsMultipleSelectionDuringEditing: true,
                template: this.listTemplate(),
                backgroundView: $ui.create(this.getEmptyBackground())
            },
            events,
            layout: (make, view) => {
                if (view.prev) {
                    make.top.equalTo(view.prev.bottom)
                } else {
                    make.top.equalTo(view.super)
                }
                make.left.right.bottom.equalTo(view.super)
            }
        }

        return listView
    }
}

module.exports = ClipsViews
