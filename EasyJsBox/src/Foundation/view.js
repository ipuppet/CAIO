class BaseView {
    constructor(kernel) {
        this.kernel = kernel
        // 通用样式
        this.blurStyle = $blurStyle.thinMaterial
        this.textColor = $color("primaryText", "secondaryText")
        this.linkColor = $color("systemLink")
        // 本地化
        this.kernel.l10n("zh-Hans", {
            "DONE": "完成"
        })
        this.kernel.l10n("en", {
            "DONE": "Done"
        })
    }

    init() { }

    setController(controller) {
        this.controller = controller
    }

    setDataCenter(dataCenter) {
        this.dataCenter = dataCenter
    }

    /**
     * 是否属于大屏设备
     */
    isLargeScreen() {
        return $device.info.screen.width > 500
    }

    /**
     * 页面标题
     * @param {*} id 标题id
     * @param {*} title 标题文本
     */
    headerTitle(id, title) {
        return {
            type: "view",
            info: { id: id, title: title }, // 供动画使用
            props: {
                height: 90
            },
            views: [{
                type: "label",
                props: {
                    id: id,
                    text: title,
                    textColor: this.textColor,
                    align: $align.left,
                    font: $font("bold", 35),
                    line: 1
                },
                layout: (make, view) => {
                    make.left.equalTo(view.super.safeArea).offset(20)
                    make.top.equalTo(view.super.safeAreaTop).offset(50)
                }
            }]
        }
    }

    pushPageSheet(args) {
        const navTop = 50,
            views = args.views,
            title = args.title !== undefined ? args.title : "",
            navButtons = args.navButtons !== undefined ? args.navButtons : [],
            topOffset = args.topOffset !== undefined ? args.topOffset : true,
            done = args.done !== undefined ? args.done : undefined
        const UIModalPresentationStyle = {
            automatic: -2,
            pageSheet: 1,
            formSheet: 2,
            fullScreen: 0,
            currentContext: 3,
            custom: 4,
            overFullScreen: 5,
            overCurrentContext: 6,
            popover: 7,
            none: -1
        }
        const { width, height } = $device.info.screen
        const UIView = $objc("UIView").invoke("initWithFrame", $rect(0, 0, width, height))
        const PSViewController = $objc("UIViewController").invoke("alloc.init")
        const PSViewControllerView = PSViewController.$view()
        {
            PSViewControllerView.$setBackgroundColor($color("primarySurface"))
            PSViewControllerView.$addSubview(UIView)
            PSViewController.$setModalPresentationStyle(UIModalPresentationStyle.pageSheet)
        }
        const present = () => $ui.vc.ocValue().invoke("presentModalViewController:animated", PSViewController, true)
        const dismiss = () => PSViewController.invoke("dismissModalViewControllerAnimated", true)
        const add = view => PSViewControllerView.jsValue().add(view)
        add({
            type: "view",
            layout: $layout.fill,
            views: [
                {
                    type: "view",
                    views: views,
                    layout: topOffset ? (make, view) => {
                        make.top.equalTo(view.super.safeAreaTop).offset(navTop)
                        make.bottom.width.equalTo(view.super)
                    } : $layout.fill
                },
                { // nav
                    type: "view",
                    props: {
                        //bgcolor: $color("blue")
                    },
                    layout: (make, view) => {
                        make.height.equalTo(navTop)
                        make.top.width.equalTo(view.super)
                    },
                    views: [
                        { // blur
                            type: "blur",
                            props: { style: this.blurStyle },
                            layout: $layout.fill
                        },
                        { // canvas
                            type: "canvas",
                            layout: (make, view) => {
                                make.top.equalTo(view.prev.bottom)
                                make.height.equalTo(1 / $device.info.screen.scale)
                                make.left.right.inset(0)
                            },
                            events: {
                                draw: (view, ctx) => {
                                    const width = view.frame.width
                                    const scale = $device.info.screen.scale
                                    ctx.strokeColor = $color("gray")
                                    ctx.setLineWidth(1 / scale)
                                    ctx.moveToPoint(0, 0)
                                    ctx.addLineToPoint(width, 0)
                                    ctx.strokePath()
                                }
                            }
                        },
                        { // 完成按钮
                            type: "button",
                            layout: (make, view) => {
                                make.centerY.height.equalTo(view.super)
                                make.left.inset(15)
                            },
                            props: {
                                title: $l10n("DONE"),
                                bgcolor: $color("clear"),
                                font: $font(16),
                                titleColor: $color("systemLink")
                            },
                            events: {
                                tapped: () => {
                                    dismiss()
                                    if (done) done()
                                }
                            }
                        },
                        {
                            type: "label",
                            props: {
                                text: title,
                                font: $font("bold", 17)
                            },
                            layout: (make, view) => {
                                make.center.equalTo(view.super)
                            }
                        }
                    ].concat(navButtons)
                }
            ]
        })
        present()
    }

    /**
     * 重新设计$ui.push()
     * @param {Object} args 参数
     * {
            views: [],
            title: "",
            parent: "",
            navButtons: [],
            topOffset: true, // 这样会导致nav的磨砂效果消失，因为视图不会被nav遮挡
            disappeared: () => { },
        }
     */
    push(args) {
        const navTop = 45,
            views = args.views,
            title = args.title !== undefined ? args.title : "",
            parent = args.parent !== undefined ? args.parent : $l10n("BACK"),
            navButtons = args.navButtons !== undefined ? args.navButtons : [],
            topOffset = args.topOffset !== undefined ? args.topOffset : true,
            disappeared = args.disappeared !== undefined ? args.disappeared : undefined
        $ui.push({
            props: {
                navBarHidden: true,
                statusBarStyle: 0
            },
            events: {
                disappeared: () => {
                    if (disappeared !== undefined) disappeared()
                }
            },
            views: [
                {
                    type: "view",
                    views: views,
                    layout: topOffset ? (make, view) => {
                        make.top.equalTo(view.super.safeAreaTop).offset(navTop)
                        make.bottom.width.equalTo(view.super)
                    } : $layout.fill
                },
                {
                    type: "view",
                    layout: (make, view) => {
                        make.left.top.right.inset(0)
                        make.bottom.equalTo(view.super.safeAreaTop).offset(navTop)
                    },
                    views: [
                        { // blur
                            type: "blur",
                            props: { style: this.blurStyle },
                            layout: $layout.fill
                        },
                        { // canvas
                            type: "canvas",
                            layout: (make, view) => {
                                make.top.equalTo(view.prev.bottom)
                                make.height.equalTo(1 / $device.info.screen.scale)
                                make.left.right.inset(0)
                            },
                            events: {
                                draw: (view, ctx) => {
                                    const width = view.frame.width
                                    const scale = $device.info.screen.scale
                                    ctx.strokeColor = $color("gray")
                                    ctx.setLineWidth(1 / scale)
                                    ctx.moveToPoint(0, 0)
                                    ctx.addLineToPoint(width, 0)
                                    ctx.strokePath()
                                }
                            }
                        },
                        { // view
                            type: "view",
                            layout: (make, view) => {
                                make.top.equalTo(view.super.safeAreaTop)
                                make.bottom.width.equalTo(view.super)
                            },
                            views: [
                                { // 返回按钮
                                    type: "button",
                                    props: {
                                        bgcolor: $color("clear"),
                                        symbol: "chevron.left",
                                        tintColor: this.linkColor,
                                        title: ` ${parent}`,
                                        titleColor: this.linkColor,
                                        font: $font("bold", 16)
                                    },
                                    layout: (make, view) => {
                                        make.left.inset(10)
                                        make.centerY.equalTo(view.super)
                                    },
                                    events: {
                                        tapped: () => { $ui.pop() }
                                    }
                                },
                                {
                                    type: "label",
                                    props: {
                                        text: title,
                                        font: $font("bold", 17)
                                    },
                                    layout: (make, view) => {
                                        make.center.equalTo(view.super)
                                    }
                                }
                            ].concat(navButtons)
                        },
                    ]
                }
            ]
        })
    }

    /**
     * 用于创建一个靠右侧按钮（自动布局）
     * @param {String} id 不可重复
     * @param {String} symbol symbol图标（目前只用symbol）
     * @param {CallableFunction} tapped 按钮点击事件，会传入三个函数，start()、done()和cancel()
     *     调用 start() 表明按钮被点击，准备开始动画
     *     调用 done() 表明您的操作已经全部完成，默认操作成功完成，播放一个按钮变成对号的动画
     *                 若第一个参数传出false则表示运行出错
     *                 第二个参数为错误原因($ui.toast(message))
     *      调用 cancel() 表示取消操作
     *     示例：
     *      (start, done, cancel) => {
     *          start()
     *          const upload = (data) => { return false }
     *          if(upload(data)) { done() }
     *          else { done(false, "Upload Error!") }
     *      }
     */
    navButton(id, symbol, tapped, hidden) {
        const actionStart = () => {
            // 隐藏button，显示spinner
            const button = $(id)
            button.alpha = 0
            button.hidden = true
            $("spinner-" + id).alpha = 1
        }

        const actionDone = (status = true, message = $l10n("ERROR")) => {
            $("spinner-" + id).alpha = 0
            const button = $(id)
            button.hidden = false
            if (!status) { // 失败
                $ui.toast(message)
                button.alpha = 1
                return
            }
            // 成功动画
            button.symbol = "checkmark"
            $ui.animate({
                duration: 0.6,
                animation: () => {
                    button.alpha = 1
                },
                completion: () => {
                    setTimeout(() => {
                        $ui.animate({
                            duration: 0.4,
                            animation: () => {
                                button.alpha = 0
                            },
                            completion: () => {
                                button.symbol = symbol
                                $ui.animate({
                                    duration: 0.4,
                                    animation: () => {
                                        button.alpha = 1
                                    },
                                    completion: () => {
                                        button.alpha = 1
                                    }
                                })
                            }
                        })
                    }, 600)
                }
            })
        }

        const actionCancel = () => {
            $("spinner-" + id).alpha = 0
            const button = $(id)
            button.alpha = 1
            button.hidden = false
        }

        return {
            type: "view",
            props: { id: id },
            views: [
                {
                    type: "button",
                    props: {
                        id: id,
                        hidden: hidden,
                        tintColor: this.textColor,
                        symbol: symbol,
                        bgcolor: $color("clear")
                    },
                    events: {
                        tapped: sender => {
                            tapped({
                                start: actionStart,
                                done: actionDone,
                                cancel: actionCancel
                            }, sender)
                        }
                    },
                    layout: $layout.fill
                },
                {
                    type: "spinner",
                    props: {
                        id: "spinner-" + id,
                        loading: true,
                        alpha: 0
                    },
                    layout: $layout.fill
                }
            ],
            layout: (make, view) => {
                make.height.equalTo(view.super)
                if (view.prev && view.prev.id !== "label" && view.prev.id !== undefined) {
                    make.right.equalTo(view.prev.left).offset(-20)
                } else {
                    make.right.inset(20)
                }
            }
        }
    }
}

module.exports = BaseView