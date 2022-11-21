/**
 * @typedef {import("./app").AppKernel} AppKernel
 */

/**
 *
 * @param {AppKernel} kernel
 */
function compatibility(kernel) {
    // 删除弃用文件
    if ($file.exists("scripts/action/clipboard/ClearClipboard")) {
        kernel.print(`delete files: scripts/action/clipboard/ClearClipboard`)
        $file.delete("scripts/action/clipboard/ClearClipboard")
    }
    // 键盘高度保存到 setting
    if ($cache.get("caio.keyboard.height")) {
        kernel.setting.set("keyboard.previewAndHeight", $cache.get("caio.keyboard.height"))
        $cache.remove("caio.keyboard.height")
    }
}

module.exports = compatibility
