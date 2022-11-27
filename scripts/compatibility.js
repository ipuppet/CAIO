/**
 * @typedef {import("./app").AppKernel} AppKernel
 */

/**
 *
 * @param {AppKernel} kernel
 */
function compatibility(kernel) {
    if (!kernel) return

    const version = 1
    const needChange = version !== $cache.get("compatibility.version")

    let showMessage = false
    try {
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
        // 用户动作
        if (needChange) {
            kernel.print(`rebuild user action: ExportAllContent`)
            const userActionPath = `${kernel.fileStorage.basePath}/user_action`
            if ($file.exists(userActionPath + "/uncategorized/ExportAllContent")) {
                $file.copy({
                    src: "scripts/action/uncategorized/ExportAllContent/main.js",
                    dst: userActionPath + "/uncategorized/ExportAllContent/main.js"
                })
            }
        }
    } catch (error) {
        kernel.error(error)
        throw error
    }

    $cache.set("compatibility.version", version) // 修改版本
    if (showMessage) {
        $delay(1, () => $ui.toast("Update success!"))
    }
}

module.exports = compatibility
