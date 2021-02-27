const BaseController = require("../../Foundation/controller")

class Controller extends BaseController {
    init(args) {
        super.init(args)
        this.args.savePath = this.args.savePath ? this.args.savePath : "/assets/setting.json"
        this._setName(this.args.savePath.replace("/", "-"))
        if (this.args.struct) {
            this.struct = this.args.struct
        } else {
            if (!this.args.structPath) this.args.structPath = "/setting.json"
            this.struct = JSON.parse($file.read(this.args.structPath).string)
        }
        this._loadConfig()
        // 从"/config.json"中读取内容
        this.view.setInfo(JSON.parse($file.read("/config.json").string)["info"])
        // 是否全屏显示
        this.dataCenter.set("secondaryPage", false)
        // 注册调色板插件
        if (typeof $picker.color !== "function")
            this.kernel.registerPlugin("palette")
        return this
    }

    /**
     * 设置一个独一无二的名字
     * @param {String} name 名字
     */
    _setName(name) {
        this.dataCenter.set("name", name)
    }

    _loadConfig() {
        this.setting = {}
        let user = {}
        const exclude = [
            "script", // script 类型永远使用setting结构文件内的值
            "info"
        ]
        if ($file.exists(this.args.savePath)) {
            user = JSON.parse($file.read(this.args.savePath).string)
        }
        for (let section of this.struct) {
            for (let item of section.items) {
                if (exclude.indexOf(item.type) < 0) {
                    this.setting[item.key] = item.key in user ? user[item.key] : item.value
                } else { // 被排除的项目直接赋值
                    this.setting[item.key] = item.value
                }
            }
        }
    }

    /**
     * 是否是二级页面
     * @param {Boolean} secondaryPage 
     */
    isSecondaryPage(secondaryPage, pop) {
        this.dataCenter.set("secondaryPage", secondaryPage)
        if (secondaryPage)
            this.dataCenter.set("pop", pop)
    }

    setFooter(footer) {
        this.dataCenter.set("footer", footer)
    }

    get(key) {
        return this.setting[key]
    }

    /**
     * 设置一个钩子，在set方法调用时触发
     * @param {CallableFunction} hook 
     */
    setHook(hook) {
        this.hook = hook
    }

    set(key, value) {
        this.setting[key] = value
        $file.write({
            data: $data({ string: JSON.stringify(this.setting) }),
            path: this.args.savePath
        })
        if (this.hook) this.hook(key, value)
        return true
    }
}

module.exports = Controller