const { FileStorage } = require("../libs/easy-jsbox")
const { ActionEnv, ActionData, Action } = require("../action/action")
const WebDavSyncAction = require("./webdav-sync-action")

/**
 * @typedef {import("../app").AppKernel} AppKernel
 */

class ActionManagerData {
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
        // 用来存储被美化的 Action 分类名称
        this.typeNameMap = {}
        // checkUserAction
        this.checkUserAction()
        // sync
        this.sync()
    }

    get actions() {
        if (!this.#actions) {
            this.#actions = this.getActionTypes().map(type => {
                return {
                    title: this.getTypeName(type),
                    items: this.getActions(type)
                }
            })
            this.kernel.print(`init actions`)
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
        return this.kernel.setting.get("webdav.status")
    }

    setNeedReload() {
        this.#actions = undefined
        if (!this.isEnableWebDavSync) return
        this.webdavSync.needUpload()
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
        this.setNeedReload()
    }

    getLocalSyncData() {
        const localSyncData = JSON.parse($file.read(this.localSyncFile)?.string ?? "{}")
        return new Date(localSyncData.timestamp)
    }

    async sync() {
        if (!this.kernel.setting.get("webdav.status")) {
            return
        }
        if (!this.webdavSync) {
            await this.initSyncWithWebDav()
        } else {
            await this.webdavSync.init()
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
            this.kernel.error(`${error}\n${error.stack}`)
        }
    }

    syncWithWebDav() {
        if (!this.isEnableWebDavSync) return
        this.webdavSync.sync()
    }

    checkUserAction() {
        if (!$file.exists(this.userActionPath) || $file.list(this.userActionPath).length === 0) {
            $file.mkdir(this.userActionPath)
            this.isNew = false
            this.importExampleAction()
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
        this.setNeedReload()
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
        let fromItems = fromSection.items
        const fromType = this.getTypeDir(fromSection.title)

        const getOrder = items => {
            return items.map(item => item.dir)
        }

        // 判断是否跨 section
        if (from.section === to.section) {
            const to_i = from.row < to.row ? to.row + 1 : to.row
            const from_i = from.row > to.row ? from.row + 1 : from.row
            fromItems.splice(to_i, 0, fromItems[from.row]) // 在 to 位置插入元素
            fromItems = fromItems.filter((_, i) => i !== from_i)
            this.saveOrder(fromType, getOrder(fromItems))
        } else {
            const toSection = this.actions[to.section]
            const toItems = toSection.items
            const toType = this.getTypeDir(toSection.title)

            toItems.splice(to.row, 0, fromItems[from.row]) // 在 to 位置插入元素
            fromItems = fromItems.filter((_, i) => i !== from.row) // 删除 from 位置元素
            // 跨 section 则同时移动 Action 目录
            $file.move({
                src: `${this.userActionPath}/${fromType}/${toItems[to.row].dir}`,
                dst: `${this.userActionPath}/${toType}/${toItems[to.row].dir}`
            })
            this.saveOrder(toType, getOrder(toItems))
            this.saveOrder(fromType, getOrder(fromItems))
        }
    }

    delete(info) {
        $file.delete(`${this.userActionPath}/${info.type}/${info.dir}`)
        this.setNeedReload()
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
