/**
 * @typedef {import("./app-main").AppKernel} AppKernel
 */

const isTaio = $app.info.bundleID.includes("taio")

class Compatibility {
    files = []
    databases = []
    actions = {}

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
    }

    deleteFiles(files) {
        files.forEach(file => {
            if (!this.files.includes(file)) {
                this.files.push(file)
            }
        })
    }

    #deleteFiles() {
        this.files.forEach(file => {
            if ($file.exists(file)) {
                this.kernel.logger.info(`delete file: ${file}`)
                $file.delete(file)
            }
        })
    }

    rebuildDatabase(oldTab, newTab) {
        this.databases.push([oldTab, newTab])
    }

    #rebuildDatabase() {
        const action = (oldTab, newTab) => {
            const result = this.kernel.storage.sqlite.query(
                `SELECT count(*), name FROM sqlite_master WHERE type = "table" AND name = "${oldTab}"`
            )
            if (result.error !== null) {
                throw new Error(
                    `Code [${result.error.code}] ${result.error.domain} ${result.error.localizedDescription}`
                )
            }
            result.result.next()
            const count = result.result.get(0)
            result.result.close()

            if (count > 0) {
                this.kernel.logger.info(`copy data from old table: ${oldTab}`)
                this.kernel.storage.sqlite.update(`INSERT INTO ${newTab} SELECT * FROM ${oldTab}`)
                this.kernel.logger.info(`drop table: ${oldTab}`)
                this.kernel.storage.sqlite.update(`DROP TABLE ${oldTab}`)
            }
        }
        this.databases.forEach(db => {
            action(db[0], db[1])
        })
    }

    rebuildUserActions(actions = {}) {
        for (let category of Object.keys(actions)) {
            actions[category].forEach(action => {
                if (!this.actions[category]) {
                    this.actions[category] = []
                }
                if (!this.actions[category].includes(action)) {
                    this.actions[category].push(action)
                }
            })
        }
    }

    async #rebuildUserActions() {
        if (Object.keys(this.actions).length === 0) return
        const actionPath = `scripts/action`
        const userActionPath = `${this.kernel.fileStorage.basePath}/user_action`

        const changeList = []
        for (let category of Object.keys(this.actions)) {
            this.actions[category].forEach(action => {
                let config
                const configPath = `${actionPath}/${category}/${action}/config.json`
                if ($file.exists(configPath)) {
                    config = JSON.parse($file.read(`${actionPath}/${category}/${action}/config.json`).string)
                } else {
                    config = __INFO__
                }
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
        for (let category of Object.keys(this.actions)) {
            this.actions[category].forEach(action => {
                if ($file.exists(`${userActionPath}/${category}/${action}`)) {
                    this.kernel.logger.info(`rebuild user action: ${category}/${action}`)
                    $file.copy({
                        src: `${actionPath}/${category}/${action}/main.js`,
                        dst: `${userActionPath}/${category}/${action}/main.js`
                    })
                }
            })
        }
        this.kernel.actions.needUpload()
    }

    async do() {
        this.#deleteFiles()
        this.#rebuildDatabase()
        await this.#rebuildUserActions()
    }
}

class VersionActions {
    version = 15
    userVersion = $cache.get("compatibility.version") ?? 0

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
        this.compatibility = new Compatibility(this.kernel)
    }

    do() {
        // this.userVersion === 0 视为新用户
        if (this.userVersion > 0 && this.userVersion < this.version) {
            this.kernel.logger.info(`compatibility: userVersion [${this.userVersion}] lower than [${this.version}]`)
            for (let i = this.userVersion + 1; i <= this.version; i++) {
                this.call(i)
            }
            this.compatibility.do().catch(e => this.kernel.logger.error(e))
            this.kernel.logger.info(`compatibility: userVersion [${this.userVersion}] updated to [${this.version}]`)
        }

        // 修改版本
        $cache.set("compatibility.version", this.version)
    }

    call(version) {
        if (typeof this[`ver${version}`] === "function") {
            this[`ver${version}`]()
        } else {
            throw new ReferenceError(`Version ${version} undefined`)
        }
    }

    ver1() {
        this.compatibility.deleteFiles([
            "scripts/action/clipboard/ClearClipboard",
            "scripts/ui/clipboard.js",
            "scripts/ui/clipboard-data.js",
            "scripts/ui/clipboard-search.js"
        ])

        this.compatibility.rebuildDatabase("clipboard", "clips")

        this.compatibility.rebuildUserActions({
            uncategorized: ["ExportAllContent", "DisplayClipboard"],
            clipboard: ["B23Clean"]
        })

        // 键盘高度保存到 setting
        if ($cache.get("caio.keyboard.height")) {
            this.kernel.setting.set("keyboard.previewAndHeight", $cache.get("caio.keyboard.height"))
            $cache.remove("caio.keyboard.height")
        }
    }

    ver2() {
        this.compatibility.deleteFiles([
            "scripts/storage.js",
            "scripts/ui/clips-data.js",
            "scripts/ui/components/action-manager-data.js"
        ])

        this.compatibility.rebuildDatabase("pin", "favorite")

        this.compatibility.rebuildUserActions({
            uncategorized: ["ExportAllContent"]
        })
    }

    ver3() {
        this.compatibility.rebuildUserActions({
            clipboard: ["SendToWin"]
        })
    }

    ver4() {
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

    ver5() {
        this.compatibility.rebuildUserActions({
            uncategorized: ["DisplayClipboard"]
        })
    }

    ver6() {
        this.compatibility.rebuildUserActions({
            clipboard: ["GetFromWin"]
        })
    }

    ver7() {
        this.compatibility.rebuildUserActions({
            uncategorized: ["Replace"]
        })
    }

    ver8() {}
    ver9() {
        this.compatibility.rebuildUserActions({
            clipboard: ["SendToWin"]
        })
    }

    ver10() {
        const basePath = this.kernel.fileStorage.basePath
        $file.mkdir(basePath)
        if ($file.exists("storage")) {
            $file.move({
                src: "storage",
                dst: basePath
            })
        }

        this.compatibility.deleteFiles(["storage"])
    }

    ver11() {
        const sqls = [
            `create table temp as select uuid, text, prev, next from clips where 1=1;`,
            `drop table clips;`,
            `alter table temp rename to clips;`,
            `create table temp as select uuid, text, prev, next from favorite where 1=1;`,
            `drop table favorite;`,
            `alter table temp rename to favorite;`
        ]
        this.kernel.storage.beginTransaction()
        try {
            sqls.forEach(sql => this.kernel.storage.sqlite.update(sql))
            this.kernel.storage.commit()
        } catch (error) {
            this.kernel.storage.rollback()
            this.kernel.logger.error(error)
            throw error
        }
    }

    ver12() {
        if (isTaio) {
            this.compatibility.deleteFiles(["shared://caio", "storage"])
        }
    }

    ver13() {
        this.compatibility.deleteFiles([
            "setting.json",
            "dist/CAIO-en.json",
            "dist/CAIO-zh-Hans.json",
            "dist/CAIO.js",
            "assets/icon"
        ])
    }

    ver14() {
        $cache.remove(this.kernel.actions.allActionsCacheKey)
    }

    ver15() {
        this.compatibility.rebuildUserActions({
            clipboard: ["SendToWin", "Tokenize"]
        })
    }
}

/**
 * @param {AppKernel} kernel
 */
async function compatibility(kernel) {
    if (!kernel) return

    try {
        const versionActions = new VersionActions(kernel)
        versionActions.do()
    } catch (error) {
        kernel.logger.error(error)
        throw error
    }
}

module.exports = compatibility
