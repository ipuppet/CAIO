const { UIKit, ViewController, TabBarController, FileManager } = require("./libs/easy-jsbox")
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

        this.fileManager = new FileManager()
    }
}

class AppUI {
    static kernel = new AppKernel()

    static renderMainUI() {
        const buttons = {
            clips: { icon: "doc.on.clipboard.fill", title: $l10n("CLIPS") },
            actions: { icon: "command", title: $l10n("ACTIONS") },
            setting: { icon: "gear", title: $l10n("SETTING") }
        }

        // this.kernel.useJsboxNav()
        // this.kernel.setting.useJsboxNav()
        // this.kernel.fileManager.setViewController(new ViewController())
        // this.kernel.tabBarController = new TabBarController()
        // const clipsdNavigationView = this.kernel.clips.getNavigationView()
        // this.kernel.tabBarController
        //     .setPages({
        //         clips: clipsdNavigationView.getPage(),
        //         actions: this.kernel.actions.getPage(),
        //         setting: this.kernel.setting.getPage()
        //     })
        //     .setCells({
        //         clips: buttons.clips,
        //         actions: buttons.actions,
        //         setting: buttons.setting
        //     })

        // $define({
        //     type: "ViewController: UIViewController",
        //     events: {
        //         viewDidLoad: () => {
        //             console.log("viewDidLoad")
        //             self.$super().$viewDidLoad()

        //             //const view = this.kernel.tabBarController.generateView().definition
        //             const view = this.kernel.clips.getListView()
        //             self.$view().jsValue().add(view)

        //             const navigationItem = self.$navigationItem()
        //             navigationItem.$setTitle("CAIO")
        //             navigationItem.$setLargeTitleDisplayMode(0)

        //             const leftButton = $objc("UIBarButtonItem").$alloc()
        //             leftButton.$initWithTitle_style_target_action("Close", 0, self, "backButtonPressed")

        //             navigationItem.$setLeftBarButtonItem(leftButton)
        //         },
        //         backButtonPressed: () => {
        //             self.$dismissViewControllerAnimated_completion(true, null)
        //         }
        //     }
        // })

        // const render = sender => {
        //     const myVC = $objc("ViewController").$alloc().$init()
        //     const navigator = $objc("UINavigationController").$alloc().$initWithRootViewController(myVC)
        //     navigator.$setModalPresentationStyle(0)
        //     this.kernel.navigator = navigator

        //     const navigationBar = navigator.$navigationBar()
        //     navigationBar.$setPrefersLargeTitles(true)
        //     const image = $objc("UIImage").$imageWithColor($color("clear").ocValue())
        //     navigationBar.$setBackgroundImage_forBarPosition_barMetrics(image, 0, 0)

        //     $ui.vc.ocValue().invoke("presentViewController:animated:completion:", navigator, true, null)
        // }
        // render()
        // return

        if (UIKit.isTaio || this.kernel.setting.get("mainUIDisplayMode") === 0) {
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
                        this.kernel.actions.present()
                    }
                }
            ])

            this.kernel.UIRender(this.kernel.clips.getNavigationView().getPage())
        } else {
            this.kernel.fileManager.setViewController(new ViewController())

            this.kernel.tabBarController = new TabBarController()

            const clipsdNavigationView = this.kernel.clips.getNavigationView()

            this.kernel.tabBarController
                .setPages({
                    clips: clipsdNavigationView.getPage(),
                    actions: this.kernel.actions.getPage(),
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
