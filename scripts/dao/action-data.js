const { FileStorage, UIKit } = require("../libs/easy-jsbox")
const { ActionEnv, ActionData, Action } = require("../action/action")
const { SecureScript } = require("../action/secure")
const WebDavSyncAction = require("./webdav-sync-action")

/**
 * @typedef {import("../app-main").AppKernel} AppKernel
 * @typedef {ActionsData} ActionsData
 */

class ActionsData {
    #actions
    #allActions

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
        // checkUserAction
        this.checkUserAction()
        // sync
        this.sync()
    }

    get actions() {
        if (!this.#actions) this.#initActions()
        return this.#actions
    }
    get allActions() {
        if (!this.#allActions) this.#initActions()
        return this.#allActions
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

    #initActions() {
        this.#actions = this.getActionTypes().map(type => {
            return {
                dir: type,
                title: this.getTypeTitle(type),
                items: this.getActions(type) // 过程中可能调用 saveOrder 导致 this.#allActions 被置为 undefined
            }
        })
        this.#allActions = {}
        this.#actions.map(type =>
            type.items.forEach(item => {
                this.#allActions[item.name] = item
            })
        )
        this.kernel.logger.info(`init actions`)
    }

    setNeedReload() {
        this.#actions = undefined
        this.#allActions = undefined
        if (!this.isEnableWebDavSync) return
        this.webdavSync.needUpload()
    }

    importExampleAction() {
        try {
            Object.keys(__ACTIONS__).forEach(type => {
                Object.keys(__ACTIONS__[type]).forEach(dir => {
                    const action = __ACTIONS__[type][dir]
                    const config = JSON.parse(action.config)
                    if (!this.exists(config.name)) {
                        this.importAction(action, type, false)
                    }
                })
            })
        } catch {
            $file.list(this.actionPath).forEach(type => {
                const actionTypePath = `${this.actionPath}/${type}`
                if ($file.isDirectory(actionTypePath)) {
                    const userActionTypePath = `${this.userActionPath}/${type}`
                    $file.list(actionTypePath).forEach(dir => {
                        const config = JSON.parse($file.read(`${actionTypePath}/${dir}/config.json`).string)
                        if (!this.exists(config.name)) {
                            $file.mkdir(userActionTypePath)
                            $file.copy({
                                src: `${actionTypePath}/${dir}`,
                                dst: `${userActionTypePath}/${dir}`
                            })
                        }
                    })
                }
            })
        }
        this.setNeedReload()
    }

    actionToString(type, dir) {
        return JSON.stringify({
            config: this.getActionConfigString(type, dir),
            main: this.getActionMainJs(type, dir),
            readme: this.getActionReadme(type, dir)
        })
    }

    exportAction(action) {
        const loading = UIKit.loading()
        loading.start()

        const { type, dir, name } = action

        const content = this.actionToString(type, dir)
        loading.end()
        $share.sheet({
            items: [
                {
                    name: name + ".json",
                    data: $data({ string: content })
                }
            ]
        })
    }

    importAction(data, type = "uncategorized", animate = true) {
        const loading = animate ? UIKit.loading() : null
        loading?.start()

        try {
            const { config, main, readme } = data
            if (!config || !main || !readme) {
                throw new Error("Not an action")
            }
            let name = JSON.parse(config)?.name?.trim()
            if (!name || name === "") throw new Error("Not an action")

            const dirName = this.initActionDirByName(name)
            const tmpPath = FileStorage.join(this.tempPath, dirName)
            $file.mkdir(tmpPath)

            $file.write({
                data: $data({ string: config }),
                path: FileStorage.join(tmpPath, "config.json")
            })
            $file.write({
                data: $data({ string: main }),
                path: FileStorage.join(tmpPath, "main.js")
            })
            $file.write({
                data: $data({ string: readme }),
                path: FileStorage.join(tmpPath, "README.md")
            })
            $file.move({
                src: tmpPath,
                dst: this.getActionPath(type, dirName)
            })
            this.setNeedReload()

            return dirName
        } catch (error) {
            throw error
        } finally {
            loading?.end()
        }
    }

    getLocalSyncDate() {
        const localSyncDate = JSON.parse($file.read(this.localSyncFile)?.string ?? "{}")
        return new Date(localSyncDate.timestamp)
    }

    async sync() {
        if (!this.isEnableWebDavSync) return
        if (!this.webdavSync) {
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
                this.kernel.logger.error(`${error}\n${error.stack}`)
                throw error
            }
        } else {
            this.webdavSync.sync()
        }
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
                return $file.isDirectory(`${this.userActionPath}/${dir}`) && type.indexOf(dir) < 0
            })
        )
    }

    getActionTypeSection(type) {
        for (const i in this.actions) {
            if (this.actions[i].dir === type) {
                return i
            }
        }
        return null
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

    getActionConfigString(type, dir) {
        return $file.read(`${this.getActionPath(type, dir)}/config.json`).string
    }
    getActionConfig(type, dir) {
        return JSON.parse(this.getActionConfigString(type, dir))
    }

    getActionMainJs(type, dir) {
        return $file.read(`${this.getActionPath(type, dir)}/main.js`).string
    }

    getActionReadme(type, dir) {
        return $file.read(`${this.getActionPath(type, dir)}/README.md`).string
    }

    initActionDirByName(name) {
        return $text.MD5(name)
    }

    getActionDirByName(name) {
        return this.allActions[name].dir
    }

    getAction(type, dir, data) {
        if (!$file.exists(this.getActionPath(type, dir))) {
            dir = this.initActionDirByName(dir)
        }
        try {
            const script = this.getActionMainJs(type, dir)
            const ss = new SecureScript(script)
            const MyAction = new Function("Action", "ActionEnv", "ActionData", `${ss.secure()}\n return MyAction`)(
                Action,
                ActionEnv,
                ActionData
            )
            const action = new MyAction(this.kernel, this.getActionConfig(type, dir), data)
            return action
        } catch (error) {
            this.kernel.logger.error(error)
            throw error
        }
    }

    getActionHandler(type, dir) {
        return async data => {
            try {
                const action = this.getAction(type, dir, data)
                return await action.do()
            } catch (error) {
                this.kernel.logger.error(error)
                throw error
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
                actions.push(Object.assign(config, { type, dir }))
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

    getTypeTitle(type) {
        const typeUpperCase = type.toUpperCase()
        const l10n = $l10n(typeUpperCase)
        const name = l10n === typeUpperCase ? type : l10n
        return name
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
        if (from.section === to.section && from.item === to.item) return

        const fromSection = this.actions[from.section]
        let fromItems = fromSection.items
        const fromType = fromSection.dir

        const getOrder = items => {
            return items.map(item => item.dir)
        }

        // 判断是否跨 section
        if (from.section === to.section) {
            const to_i = from.item < to.item ? to.item + 1 : to.item
            const from_i = from.item > to.item ? from.item + 1 : from.item
            fromItems.splice(to_i, 0, fromItems[from.item]) // 在 to 位置插入元素
            fromItems = fromItems.filter((_, i) => i !== from_i)
            this.saveOrder(fromType, getOrder(fromItems))
        } else {
            const toSection = this.actions[to.section]
            const toItems = toSection.items
            const toType = toSection.dir

            toItems.splice(to.item, 0, fromItems[from.item]) // 在 to 位置插入元素
            fromItems = fromItems.filter((_, i) => i !== from.item) // 删除 from 位置元素
            // 跨 section 则同时移动 Action 目录
            $file.move({
                src: `${this.userActionPath}/${fromType}/${toItems[to.item].dir}`,
                dst: `${this.userActionPath}/${toType}/${toItems[to.item].dir}`
            })
            this.saveOrder(toType, getOrder(toItems))
            this.saveOrder(fromType, getOrder(fromItems))
        }
    }

    delete(info) {
        $file.delete(`${this.userActionPath}/${info.type}/${info.dir}`)
        this.setNeedReload()
    }

    exists(name) {
        return this.allActions[name] !== undefined
    }
}

module.exports = ActionsData
