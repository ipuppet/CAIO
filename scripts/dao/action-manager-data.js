const { ActionEnv, ActionData, Action } = require("../action/action")

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
        this.userActionPath = `${this.kernel.fileStorage.basePath}/user_action`
        this.iCloudPath = "drive://CAIO/user_action"
        this.iCloudDataPath = "data.json"
        // 用来存储被美化的 Action 分类名称
        this.typeNameMap = {}
        // checkUserAction
        this.checkUserAction()
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
    }

    async sync() {
        // TODO: Actions iCloud sync
        return
        $thread.background({
            delay: 0,
            handler: () => {
                if ($file.exists(this.iCloudPath + `/.${this.iCloudDataPath}.icloud`))
                    console.log($file.list("drive://CAIO"))
                console.log($file.exists("drive://CAIO/.text.txt.icloud"))
            }
        })
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

        this.sync()
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

        this.actionsNeedReload()
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
        this.actionsNeedReload()
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

        this.actionsNeedReload()
    }

    delete(info) {
        $file.delete(`${this.userActionPath}/${info.type}/${info.dir}`)
        $file.delete(`${this.iCloudPath}/${info.type}/${info.dir}`)
        this.actionsNeedReload()
    }
}

module.exports = ActionManagerData
