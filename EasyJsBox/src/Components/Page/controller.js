const BaseController = require("../../Foundation/controller")

class Controller extends BaseController {
    setPages(pages) {
        this.dataCenter.set("pages", pages)
    }

    /**
     * 设置当前选中的页面
     * @param {Number} index 页面索引
     */
    setSelectedPage(index) {
        this.dataCenter.set("selectedPage", index)
    }
}

module.exports = Controller