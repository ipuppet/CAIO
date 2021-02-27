const BaseController = require("../../Foundation/controller")

class Controller extends BaseController {
    start() {
        this.view.prepare()
    }

    end() {
        $(this.dataCenter.get("id")).remove()
    }
}

module.exports = Controller