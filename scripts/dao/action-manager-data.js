const { ActionEnv, ActionData, Action } = require("../action/action")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class ActionManagerData {
    static syncStatus = {
        syncing: 0,
        success: 1
    }
    #syncInterval = 3
    #syncLock = false
    #actions

    /**
     * @param {AppKernel} kernel
     */
    constructor(kernel) {
        this.kernel = kernel
        // path
        this.actionPath = "scripts/action"
        this.actionOrderFile = "order.json"
        this.tempPath = `${this.kernel.fileStorage.basePath}/temp`
        this.userActionPath = `${this.kernel.fileStorage.basePath}/user_action`
        this.localSyncFile = this.userActionPath + "/data.json"
        this.iCloudPath = "drive://CAIO/user_action"
        this.iCloudSyncFile = this.iCloudPath + "/data.json"
        this.iCloudSyncFileUndownloaded = this.iCloudPath + "/.data.json.icloud"
        // 用来存储被美化的 Action 分类名称
        this.typeNameMap = {}
        // checkUserAction
        this.checkUserAction()
        // sync
        $thread.background({
            delay: this.#syncInterval,
            handler: () => this.sync(true)
        })
    }

    get actions() {
        if (!this.#actions) {
            this.#actions = this.getActionTypes().map(type => {
                return {
                    title: this.getTypeName(type),
                    items: this.getActions(type)
                }
            })
        }
        return this.#actions
    }

    actionsNeedReload(needSync = false) {
        this.#actions = undefined
        if (needSync) {
            $file.write({
                data: $data({ string: JSON.stringify({ date: Date.now() }) }),
                path: this.localSyncFile
            })
        }
    }

    importExampleAction() {
        try {
            Object.keys(__ACTIONS__).forEach(type => {
                const userActionTypePath = `${this.userActionPath}/${type}`
                Object.keys(__ACTIONS__[type]).forEach(name => {
                    if (!$file.exists(`${userActionTypePath}/${name}/main.js`)) {
                        $file.mkdir(userActionTypePath)
                        $file.mkdir(`${userActionTypePath}/${name}`)

                        $file.write({
                            data: $data({ string: __ACTIONS__[type][name]["main.js"] }),
                            path: `${userActionTypePath}/${name}/main.js`
                        })
                        $file.write({
                            data: $data({ string: __ACTIONS__[type][name]["config.json"] }),
                            path: `${userActionTypePath}/${name}/config.json`
                        })
                        $file.write({
                            data: $data({ string: __ACTIONS__[type][name]["README.md"] }),
                            path: `${userActionTypePath}/${name}/README.md`
                        })
                    }
                })
            })
        } catch {
            $file.list(this.actionPath).forEach(type => {
                const actionTypePath = `${this.actionPath}/${type}`
                if ($file.isDirectory(actionTypePath)) {
                    const userActionTypePath = `${this.userActionPath}/${type}`
                    $file.list(actionTypePath).forEach(name => {
                        if (!$file.exists(`${userActionTypePath}/${name}/main.js`)) {
                            $file.mkdir(userActionTypePath)
                            $file.copy({
                                src: `${actionTypePath}/${name}`,
                                dst: `${userActionTypePath}/${name}`
                            })
                        }
                    })
                }
            })
        }
    }

    #mkdir(path = "") {
        path = path.trim("/")
        if (!$file.exists(path)) {
            const lastSlash = path.lastIndexOf("/")
            if (lastSlash !== -1) {
                const dirname = path.substring(0, lastSlash)
                this.#mkdir(dirname)
            }
            $file.mkdir(path)
        }
    }

    async downloadFiles(path) {
        const list = $file.list(path)
        for (let i = 0; i < list.length; i++) {
            const subpath = path + "/" + list[i]
            if ($file.isDirectory(subpath)) {
                await this.downloadFiles(subpath)
            } else {
                const filename = subpath.substring(subpath.lastIndexOf("/") + 1)
                if (filename.endsWith(".icloud")) {
                    await $file.download(subpath)
                }
            }
        }
    }

    getSyncDate() {
        const localSyncData = JSON.parse($file.read(this.localSyncFile)?.string ?? "{}")
        return new Date(localSyncData.date)
    }

    checkSyncData() {
        if (!$file.exists(this.localSyncFile)) {
            $file.write({
                data: $data({ string: JSON.stringify({ date: 0 }) }),
                path: this.localSyncFile
            })
        }
        if (!$file.exists(this.iCloudSyncFile)) {
            if ($file.exists(this.iCloudSyncFileUndownloaded)) {
                $file.download(this.iCloudSyncFileUndownloaded)
            } else {
                $file.write({
                    data: $data({ string: JSON.stringify({ date: 0 }) }),
                    path: this.iCloudSyncFile
                })
            }
        }
    }

    async sync(loop = false) {
        if (!this.kernel.setting.get("experimental.syncAction")) {
            return
        }
        if (this.#syncLock) {
            if (loop) {
                $thread.background({
                    delay: this.#syncInterval,
                    handler: () => this.sync(loop)
                })
            }
            return
        }
        this.#syncLock = true

        this.checkSyncData()

        let iCloudSyncData
        if ($file.exists(this.iCloudSyncFileUndownloaded)) {
            iCloudSyncData = await $file.download(this.iCloudSyncFileUndownloaded)
        } else {
            iCloudSyncData = $file.read(this.iCloudSyncFile)
        }
        iCloudSyncData = JSON.parse(iCloudSyncData)
        const localSyncData = JSON.parse($file.read(this.localSyncFile).string)
        if (localSyncData.date < iCloudSyncData.date) {
            this.kernel.print("local data need update")
            $app.notify({
                name: "actionSyncStatus",
                object: { status: ActionManagerData.syncStatus.syncing }
            })
            // temp
            const usetActionTempPath = this.tempPath + "/user_action"
            $file.delete(usetActionTempPath)
            this.#mkdir(usetActionTempPath)
            // 从 iCloud 复制到 temp
            await this.downloadFiles(this.iCloudPath) // download first
            await $file.copy({
                src: this.iCloudPath,
                dst: usetActionTempPath
            })
            // 从 temp 复制到 userActionPath
            $file.delete(this.userActionPath)
            this.#mkdir(this.userActionPath)
            await $file.move({
                src: usetActionTempPath,
                dst: this.userActionPath
            })
            this.kernel.print("iCloud data copy success")
            // 通知更新 UI
            await $wait(1)
            this.actionsNeedReload()
            $app.notify({
                name: "actionSyncStatus",
                object: { status: ActionManagerData.syncStatus.success }
            })
        } else if (localSyncData.date > iCloudSyncData.date) {
            // 直接更新 iCloudSyncFile
            // 在其他方法中已经对 iCloud 文件进行了更改
            $file.write({
                data: $data({ string: JSON.stringify({ date: localSyncData.date }) }),
                path: this.iCloudSyncFile
            })
            // 停顿一个同步间隔
            await $wait(this.#syncInterval)
            // 通知更新 UI
            $app.notify({
                name: "actionSyncStatus",
                object: { status: ActionManagerData.syncStatus.success }
            })
        }

        // 解锁，进行下一次同步
        this.#syncLock = false
        if (loop) {
            $thread.background({
                delay: this.#syncInterval,
                handler: () => this.sync(loop)
            })
        }
    }

    checkUserAction() {
        if (!$file.exists(this.userActionPath) || $file.list(this.userActionPath).length === 0) {
            $file.mkdir(this.userActionPath)
            this.importExampleAction()
        }
        if (!$file.exists(this.iCloudPath) || $file.list(this.iCloudPath).length === 0) {
            $file.mkdir(this.iCloudPath)
            $file.copy({
                src: this.userActionPath,
                dst: this.iCloudPath
            })
        }
    }

    getActionTypes() {
        const type = ["clipboard", "editor"] // 保证 "clipboard", "editor" 排在前面
        return type.concat(
            $file.list(this.userActionPath).filter(dir => {
                // 获取 type.indexOf(dir) < 0 的文件夹名
                if ($file.isDirectory(`${this.userActionPath}/${dir}`) && type.indexOf(dir) < 0) return dir
            })
        )
    }

    getActionOrder(type) {
        const path = `${this.userActionPath}/${type}/${this.actionOrderFile}`
        if ($file.exists(path)) return JSON.parse($file.read(path).string)
        else return []
    }

    getActionPath(type, dir) {
        return `${this.userActionPath}/${type}/${dir}`
    }

    getActionConfig(type, dir) {
        return JSON.parse($file.read(`${this.getActionPath(type, dir)}/config.json`).string)
    }

    getActionReadme(type, dir) {
        return $file.read(`${this.getActionPath(type, dir)}/README.md`).string
    }

    getAction(type, dir, data) {
        const basePath = this.getActionPath(type, dir)
        const config = this.getActionConfig(type, dir)
        try {
            const script = $file.read(`${basePath}/main.js`).string
            const MyAction = new Function("Action", "ActionEnv", "ActionData", `${script}\n return MyAction`)(
                Action,
                ActionEnv,
                ActionData
            )
            const action = new MyAction(this.kernel, config, data)
            return action
        } catch (error) {
            $ui.error(error)
            this.kernel.error(error)
        }
    }

    getActionHandler(type, dir) {
        return async data => {
            try {
                const action = this.getAction(type, dir, data)
                return await action.do()
            } catch (error) {
                $ui.error(error)
                this.kernel.error(error)
            }
        }
    }

    getActions(type) {
        const actions = []
        const typePath = `${this.userActionPath}/${type}`
        if (!$file.exists(typePath)) return []
        const pushAction = dir => {
            const basePath = `${typePath}/${dir}/`
            if ($file.isDirectory(basePath)) {
                const config = this.getActionConfig(type, dir)
                actions.push(
                    Object.assign(config, {
                        dir,
                        type,
                        name: config.name ?? dir,
                        icon: config.icon,
                        color: config.color
                    })
                )
            }
        }
        // push 有顺序的 Action
        const order = this.getActionOrder(type)
        order.forEach(item => pushAction(item))
        // push 剩下的 Action
        $file.list(typePath).forEach(item => {
            if (order.indexOf(item) === -1) pushAction(item)
        })
        return actions
    }

    getTypeName(type) {
        const typeUpperCase = type.toUpperCase()
        const l10n = $l10n(typeUpperCase)
        const name = l10n === typeUpperCase ? type : l10n
        this.typeNameMap[name] = type
        return name
    }

    getTypeDir(name) {
        return this.typeNameMap[name] ?? name
    }

    #saveFile(type, dir, file, data) {
        if (typeof data !== "string") {
            data = JSON.stringify(data)
        }

        const path = `${this.userActionPath}/${type}/${dir}`
        if (!$file.exists(path)) $file.mkdir(path)
        if (data === $file.read(`${path}/${file}`)?.string) {
            return
        }

        $file.write({
            data: $data({ string: data }),
            path: `${path}/${file}`
        })

        const iCloudPath = `${this.iCloudPath}/${type}/${dir}`
        if (!$file.exists(iCloudPath)) $file.mkdir(iCloudPath)
        $file.write({
            data: $data({ string: data }),
            path: `${iCloudPath}/${file}`
        })
    }

    saveActionInfo(info) {
        this.#saveFile(info.type, info.dir, "config.json", {
            icon: info.icon,
            color: info.color,
            name: info.name
        })
        this.#saveFile(info.type, info.dir, "README.md", info.readme)

        this.actionsNeedReload(true)
    }

    saveMainJs(info, content) {
        this.#saveFile(info.type, info.dir, "main.js", content)
    }

    saveOrder(type, order) {
        $file.write({
            data: $data({ string: JSON.stringify(order) }),
            path: `${this.userActionPath}/${type}/${this.actionOrderFile}`
        })
        $file.write({
            data: $data({ string: JSON.stringify(order) }),
            path: `${this.iCloudPath}/${type}/${this.actionOrderFile}`
        })
        this.actionsNeedReload(true)
    }

    move(from, to) {
        if (from.section === to.section && from.row === to.row) return

        const fromSection = this.actions[from.section]
        const fromItems = fromSection.items
        const fromType = this.getTypeDir(fromSection.title)

        const getOrder = items => {
            return items.map(item => item.dir)
        }

        // 判断是否跨 section
        if (from.section === to.section) {
            fromItems.splice(from.row < to.row ? to.row + 1 : to.row, 0, fromItems[from.row]) // 在 to 位置插入元素
            fromItems.splice(from.row > to.row ? from.row + 1 : from.row, 1) // 删除 from 位置元素
            this.saveOrder(fromType, getOrder(fromItems))
        } else {
            const toSection = this.actions[to.section]
            const toItems = toSection.items
            const toType = this.getTypeDir(toSection.title)

            toItems.splice(to.row, 0, fromItems[from.row]) // 在 to 位置插入元素
            fromItems.splice(from.row, 1) // 删除 from 位置元素
            // 跨 section 则同时移动 Action 目录
            this.saveOrder(toType, getOrder(toItems))
            this.saveOrder(fromType, getOrder(fromItems))
            $file.move({
                src: `${this.userActionPath}/${fromType}/${toItems[to.row].dir}`,
                dst: `${this.userActionPath}/${toType}/${toItems[to.row].dir}`
            })
            $file.move({
                src: `${this.iCloudPath}/${fromType}/${toItems[to.row].dir}`,
                dst: `${this.iCloudPath}/${toType}/${toItems[to.row].dir}`
            })
        }

        this.actionsNeedReload(true)
    }

    delete(info) {
        $file.delete(`${this.userActionPath}/${info.type}/${info.dir}`)
        $file.delete(`${this.iCloudPath}/${info.type}/${info.dir}`)
        this.actionsNeedReload(true)
    }
}

module.exports = ActionManagerData
