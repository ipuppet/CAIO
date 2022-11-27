/**
 * @typedef {import("./app").AppKernel} AppKernel
 */

/**
 * 重建表
 * @param {AppKernel} kernel
 */
function rebuildDatabase(kernel) {
    const result = kernel.storage.sqlite.query(
        `SELECT count(*), name FROM sqlite_master WHERE type = "table" AND name = "clipboard"`
    )
    if (result.error !== null) {
        throw new Error(`Code [${result.error.code}] ${result.error.domain} ${result.error.localizedDescription}`)
    }
    result.result.next()
    const count = result.result.get(0)
    result.result.close()

    if (count > 0) {
        kernel.print(`copy data from old table: clipboard`)
        kernel.storage.sqlite.update(`INSERT INTO clips SELECT * FROM clipboard`)
        kernel.print(`drop table: clipboard`)
        kernel.storage.sqlite.update(`DROP TABLE clipboard`)
    }
}

/**
 * 用户动作
 * @param {AppKernel} kernel
 */
function rebuildUserAction(kernel) {
    // 用户动作
    kernel.print(`rebuild user action: ExportAllContent`)
    const userActionPath = `${kernel.fileStorage.basePath}/user_action`
    if ($file.exists(userActionPath + "/uncategorized/ExportAllContent")) {
        $file.copy({
            src: "scripts/action/uncategorized/ExportAllContent/main.js",
            dst: userActionPath + "/uncategorized/ExportAllContent/main.js"
        })
    }
}

/**
 *
 * @param {AppKernel} kernel
 */
function compatibility(kernel) {
    if (!kernel) return

    const version = 1
    const userVersion = $cache.get("compatibility.version")
    const needChange = version !== userVersion

    let showMessage = false
    try {
        // 删除弃用文件
        if ($file.exists("scripts/action/clipboard/ClearClipboard")) {
            kernel.print(`delete folder: scripts/action/clipboard/ClearClipboard`)
            $file.delete("scripts/action/clipboard/ClearClipboard")
            showMessage = true
        }
        if ($file.exists("scripts/ui/clipboard.js")) {
            kernel.print(`delete file: scripts/ui/clipboard.js`)
            $file.delete("scripts/ui/clipboard.js")
            kernel.print(`delete file: scripts/ui/clipboard-data.js`)
            $file.delete("scripts/ui/clipboard-data.js")
            kernel.print(`delete file: scripts/ui/clipboard-search.js`)
            $file.delete("scripts/ui/clipboard-search.js")
            showMessage = true
        }

        // 键盘高度保存到 setting
        if ($cache.get("caio.keyboard.height")) {
            kernel.setting.set("keyboard.previewAndHeight", $cache.get("caio.keyboard.height"))
            $cache.remove("caio.keyboard.height")

            showMessage = true
        }

        if (needChange) {
            kernel.print(`compatibility: userVersion [${userVersion}] lower than [${version}], start action`)
            rebuildDatabase(kernel)
            rebuildUserAction(kernel)
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
