class Setting {
    constructor(kernel, widget) {
        this.kernel = kernel
        this.widget = widget
        // 初始化
        this.init()
        this.settingUrlScheme = `jsbox://run?name=${this.kernel.name}&widget=${this.widget}`
        this.family = {
            small: 0,
            medium: 1,
            large: 2
        }
        this.joinMode = {
            small: 0,
            medium: 1
        }
    }

    init() {
        const rootPath = `${this.kernel.widgetRootPath}/${this.widget}`,
            assetsPath = `${this.kernel.widgetAssetsPath}/${this.widget}`
        // 检查目录是否存在，不存在则创建
        if (!$file.exists(rootPath)) { $file.mkdir(rootPath) }
        if (!$file.exists(assetsPath)) { $file.mkdir(assetsPath) }
        const structPath = `${rootPath}/setting.json`,
            savePath = `${assetsPath}/setting.json`
        // 判断当前环境
        if (this.kernel.inWidgetEnv) {
            let cache = $cache.get(`setting-${this.widget}`)
            if (!cache) {
                cache = {}
                let user = {} // 用户的设置
                if ($file.exists(savePath)) {
                    user = JSON.parse($file.read(savePath).string)
                }
                for (let section of JSON.parse($file.read(structPath).string)) {
                    for (let item of section.items) {
                        cache[item.key] = item.key in user ? user[item.key] : item.value
                    }
                }
                $cache.set(`setting-${this.widget}`, cache)
            }
            this.setting = { get: key => cache[key] }
        } else {
            this.settingComponent = this.kernel.registerComponent("Setting", {
                name: `${this.widget}Setting`,
                savePath: savePath,
                structPath: structPath
            })
            this.setting = this.settingComponent.controller
            // 每次从主程序启动都更新设置项缓存
            $cache.set(`setting-${this.widget}`, this.setting.setting)
            this.setting.isSecondaryPage(true, () => { $ui.pop() })
            this.setting.setFooter({ type: "view" })
            this.defaultSettingMethods()
            this.initSettingMethods()
        }
    }

    push() {
        this.kernel.UIKit.push({
            view: this.setting.getView(),
            title: this.widget,
            hasTopOffset: false
        })
    }

    set(key, value) {
        // 每次操作都更新缓存
        const result = this.setting.set(key, value)
        $cache.set(`setting-${this.widget}`, this.setting.setting)
        return result
    }

    get(key) {
        return this.setting.get(key)
    }

    defaultSettingMethods() {
        this.setting.readme = animate => {
            animate.touchHighlightStart()
            const content = $file.read(`/scripts/ui/widget/${this.widget}/README.md`).string
            this.kernel.UIKit.push({
                view: [{
                    type: "markdown",
                    props: { content: content },
                    layout: (make, view) => {
                        make.size.equalTo(view.super)
                    }
                }],
                title: $l10n("README"),
                disappeared: () => {
                    animate.touchHighlightEnd()
                }
            })
        }

        this.setting.preview = animate => {
            animate.touchHighlight()
            const widget = this.kernel.widgetInstance(this.widget)
            if (widget) {
                widget.render()
            } else {
                $ui.error($l10n("ERROR"))
            }
        }
    }

    initSettingMethods() { }
}

module.exports = Setting