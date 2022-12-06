const { ActionEnv, ActionData, Action } = require("../../action/action")

/**
 * @typedef {import("../../app").AppKernel} AppKernel
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
                const rows = this.getActions(type)
                return {
                    title: this.getTypeName(type),
                    items: rows,
                    rows: rows
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

    getAction(type, dir, data) {
        const basePath = this.getActionPath(type, dir)
        const config = JSON.parse($file.read(`${basePath}/config.json`).string)
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
        const pushAction = item => {
            const basePath = `${typePath}/${item}/`
            if ($file.isDirectory(basePath)) {
                const config = JSON.parse($file.read(basePath + "config.json").string)
                actions.push(
                    Object.assign(config, {
                        dir: item,
                        type: type,
                        name: config.name ?? item,
                        icon: config.icon
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

    saveActionInfo(info) {
        const path = `${this.userActionPath}/${info.type}/${info.dir}`
        if (!$file.exists(path)) $file.mkdir(path)
        $file.write({
            data: $data({
                string: JSON.stringify({
                    icon: info.icon,
                    color: info.color,
                    name: info.name,
                    description: info.description
                })
            }),
            path: `${path}/config.json`
        })

        this.actionsNeedReload()
    }

    saveMainJs(info, content) {
        const path = `${this.userActionPath}/${info.type}/${info.dir}`
        const mainJsPath = `${path}/main.js`
        if (!$file.exists(path)) $file.mkdir(path)
        if ($text.MD5(content) === $text.MD5($file.read(mainJsPath)?.string ?? "")) return
        $file.write({
            data: $data({ string: content }),
            path: mainJsPath
        })
    }

    saveOrder(type, order) {
        $file.write({
            data: $data({ string: JSON.stringify(order) }),
            path: `${this.userActionPath}/${type}/${this.actionOrderFile}`
        })
        this.actionsNeedReload()
    }

    move(from, to, data) {
        if (from.section === to.section && from.row === to.row) return
        // 处理 data 数据
        data = data.map(section => {
            section.rows = section.rows.map(item => item.info.info)
            return section
        })
        const fromSection = data[from.section],
            toSection = data[to.section]
        const getOrder = section => {
            const order = []
            data[section].rows.forEach(item => order.push(item.dir))
            return order
        }

        const fromType = this.getTypeDir(fromSection.title)
        const toType = this.getTypeDir(toSection.title)
        // 判断是否跨 section
        if (from.section === to.section) {
            this.saveOrder(fromType, getOrder(from.section))
        } else {
            // 跨 section 则同时移动 Action 目录
            this.saveOrder(fromType, getOrder(from.section))
            this.saveOrder(toType, getOrder(to.section))
            $file.move({
                src: `${this.userActionPath}/${fromType}/${toSection.rows[to.row].dir}`,
                dst: `${this.userActionPath}/${toType}/${toSection.rows[to.row].dir}`
            })
        }

        this.actionsNeedReload()
    }

    delete(info) {
        $file.delete(`${this.userActionPath}/${info.type}/${info.dir}`)
        this.actionsNeedReload()
    }
}

module.exports = ActionManagerData
