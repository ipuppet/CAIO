/**
 * @typedef {import("./app").AppKernel} AppKernel
 */

/**
 *
 * @param {AppKernel} kernel
 */
function compatibility(kernel) {
    if (!kernel) return

    let showMessage = false
    // 删除弃用文件
    if ($file.exists("scripts/action/clipboard/ClearClipboard")) {
        kernel.print(`delete files: scripts/action/clipboard/ClearClipboard`)
        $file.delete("scripts/action/clipboard/ClearClipboard")
        showMessage = true
    }
    // 键盘高度保存到 setting
    if ($cache.get("caio.keyboard.height")) {
        kernel.setting.set("keyboard.previewAndHeight", $cache.get("caio.keyboard.height"))
        $cache.remove("caio.keyboard.height")
        showMessage = true
    }

    if (showMessage) {
        $delay(1, () => $ui.toast("Update success!"))
    }
}

module.exports = compatibility
