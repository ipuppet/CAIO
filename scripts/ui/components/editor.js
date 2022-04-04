const {
    UIKit,
    NavigationItem,
    ViewController,
    PageController,
    Sheet
} = require("../../lib/easy-jsbox")

class Editor {
    constructor(kernel) {
        this.kernel = kernel
        this.id = "editor"
        this.viewController = new ViewController()
        // 原始数据
        this.originalContent = undefined
    }

    /**
     * 编辑器内容
     * @param {string} text
     */
    set text(text = "") {
        if (this.originalContent === undefined) {
            // 原始内容
            this.originalContent = text
        }
        this._text = text
    }

    get text() {
        return this._text
    }

    getActionButton() {
        return {
            symbol: "bolt.circle",
            tapped: (sender, senderMaybe) => {
                // senderMaybe 处理 Sheet addNavBar 中的按钮
                if (senderMaybe) sender = senderMaybe
                const range = $(this.id).selectedRange
                const content = {
                    text: this.text,
                    selectedRange: range,
                    selectedText: this.text.slice(range.location, range.location + range.length)
                }
                const popover = $ui.popover({
                    sourceView: sender,
                    directions: $popoverDirection.up,
                    size: $size(200, 300),
                    views: [this.kernel.actionManager.getActionListView({}, {
                        didSelect: (sender, indexPath, data) => {
                            popover.dismiss()
                            const action = this.kernel.actionManager.getActionHandler(data.info.info.type, data.info.info.dir)
                            setTimeout(() => action(content), 500)
                        }
                    })]
                })
            }
        }
    }

    setContent(text) {
        this.text = text
        $(this.id).text = text
    }

    getView(type = "text") {
        return {
            type: type,
            layout: $layout.fill,
            props: {
                id: this.id,
                lineNumbers: this.kernel.setting.get("editor.code.lineNumbers"), // 放在此处动态获取设置的更改
                theme: this.kernel.setting.get($device.isDarkMode ? "editor.code.darkTheme" : "editor.code.lightTheme"),
                text: this.text,
                insets: $insets(15, 15, type === "text" ? this.kernel.setting.get("editor.text.insets") : 15, 15)
            },
            events: {
                ready: sender => {
                    if (this.text === "") // 自动弹出键盘
                        setTimeout(() => sender.focus(), 500)
                },
                didChange: sender => {
                    this.text = sender.text
                }
            }
        }
    }

    pageSheet(text = "", callback, title, navButtons = [], type = "text") {
        this.text = text
        navButtons.unshift(this.getActionButton())
        const sheet = new Sheet()
        sheet
            .setView(this.getView(type))
            .addNavBar({
                title,
                popButton: {
                    title: $l10n("DONE"),
                    tapped: () => callback(this.text)
                },
                rightButtons: navButtons
            })
        sheet.pageController.navigationController.navigationBar.contentViewHeightOffset = 0
        sheet.init().present()
    }

    /**
     * 
     * @param {*} text 
     * @param {*} callback 
     * @param {*} title 
     * @param {Array} navButtons 可通过 Editor.text 属性访问内容，如 this.kernel.editor.text
     * @param {*} type 
     */
    push(text = "", callback, title, navButtons = [], type = "text") {
        this.text = text
        navButtons.unshift(this.getActionButton())
        if (this.kernel.isUseJsboxNav) {
            UIKit.push({
                title: title,
                navButtons: navButtons.map(button => {
                    button.handler = button.tapped
                    button.tapped = undefined
                    return button
                }),
                views: [this.getView(type)],
                // dealloc: () => callback(this.text),
                disappeared: () => callback(this.text)
            })
        } else {
            const pageController = new PageController()
            pageController.navigationController.navigationBar.contentViewHeightOffset = 0
            pageController
                .setView(this.getView(type))
                .navigationItem
                .setTitle(title)
                .setLargeTitleDisplayMode(NavigationItem.largeTitleDisplayModeNever)
                .setRightButtons(navButtons)
            this.viewController.setEvent("onPop", () => callback(this.text))
            this.viewController.push(pageController)
        }
    }
}

module.exports = Editor