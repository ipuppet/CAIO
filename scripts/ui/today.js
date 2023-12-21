const { ActionData, ActionEnv } = require("../action/action")
const { View, UIKit, BarButtonItem } = require("../libs/easy-jsbox")
const Clips = require("./clips/clips")
const { TodayPinActions } = require("./components/today-actions")

/**
 * @typedef {import("../app-lite").AppKernel} AppKernel
 */

class Today extends Clips {
    actionsId = "today-list-actions"
    listContainerId = "today-list-container"
    readClipboardButtonId = "today-nav-readClipboard"
    pageIndexId = "today-list-page-index"

    // 剪贴板列个性化设置
    navHeight = 34
    taptic = 1

    inLauncher = $app.env === $env.today && $app.widgetIndex === -1
    launcherNavHeight = 44

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        super(kernel)

        this.tabItems.push($l10n("ACTIONS"))

        this.TodayPinActions = new TodayPinActions(this.kernel)

        // 剪切板分页显示
        this.setClipboarPageSize($widget.mode)
        this.listPageNow = [0, 0] // 剪切板当前页，索引为 Section
        this.listSection = Math.min(this.tabIndex, 1) // 当前选中列表，只取 0 或 1，默认 1

        this.views.listId += "today"
        this.views.tabLeftMargin = 8
        this.views.horizontalMargin = 15 // 列表边距
        this.views.verticalMargin = 5 // 列表边距
        this.views.copiedIndicatorSize = 5 // 已复制指示器（小绿点）大小
        this.views.fontSize = 14 // 字体大小
        this.views.tagHeight = 12
        this.views.tagColor = $color("gray", "lightGray")
        this.views.setSingleLine()
    }

    get isActionPage() {
        return this.tabIndex === 2
    }

    set tabIndex(index) {
        $cache.set("caio.today.tab.index", index)
    }

    get tabIndex() {
        return $cache.get("caio.today.tab.index") ?? 0
    }

    get menu() {
        const items = this.delegates.defaultMenuItems.reverse()
        items[0].items = items[0].items.reverse()
        return { items: items }
    }

    getByIndex(index) {
        if (typeof index === "object") {
            index = index.row
        }
        const before = this.listPageSize * this.listPageNow[this.listSection]
        index += before
        return this.clips[index]
    }

    listReady() {
        // 监听展开状态
        $widget.modeChanged = mode => {
            this.setClipboarPageSize(mode)
            if (!this.isActionPage) {
                this.updateList()
            }
        }

        this.setClipboarPageSize($widget.mode)

        if (!this.isActionPage) {
            this.updateList()
        }
        this.appListen()

        $delay(0.5, () => this.readClipboard())
    }

    async readClipboard(manual = false) {
        if (!this.isActionPage && $app.env === $env.today) {
            await super.readClipboard(manual)
        }
    }

    setClipboarPageSize(mode) {
        if (mode === 0) {
            this.listPageSize = 1
        } else {
            const viewHeight = $app.env === $env.app ? UIKit.windowSize.height : $widget.height
            const height = viewHeight - this.navHeight * 2 - (this.inLauncher ? this.launcherNavHeight : 0)
            const f_line =
                height /
                (this.views.singleLineContentHeight +
                    this.views.verticalMargin +
                    Math.max(this.views.tagHeight, this.views.verticalMargin))
            const floor = Math.floor(f_line)
            this.listPageSize = floor
            if (f_line - floor >= 0.6) {
                this.listPageSize++
            }
        }
    }

    buttonTapped(tapped, tapticEngine = true) {
        return async (...args) => {
            if (tapticEngine && this.kernel.setting.get("keyboard.tapticEngine")) {
                $device.taptic(this.taptic)
            }
            await tapped(...args)
        }
    }

    switchTab(index) {
        this.tabIndex = index
        if (this.isActionPage) {
            $(this.listContainerId).hidden = true
            $(this.actionsId).hidden = false
            $(this.readClipboardButtonId).hidden = true
        } else {
            this.listSection = index
            $(this.actionsId).hidden = true
            $(this.listContainerId).hidden = false
            $(this.readClipboardButtonId).hidden = false
            this.updateList()
        }
    }

    getNavBarView() {
        const buttons = [
            {
                // 手动读取剪切板
                symbol: "square.and.arrow.down.on.square",
                props: {
                    id: this.readClipboardButtonId,
                    hidden: this.isActionPage
                },
                tapped: this.buttonTapped(async animate => {
                    animate.start()
                    try {
                        await this.readClipboard(true)
                        animate.done()
                    } catch (error) {
                        animate.cancel()
                        throw error
                    }
                })
            }
        ].map(button => {
            const barButtonItem = new BarButtonItem()
            barButtonItem
                .setAlign(UIKit.align.right)
                .setSymbol(button.symbol)
                .setEvent("tapped", button.tapped)
                .setProps(button.props ?? {})
            return barButtonItem.definition
        })

        return {
            // 顶部按钮栏
            type: "view",
            views: [
                {
                    type: "view",
                    layout: $layout.fill,
                    views: [this.getTabView(), ...buttons]
                }
            ],
            layout: (make, view) => {
                make.top.width.equalTo(view.super)
                make.height.equalTo(this.navHeight)
            }
        }
    }

    getBottomBarView() {
        const getButton = align => {
            const symbol = align === UIKit.align.left ? "chevron.backward.circle" : "chevron.forward.circle"
            return {
                type: "button",
                props: {
                    symbol,
                    bgcolor: $color("clear"),
                    tintColor: UIKit.textColor
                },
                layout: make => {
                    if (align === UIKit.align.left) {
                        make.left.inset(this.views.horizontalMargin)
                    } else {
                        make.right.inset(this.views.horizontalMargin)
                    }
                    make.centerY.equalTo(view.super)
                },
                events: {
                    tapped: this.buttonTapped(() => {
                        if (align === UIKit.align.left) {
                            this.clipboardPrevPage()
                        } else {
                            this.clipboardNextPage()
                        }
                    })
                }
            }
        }

        const view = {
            type: "view",
            views: [
                getButton(UIKit.align.left),
                getButton(UIKit.align.right),
                {
                    type: "label",
                    props: {
                        id: this.pageIndexId,
                        align: $align.center,
                        text: this.listPageNow[this.listSection] + 1
                    },
                    layout: (make, view) => {
                        make.bottom.left.right.equalTo(view.super.safeArea)
                        make.center.equalTo(view.super)
                    }
                }
            ],
            layout: (make, view) => {
                make.bottom.left.right.equalTo(view.super.safeArea)
                make.height.equalTo(this.navHeight)
            }
        }

        return view
    }

    delete(...arge) {
        super.delete(...arge)
        this.updateList()
    }

    updateList(reload = false) {
        if (reload) {
            this.setNeedReload()
        }
        const start = this.listPageNow[this.listSection] * this.listPageSize
        const end = start + this.listPageSize
        const all = this.clips
        $(this.views.listId).data = all
            .slice(start, end)
            .map(data => this.views.lineData(data, this.copied.uuid === data.uuid))
        // page index
        const pageNow = this.listPageNow[this.listSection] + 1
        const pageCount = Math.ceil(all.length / this.listPageSize)
        $(this.pageIndexId).text = `${pageNow}/${pageCount}`
    }

    clipboardPrevPage() {
        if (this.listPageNow[this.listSection] > 0) {
            this.listPageNow[this.listSection]--
            this.updateList()
        }
    }

    clipboardNextPage() {
        const maxPage = Math.ceil(this.clips.length / this.listPageSize)
        if (this.listPageNow[this.listSection] < maxPage - 1) {
            this.listPageNow[this.listSection]++
            this.updateList()
        }
    }

    getListView() {
        return {
            type: "view",
            props: {
                id: this.listContainerId,
                hidden: this.isActionPage
            },
            views: [
                {
                    // 剪切板列表
                    type: "list",
                    props: {
                        id: this.views.listId,
                        scrollEnabled: false,
                        bgcolor: $color("clear"),
                        menu: this.menu,
                        separatorInset: $insets(0, this.views.horizontalMargin, 0, this.views.horizontalMargin),
                        data: [],
                        template: this.views.listTemplate()
                    },
                    events: {
                        ready: () => this.listReady(),
                        rowHeight: (sender, indexPath) => {
                            const clip = this.getByIndex(indexPath)
                            const tagHeight = clip.hasTag ? this.views.tagHeight : this.views.verticalMargin
                            const itemHeight = clip.image
                                ? this.views.imageContentHeight
                                : this.views.getContentHeight(clip.text)
                            return this.views.verticalMargin + itemHeight + tagHeight
                        },
                        didSelect: this.buttonTapped((sender, indexPath) => {
                            const clip = this.getByIndex(indexPath)
                            if (clip.image) {
                                $clipboard.image = clip.imageOriginal
                            } else {
                                this.setClipboardText(clip.text)
                                this.setCopied(clip.uuid)
                            }
                            $ui.toast($l10n("COPIED"))
                        })
                    },
                    layout: (make, view) => {
                        make.top.width.equalTo(view.super)
                        make.bottom.equalTo(view.super).offset(-this.navHeight)
                    }
                },
                this.getBottomBarView()
            ],
            layout: (make, view) => {
                make.top.equalTo(this.navHeight)
                make.bottom.left.right.equalTo(view.super.safeArea)
            }
        }
    }

    getActionView() {
        let actions = this.TodayPinActions.getActions()
        if (actions.length === 0) {
            actions = Object.values(this.kernel.actions.allActions)
        }

        return {
            type: "view",
            props: { id: this.actionsId, hidden: !this.isActionPage },
            views: [
                this.kernel.actions.views.getActionMiniView(info => {
                    return new ActionData({
                        env: ActionEnv.today,
                        text:
                            info.category === "clipboard" || info.category === "uncategorized" ? $clipboard.text : null
                    })
                }, actions)
            ],
            layout: (make, view) => {
                make.top.equalTo(this.navHeight)
                make.left.right.bottom.equalTo(view.super.safeArea)
            }
        }
    }

    getView() {
        return View.create({
            props: {
                titleColor: UIKit.textColor,
                barColor: UIKit.primaryViewBackgroundColor
            },
            views: [
                {
                    type: "view",
                    views: [this.getNavBarView(), this.getActionView(), this.getListView()],
                    layout: $layout.fill
                }
            ],
            events: {
                appeared: async () => {
                    if ($app.env !== $env.today) return

                    const timer = $timer.schedule({
                        interval: 0,
                        handler: () => {
                            $ui.animate({
                                duration: 0.3,
                                animation: () => {
                                    $ui.vc.ocValue().$view().$setBackgroundColor($color("clear"))
                                },
                                completion: () => {
                                    timer.invalidate()
                                }
                            })
                        }
                    })
                }
            }
        })
    }
}

module.exports = Today
