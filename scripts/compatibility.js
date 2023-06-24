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
function rebuildDatabase(kernel, oldTab, newTab) {
    const result = kernel.storage.sqlite.query(
        `SELECT count(*), name FROM sqlite_master WHERE type = "table" AND name = "${oldTab}"`
    )
    if (result.error !== null) {
        throw new Error(`Code [${result.error.code}] ${result.error.domain} ${result.error.localizedDescription}`)
    }
    result.result.next()
    const count = result.result.get(0)
    result.result.close()

    if (count > 0) {
        kernel.print(`copy data from old table: ${oldTab}`)
        kernel.storage.sqlite.update(`INSERT INTO ${newTab} SELECT * FROM ${oldTab}`)
        kernel.print(`drop table: ${oldTab}`)
        kernel.storage.sqlite.update(`DROP TABLE ${oldTab}`)
    }
}

/**
 * 用户动作
 * @param {AppKernel} kernel
 */
async function rebuildUserActions(kernel, actions = {}) {
    const actionPath = `scripts/action`
    const userActionPath = `${kernel.fileStorage.basePath}/user_action`

    const changeList = []
    for (let type of Object.keys(actions)) {
        actions[type].forEach(action => {
            const config = JSON.parse($file.read(`${actionPath}/${type}/${action}/config.json`).string)
            changeList.push(config.name)
        })
    }

    const alertResult = await $ui.alert({
        title: $l10n("compatibility.rebuildUserAction.alert.title"),
        message:
            $l10n("compatibility.rebuildUserAction.alert.message") +
            "\n" +
            JSON.stringify(changeList, null, 2) +
            "\n" +
            $l10n("compatibility.rebuildUserAction.alert.message2"),
        actions: [{ title: $l10n("OK") }, { title: $l10n("CANCEL") }]
    })
    if (alertResult.index === 1) {
        return
    }

    // 重建用户动作
    for (let type of Object.keys(actions)) {
        actions[type].forEach(action => {
            if ($file.exists(`${userActionPath}/${type}/${action}`)) {
                kernel.print(`rebuild user action: ${type}/${action}`)
                $file.copy({
                    src: `${actionPath}/${type}/${action}/main.js`,
                    dst: `${userActionPath}/${type}/${action}/main.js`
                })
            }
        })
    }
    kernel.actionManager.setNeedReload()
}

async function ver1(kernel) {
    deleteFiles(kernel, [
        "scripts/action/clipboard/ClearClipboard",
        "scripts/ui/clipboard.js",
        "scripts/ui/clipboard-data.js",
        "scripts/ui/clipboard-search.js"
    ])

    rebuildDatabase(kernel, "clipboard", "clips")

    await rebuildUserActions(kernel, {
        uncategorized: ["ExportAllContent", "DisplayClipboard"],
        clipboard: ["B23Clean"]
    })

    // 键盘高度保存到 setting
    if ($cache.get("caio.keyboard.height")) {
        kernel.setting.set("keyboard.previewAndHeight", $cache.get("caio.keyboard.height"))
        $cache.remove("caio.keyboard.height")
    }
}

async function ver2(kernel, userVersion) {
    deleteFiles(kernel, [
        "scripts/storage.js",
        "scripts/ui/clips-data.js",
        "scripts/ui/components/action-manager-data.js"
    ])

    rebuildDatabase(kernel, "pin", "favorite")

    if (userVersion !== 1) {
        // 用户版本为 1 的时候已经修改了 ExportAllContent
        await rebuildUserActions(kernel, {
            uncategorized: ["ExportAllContent"]
        })
    }
}

async function ver3(kernel) {
    await rebuildUserActions(kernel, {
        clipboard: ["SendToWin"]
    })
}

function ver4() {
    const actionSyncDataPath = "/storage/user_action/data.json"
    if ($file.exists(actionSyncDataPath)) {
        const date = JSON.parse($file.read(actionSyncDataPath).string).date
        $file.write({
            data: $data({ string: JSON.stringify({ timestamp: date }) }),
            path: "/storage/user_action/sync.json"
        })
        $file.delete(actionSyncDataPath)
    }
}

async function ver5(kernel) {
    await rebuildUserActions(kernel, {
        uncategorized: ["DisplayClipboard"]
    })
}

/**
 *
 * @param {AppKernel} kernel
 */
async function compatibility(kernel) {
    if (!kernel) return

    const version = 5
    const userVersion = $cache.get("compatibility.version") ?? 0

    try {
        if (userVersion < 1) {
            kernel.print(`compatibility: userVersion [${userVersion}] lower than [1], start action`)
            await ver1(kernel)
        }
        if (userVersion < 2) {
            kernel.print(`compatibility: userVersion [${userVersion}] lower than [2], start action`)
            await ver2(kernel, userVersion)
        }
        if (userVersion < 3) {
            kernel.print(`compatibility: userVersion [${userVersion}] lower than [3], start action`)
            await ver3(kernel)
        }
        if (userVersion < 4) {
            kernel.print(`compatibility: userVersion [${userVersion}] lower than [4], start action`)
            ver4()
        }
        if (userVersion < 5) {
            kernel.print(`compatibility: userVersion [${userVersion}] lower than [5], start action`)
            ver5(kernel)
        }
    } catch (error) {
        kernel.error(error)
        throw error
    }

    $cache.set("compatibility.version", version) // 修改版本
}

module.exports = compatibility
