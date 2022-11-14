const { UIKit, NavigationBar, NavigationView, Sheet } = require("../../libs/easy-jsbox")
const { ActionEnv, ActionData } = require("../../action/action")

/**
 * @typedef {import("../../app").AppKernel} AppKernel
 */

class Editor {
    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
        this.id = "editor"
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
                const actionData = new ActionData({
                    env: ActionEnv.editor,
                    text: range.length > 0 ? this.text.slice(range.location, range.location + range.length) : this.text,
                    selectedRange: range
                })
                const popover = $ui.popover({
                    sourceView: sender,
                    directions: $popoverDirection.up,
                    size: $size(200, 300),
                    views: [
                        this.kernel.actionManager.getActionListView(action => {
                            popover.dismiss()
                            $delay(0.5, () => action(actionData))
                        })
                    ]
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
                    if (this.text === "")
                        // 自动弹出键盘
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
        sheet.setView(this.getView(type)).addNavBar({
            title,
            popButton: {
                title: $l10n("DONE"),
                tapped: () => callback(this.text)
            },
            rightButtons: navButtons
        })
        sheet.navigationView.navigationBar.contentViewHeightOffset = 0
        sheet.init().present()
    }

    /**
     *
     * @param {*} text
     * @param {*} callback
     * @param {Array} navButtons 可通过 Editor.text 属性访问内容，如 editor.text
     * @param {*} type
     */
    uikitPush(text = "", callback, navButtons = [], type = "text") {
        this.text = text
        navButtons.unshift(this.getActionButton())

        UIKit.push({
            title: "",
            navButtons: navButtons.map(button => {
                button.handler = button.tapped
                button.tapped = undefined
                return button
            }),
            views: [this.getView(type)],
            // dealloc: () => callback(this.text),
            disappeared: () => callback(this.text)
        })
    }

    /**
     *
     * @param {*} text
     * @param {*} callback
     * @param {Array} navButtons 可通过 Editor.text 属性访问内容，如 editor.text
     * @param {*} type
     */
    getNavigationView(text = "", navButtons = [], type = "text") {
        this.text = text
        navButtons.unshift(this.getActionButton())

        const navigationView = new NavigationView()
        navigationView.navigationBar.contentViewHeightOffset = 0
        navigationView.navigationBar.setLargeTitleDisplayMode(NavigationBar.largeTitleDisplayModeNever)
        navigationView.navigationBarItems.setRightButtons(navButtons)
        navigationView.setView(this.getView(type)).navigationBarTitle("")

        return navigationView
    }
}

module.exports = Editor
