/**
 * @typedef {import("./app").AppKernel} AppKernel
 */

/**
 * 删除文件
 * @param {AppKernel} kernel
 */
function deleteFiles(kernel, files = []) {
    files.forEach(file => {
        if ($file.exists(file)) {
            kernel.print(`delete file: ${file}`)
            $file.delete(file)
        }
    })
}

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
    const userActionPath = `${kernel.fileStorage.basePath}/user_action`

    if ($file.exists(userActionPath + "/uncategorized/ExportAllContent")) {
        kernel.print(`rebuild user action: ExportAllContent`)
        $file.copy({
            src: "scripts/action/uncategorized/ExportAllContent/main.js",
            dst: userActionPath + "/uncategorized/ExportAllContent/main.js"
        })
    }

    if ($file.exists(userActionPath + "/clipboard/B23Clean")) {
        kernel.print(`rebuild user action: B23Clean`)
        $file.copy({
            src: "scripts/action/clipboard/B23Clean/main.js",
            dst: userActionPath + "/clipboard/B23Clean/main.js"
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
        deleteFiles(kernel, [
            "scripts/action/clipboard/ClearClipboard",
            "scripts/ui/clipboard.js",
            "scripts/ui/clipboard-data.js",
            "scripts/ui/clipboard-search.js"
        ])

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
