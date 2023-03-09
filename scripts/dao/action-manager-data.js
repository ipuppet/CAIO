const { FileStorage } = require("../libs/easy-jsbox")
const { ActionEnv, ActionData, Action } = require("../action/action")
const WebDavSyncAction = require("./webdav-sync-action")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class ActionManagerData {
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
        this.localSyncFile = this.userActionPath + "/sync.json"
        this.iCloudPath = "drive://CAIO/user_action"
        this.iCloudSyncFile = this.iCloudPath + "/sync.json"
        this.iCloudSyncFileUndownloaded = this.iCloudPath + "/.sync.json.icloud"
        // 用来存储被美化的 Action 分类名称
        this.typeNameMap = {}
        // checkUserAction
        this.checkUserAction()
        // sync
        this.sync() // 立即同步一次
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

    get isNew() {
        return $cache.get("caio.action.isNew") ?? false
    }
    set isNew(isNew) {
        $cache.get("caio.action.isNew", isNew)
    }

    get isEnableWebDavSync() {
        return this.kernel.setting.get("webdav.status") && this.kernel.setting.get("experimental.syncAction")
    }

    actionsNeedReload() {
        this.#actions = undefined
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
        this.needUpload()
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
        return new Date(localSyncData.timestamp)
    }

    checkSyncData() {
        if (!$file.exists(this.localSyncFile)) {
            $file.write({
                data: $data({ string: JSON.stringify({ timestamp: 0 }) }),
                path: this.localSyncFile
            })
        }
        if (!$file.exists(this.iCloudSyncFile)) {
            if ($file.exists(this.iCloudSyncFileUndownloaded)) {
                $file.download(this.iCloudSyncFileUndownloaded)
            } else {
                $file.write({
                    data: $data({ string: JSON.stringify({ timestamp: 0 }) }),
                    path: this.iCloudSyncFile
                })
            }
        }
    }

    async sync(loop = false) {
        if (!this.kernel.setting.get("experimental.syncAction")) {
            return
        }
        if (this.kernel.setting.get("webdav.status")) {
            if (!this.webdavSync) {
                await this.initSyncWithWebDav()
            }
            return
        }
        if (this.#syncLock) {
            await $wait(this.#syncInterval)
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
        if (localSyncData.timestamp < iCloudSyncData.timestamp) {
            this.kernel.print("local data need update")
            $app.notify({
                name: "actionSyncStatus",
                object: { status: WebDavSyncAction.status.syncing }
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
                object: { status: WebDavSyncAction.status.success }
            })
        } else if (localSyncData.timestamp > iCloudSyncData.timestamp) {
            // 直接更新 iCloudSyncFile
            // 在其他方法中已经对 iCloud 文件进行了更改
            $file.write({
                data: $data({ string: JSON.stringify({ timestamp: localSyncData.timestamp }) }),
                path: this.iCloudSyncFile
            })
            // 停顿一个同步间隔
            await $wait(this.#syncInterval)
            // 通知更新 UI
            $app.notify({
                name: "actionSyncStatus",
                object: { status: WebDavSyncAction.status.success }
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

    async initSyncWithWebDav() {
        if (!this.isEnableWebDavSync) return
        try {
            this.webdavSync = new WebDavSyncAction({
                kernel: this.kernel,
                host: this.kernel.setting.get("webdav.host"),
                user: this.kernel.setting.get("webdav.user"),
                password: this.kernel.setting.get("webdav.password"),
                basepath: this.kernel.setting.get("webdav.basepath")
            })
            await this.webdavSync.init()
        } catch (error) {
            this.kernel.error(error)
            throw error
        }
    }

    syncWithWebDav() {
        if (!this.isEnableWebDavSync) return
        this.webdavSync.sync()
    }

    needUpload() {
        if (!this.isEnableWebDavSync) return
        this.webdavSync.needUpload()
        this.actionsNeedReload()
    }

    checkUserAction() {
        if (!$file.exists(this.userActionPath) || $file.list(this.userActionPath).length === 0) {
            $file.mkdir(this.userActionPath)
            this.isNew = false
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

    getActionOrder(type, must = false) {
        const typePath = `${this.userActionPath}/${type}`
        const orderPath = `${typePath}/${this.actionOrderFile}`
        if ($file.exists(orderPath)) {
            const order = JSON.parse($file.read(orderPath).string)
            const filtered = order.filter(action => {
                if ($file.exists(`${typePath}/${action}`)) {
                    return true
                }
                return false
            })
            if (filtered.length !== order.length) {
                this.saveOrder(type, filtered)
            }
            return filtered
        } else {
            if (must) {
                const order = []
                $file.list(typePath).forEach(item => {
                    order.push(item)
                })
                return order
            } else {
                return []
            }
        }
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

    #saveFile(data, ...args) {
        if (typeof data !== "string") {
            data = JSON.stringify(data)
        }

        const fullPath = FileStorage.join(this.userActionPath, ...args)
        const path = fullPath.substring(0, fullPath.lastIndexOf("/"))
        if (!$file.exists(path)) $file.mkdir(path)
        const fileString = $file.read(fullPath)?.string
        let fileData
        try {
            fileData = JSON.stringify(JSON.parse(fileString))
        } catch {
            fileData = fileString
        }
        if (data === fileData) {
            return
        }

        $file.write({
            data: $data({ string: data }),
            path: fullPath
        })

        const iCloudFullPath = FileStorage.join(this.iCloudPath, ...args)
        const iCloudPath = fullPath.substring(0, fullPath.lastIndexOf("/"))
        if (!$file.exists(iCloudPath)) $file.mkdir(iCloudPath)
        $file.write({
            data: $data({ string: data }),
            path: iCloudFullPath
        })

        this.needUpload()
    }

    saveActionInfo(info) {
        this.#saveFile(
            {
                icon: info.icon,
                color: info.color,
                name: info.name
            },
            info.type,
            info.dir,
            "config.json"
        )
        this.#saveFile(info.readme, info.type, info.dir, "README.md")
    }

    saveMainJs(info, content) {
        this.#saveFile(content, info.type, info.dir, "main.js")
    }

    saveOrder(type, order) {
        this.#saveFile(JSON.stringify(order), type, this.actionOrderFile)
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
    }

    delete(info) {
        $file.delete(`${this.userActionPath}/${info.type}/${info.dir}`)
        $file.delete(`${this.iCloudPath}/${info.type}/${info.dir}`)
        this.needUpload()
    }

    exists(info) {
        const path = `${this.userActionPath}/${info.type}/${info.dir}`
        if ($file.exists(path)) {
            return true
        }
        return false
    }
}

module.exports = ActionManagerData
