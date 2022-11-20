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
}

module.exports = compatibility
