const NAME = "Join"
const Setting = require("../setting")

class JoinSetting extends Setting {
    constructor(kernel) {
        super(kernel, NAME)
    }

    initSettingMethods() {
        // 初始化菜单
        this.menu = (() => {
            const data = this.kernel.getWidgetList()
            const result = []
            data.forEach(item => {
                if (item.title !== NAME)
                    result.push(item.title)
            })
            return result
        })()
        // 设置项内需要的函数
        this.setting.getMenu = () => {
            return this.menu
        }
    }
}

module.exports = JoinSetting