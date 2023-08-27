const { UIKit, ViewController, TabBarController } = require("./libs/easy-jsbox")
const { AppKernelBase } = require("./app")

const compatibility = require("./compatibility")
const settingMethods = require("./setting/setting-methods")

/**
 * @typedef {AppKernel} AppKernel
 */
class AppKernel extends AppKernelBase {
    constructor() {
        super()
        this.query = $context.query

        settingMethods(this)
    }
}

class AppUI {
    // 小组件模式下不初始化 AppKernel
    static kernel = $app.env !== $env.widget ? new AppKernel() : undefined

    static renderMainUI() {
        const buttons = {
            clips: { icon: "doc.on.clipboard", title: $l10n("CLIPS") },
            actions: { icon: "command", title: $l10n("ACTIONS") },
            setting: { icon: "gear", title: $l10n("SETTING") }
        }
        this.kernel.setting.setEvent("onSet", key => {
            if (key === "mainUIDisplayMode") {
                $delay(0.3, () => (UIKit.isTaio ? $actions.restart() : $addin.restart()))
            }
        })
        if (this.kernel.setting.get("mainUIDisplayMode") === 0) {
            this.kernel.useJsboxNav()
            this.kernel.setting.useJsboxNav()
            this.kernel.setNavButtons([
                {
                    symbol: buttons.setting.icon,
                    title: buttons.setting.title,
                    handler: () => {
                        UIKit.push({
                            title: buttons.setting.title,
                            views: [this.kernel.setting.getListView()]
                        })
                    }
                },
                {
                    symbol: buttons.actions.icon,
                    title: buttons.actions.title,
                    handler: () => {
                        this.kernel.actionManager.present()
                    }
                }
            ])

            // $define({
            //     type: "ViewController: UIViewController",
            //     events: {
            //         viewDidLoad: () => {
            //             console.log("viewDidLoad")
            //             self.$super().$viewDidLoad()

            //             const view = this.kernel.clips.getNavigationView().getPage()
            //             self.$view().jsValue().add(view)

            //             const navigationBar = self.$navigationController().$navigationBar()
            //             navigationBar.$setTranslucent(true)
            //             navigationBar.$setBarStyle(0)
            //             navigationBar.$setBarTintColor($color("clear"))

            //             const navigationItem = self.$navigationItem()
            //             navigationItem.$setTitle("CAIO")
            //             navigationItem.$setLargeTitleDisplayMode(2)

            //             const leftButton = $objc("UIBarButtonItem").$alloc()
            //             leftButton.$initWithTitle_style_target_action("Close", 0, self, "backButtonPressed")

            //             navigationItem.$setLeftBarButtonItem(leftButton)
            //         },
            //         backButtonPressed: () => {
            //             self.$dismissViewControllerAnimated_completion(true, null)
            //             self.$dismissViewControllerAnimated_completion(true, null)
            //         }
            //     }
            // })

            // const render = sender => {
            //     const myVC = $objc("ViewController").$alloc().$init()
            //     const navigator = $objc("UINavigationController").$alloc().$initWithRootViewController(myVC)
            //     navigator.$setModalPresentationStyle(0)
            //     $ui.controller.ocValue().invoke("presentViewController:animated:completion:", navigator, true, null)
            // }
            // render()

            this.kernel.UIRender(this.kernel.clips.getNavigationView().getPage())
        } else {
            this.kernel.fileManager.setViewController(new ViewController())

            this.kernel.tabBarController = new TabBarController()

            const clipsdNavigationView = this.kernel.clips.getNavigationView()

            this.kernel.tabBarController
                .setPages({
                    clips: clipsdNavigationView.getPage(),
                    actions: this.kernel.actionManager.getPage(),
                    setting: this.kernel.setting.getPage()
                })
                .setCells({
                    clips: buttons.clips,
                    actions: buttons.actions,
                    setting: buttons.setting
                })

            this.kernel.UIRender(this.kernel.tabBarController.generateView().definition)
        }
    }
}

module.exports = {
    run: () => {
        // 兼容性操作
        compatibility(AppUI.kernel)

        AppUI.renderMainUI()
    }
}
