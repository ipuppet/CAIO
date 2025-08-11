const { UIKit } = require("../../libs/easy-jsbox")

const clip = require("./clip")
const action = require("./action")
const editor = require("./editor")
const keyboard = require("./keyboard")
const widget = require("./widget")
const today = require("./today")

/**
 * @typedef {import("../../app-main").AppKernel} AppKernel
 * @param {AppKernel} kernel
 * @returns
 */
module.exports = kernel => {
    return {
        items: [clip(kernel), action, editor].concat(UIKit.isTaio ? [] : [keyboard, widget, today])
    }
}
