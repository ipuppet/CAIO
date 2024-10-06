const { FileStorage, UIKit, Sheet } = require("../libs/easy-jsbox")
const { ActionEnv, ActionData, Action } = require("../action/action")
const { SecureScript } = require("../action/secure")
const WebDavSyncAction = require("./webdav-sync-action")
const { KeyboardPinActions } = require("../ui/components/keyboard-scripts")
const { TodayPinActions } = require("../ui/components/today-actions")

/**
 * @typedef {import("../app-main").AppKernel} AppKernel
 * @typedef {ActionsData} ActionsData
 */

class ActionsData {
    allActionsCacheKey = "allActions"

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
        this.localSyncFile = this.userActionPath + "/sync.json"
        // checkUserAction
        this.checkUserAction()
        // sync
        this.initWebdavSync()
        this.sync()
    }

    get actions() {
        if (!this.#actions) this.#initActions()
        return this.#actions
    }
    get allActions() {
        const allActions = $cache.get(this.allActionsCacheKey)
        // 无分类的单层数组
        if (!allActions || typeof allActions !== "object") this.#initActions()
        return allActions
    }

    get isNew() {
        return $cache.get("caio.action.isNew") ?? false
    }
    set isNew(isNew) {
        $cache.get("caio.action.isNew", isNew)
    }

    #initActions() {
        this.#actions = this.getActionCategories().map(category => {
            return {
                category,
                dir: category,
                title: this.getCategoryTitle(category),
                items: this.getActions(category) // 过程中可能调用 saveOrder 导致 this.#allActions 被置为 undefined
            }
        })
        const allActions = {}
        this.#actions.map(category =>
            category.items.forEach(item => {
                allActions[category.category + item.dir] = item
            })
        )
        $cache.set(this.allActionsCacheKey, allActions)
        this.kernel.logger.info(`init action-data`)
    }

    importExampleAction() {
        if (this.isNew) {
            try {
                Object.keys(__ACTIONS__).forEach(category => {
                    Object.keys(__ACTIONS__[category]).forEach(dir => {
                        const action = __ACTIONS__[category][dir]
                        if (!this.exists(category, dir)) {
                            this.importAction(action, category, false)
                        }
                    })
                })
            } catch {
                $file.list(this.actionPath).forEach(category => {
                    const actionCategoryPath = `${this.actionPath}/${category}`
                    if ($file.isDirectory(actionCategoryPath)) {
                        const userActionCategoryPath = `${this.userActionPath}/${category}`
                        $file.list(actionCategoryPath).forEach(dir => {
                            if (!this.exists(category, dir)) {
                                $file.mkdir(userActionCategoryPath)
                                $file.copy({
                                    src: `${actionCategoryPath}/${dir}`,
                                    dst: `${userActionCategoryPath}/${dir}`
                                })
                            }
                        })
                    }
                })
            }
            this.needUpload()
            return
        }
        const actionRaw = {}
        const data = (() => {
            const actionList = []
            try {
                Object.keys(__ACTIONS__).forEach(category => {
                    const rows = []
                    Object.keys(__ACTIONS__[category]).forEach(dir => {
                        const action = __ACTIONS__[category][dir]
                        const config = JSON.parse(action.config)
                        Object.assign(config, { category, dir })
                        rows.push(this.kernel.actions.views.actionToData(config))
                        actionRaw[category + dir] = [action, category]
                    })
                    actionList.push({
                        title: this.getCategoryTitle(category),
                        rows: rows
                    })
                })
            } catch {
                $file.list(this.actionPath).forEach(category => {
                    const actionCategoryPath = `${this.actionPath}/${category}`
                    if ($file.isDirectory(actionCategoryPath)) {
                        const rows = []
                        $file.list(actionCategoryPath).forEach(dir => {
                            try {
                                const action = {
                                    config: $file.read(`${actionCategoryPath}/${dir}/config.json`).string,
                                    main: $file.read(`${actionCategoryPath}/${dir}/main.js`).string,
                                    readme: $file.read(`${actionCategoryPath}/${dir}/README.md`).string
                                }
                                const config = JSON.parse(action.config)
                                Object.assign(config, { category, dir })
                                rows.push(this.kernel.actions.views.actionToData(config))
                                actionRaw[category + dir] = [action, category]
                            } catch (error) {
                                this.kernel.logger.error(`Error during importExampleAction: ${category}/${dir}`)
                            }
                        })
                        actionList.push({
                            title: this.getCategoryTitle(category),
                            rows: rows
                        })
                    }
                })
            }
            return actionList
        })()
        const listView = this.kernel.actions.views.getActionListView(
            (_, info) => {
                $ui.alert({
                    title: $l10n("IMPORT_EXAMPLE_ACTIONS"),
                    message: `Category: ${info.category}\n${info.name}`,
                    actions: [
                        { title: $l10n("CANCEL") },
                        {
                            title: $l10n("OK"),
                            handler: () => {
                                try {
                                    const action = actionRaw[info.category + info.dir]
                                    this.importAction(action[0], action[1], false)
                                    $ui.success($l10n("SUCCESS"))
                                } catch (error) {
                                    $ui.alert({
                                        title: $l10n("ERROR"),
                                        message: error.message
                                    })
                                }
                            }
                        }
                    ]
                })
            },
            {
                id: "importExampleAction",
                bgcolor: $color("primarySurface"),
                data: data,
                stickyHeader: false
            }
        )
        const sheet = new Sheet()
        sheet
            .setView(listView)
            .addNavBar({ title: $l10n("IMPORT_EXAMPLE_ACTIONS") })
            .init()
            .present()
    }

    exportAction(action) {
        const loading = UIKit.loading()
        loading.start()

        const { category, dir, name } = action

        const content = this.actionToString(category, dir)
        loading.end()
        $share.sheet([
            {
                name: name + ".json",
                data: $data({ string: content })
            }
        ])
    }

    importAction(data, category = "uncategorized", animate = true) {
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
            const actionPath = this.getActionPath(category, dirName)
            $file.mkdir(actionPath)

            $file.write({
                data: $data({ string: config }),
                path: FileStorage.join(actionPath, "config.json")
            })
            $file.write({
                data: $data({ string: main }),
                path: FileStorage.join(actionPath, "main.js")
            })
            $file.write({
                data: $data({ string: readme }),
                path: FileStorage.join(actionPath, "README.md")
            })
            this.needUpload(true)

            return dirName
        } catch (error) {
            throw error
        } finally {
            loading?.end()
        }
    }

    checkUserAction() {
        if (!$file.exists(this.userActionPath) || $file.list(this.userActionPath).length === 0) {
            $file.mkdir(this.userActionPath)
            this.importExampleAction()
            this.isNew = false
        }
    }

    getLocalSyncDate() {
        const localSyncDate = JSON.parse($file.read(this.localSyncFile)?.string ?? "{}")
        return new Date(localSyncDate.timestamp)
    }

    async initWebdavSync() {
        if (!this.kernel.isWebdavEnabled) return

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
    }

    setNeedReload(animate) {
        this.#actions = undefined
        $cache.remove(this.allActionsCacheKey)

        // 通知更新 UI
        try {
            this.applySnapshotAnimatingDifferences(animate)
        } catch {}
    }

    needUpload() {
        this.setNeedReload()
        if (!this.webdavSync) return
        this.webdavSync.needUpload()
    }

    async sync() {
        if (!this.webdavSync) return
        this.webdavSync.sync()
    }

    updatePinActions(from, to) {
        KeyboardPinActions.shared.setKernel(this.kernel).updateAction(from, to)
        TodayPinActions.shared.setKernel(this.kernel).updateAction(from, to)
    }

    actionToString(category, dir) {
        return JSON.stringify({
            config: this.getActionConfigString(category, dir),
            main: this.getActionMainJs(category, dir),
            readme: this.getActionReadme(category, dir)
        })
    }

    defaultCategories() {
        return ["uncategorized", "clipboard", "editor"]
    }

    getActionCategories() {
        const category = this.defaultCategories() // 保证 "uncategorized", "clipboard", "editor" 排在前面
        return category.concat(
            $file.list(this.userActionPath).filter(dir => {
                // 获取 category.indexOf(dir) < 0 的文件夹名
                return $file.isDirectory(`${this.userActionPath}/${dir}`) && category.indexOf(dir) < 0
            })
        )
    }

    async deleteActionCategory(category) {
        const path = `${this.userActionPath}/${category}`
        const result = await $ui.alert({
            title: $l10n("delete.category").replace("${category}", category),
            message: $l10n("delete.category.keep.actions"),
            actions: [
                { title: $l10n("OK") },
                {
                    title: $l10n("DELETE"),
                    style: $alertActionType.destructive
                },
                { title: $l10n("CANCEL") }
            ]
        })
        if (result.index === 2) {
            return false
        }
        if (result.index === 0) {
            // move to other uncategorized
            for (let action of $file.list(path)) {
                $file.move({
                    src: `${path}/${action}`,
                    dst: `${this.userActionPath}/uncategorized/${action}`
                })
            }
        }

        $file.delete(path)
        this.needUpload()

        return true
    }

    addActionCategory() {
        $input.text({
            text: "",
            placeholder: $l10n("CREATE_NEW_TYPE"),
            handler: text => {
                text = text.trim()
                if (text === "") {
                    $ui.toast($l10n("INVALID_VALUE"))
                    return
                }
                const path = `${this.userActionPath}/${text}`
                if ($file.isDirectory(path)) {
                    $ui.warning($l10n("TYPE_ALREADY_EXISTS"))
                }
                $file.mkdir(path)
                $ui.success($l10n("SUCCESS"))
                this.needUpload()
            }
        })
    }

    async renameActionCategory(category) {
        let text = await $input.text({ text: category })
        text = text.trim()
        if (text === "") {
            $ui.toast($l10n("INVALID_VALUE"))
            return false
        }
        const oldPath = `${this.userActionPath}/${category}`
        const path = `${this.userActionPath}/${text}`
        if ($file.isDirectory(path)) {
            $ui.warning($l10n("TYPE_ALREADY_EXISTS"))
            return false
        }

        $file.move({
            src: oldPath,
            dst: path
        })
        $ui.success($l10n("SUCCESS"))
        this.needUpload()
        return true
    }

    getActionCategorySection(category) {
        for (const i in this.actions) {
            if (this.actions[i].dir === category) {
                return i
            }
        }
        return null
    }

    getActionOrder(category, must = false) {
        const categoryPath = `${this.userActionPath}/${category}`
        const orderPath = `${categoryPath}/${this.actionOrderFile}`
        if ($file.exists(orderPath)) {
            const orderJson = $file.read(orderPath)?.string
            if (!orderJson) {
                this.kernel.logger.error(`File read error: ${orderPath}`)
                this.kernel.logger.error(`File content: ${$file.read(orderPath)}`)
                this.kernel.logger.error(`File content: ${orderJson}`)
                return []
            }
            const order = JSON.parse(orderJson)
            const filtered = order.filter(action => {
                if ($file.exists(`${categoryPath}/${action}`)) {
                    return true
                }
                return false
            })
            if (filtered.length !== order.length) {
                this.saveOrder(category, filtered)
            }
            return filtered
        } else {
            if (must) {
                const order = []
                $file.list(categoryPath).forEach(item => {
                    order.push(item)
                })
                return order
            } else {
                return []
            }
        }
    }

    getActionPath(category, dir) {
        return `${this.userActionPath}/${category}/${dir}`
    }

    getActionConfigString(category, dir) {
        return $file.read(`${this.getActionPath(category, dir)}/config.json`).string
    }
    getActionConfig(category, dir) {
        return JSON.parse(this.getActionConfigString(category, dir))
    }

    getActionMainJs(category, dir) {
        return $file.read(`${this.getActionPath(category, dir)}/main.js`).string
    }

    getActionReadme(category, dir) {
        return $file.read(`${this.getActionPath(category, dir)}/README.md`).string
    }

    initActionDirByName(name) {
        return $text.MD5(name)
    }

    getActionDir(category, name) {
        const md5 = this.initActionDirByName(name)
        if ($file.isDirectory(this.getActionPath(category, md5))) {
            return md5
        }
        for (const action of this.actions[category].items) {
            if (action.name === name) {
                return action.dir
            }
        }

        return null
    }

    getAction(category, dir, data) {
        if (!$file.exists(this.getActionPath(category, dir))) {
            dir = this.initActionDirByName(dir)
        }
        try {
            const script = this.getActionMainJs(category, dir)
            const ss = new SecureScript(script)
            const MyAction = new Function("Action", "ActionEnv", "ActionData", `${ss.secure()}\n return MyAction`)(
                Action,
                ActionEnv,
                ActionData
            )
            const action = new MyAction(this.kernel, this.getActionConfig(category, dir), data)
            return action
        } catch (error) {
            this.kernel.logger.error(`Error during getAction: ${category}/${dir}`)
            this.kernel.logger.error(error)
            throw error
        }
    }

    getActionHandler(category, dir) {
        return async data => {
            try {
                const action = this.getAction(category, dir, data)
                return await action.do()
            } catch (error) {
                this.kernel.logger.error(error)
                throw error
            }
        }
    }

    getActions(category) {
        const actions = []
        const categoryPath = `${this.userActionPath}/${category}`
        if (!$file.exists(categoryPath)) return []
        const pushAction = dir => {
            const basePath = `${categoryPath}/${dir}/`
            if ($file.isDirectory(basePath)) {
                const config = this.getActionConfig(category, dir)
                actions.push(Object.assign(config, { category, dir }))
            }
        }
        // push 有顺序的 Action
        const order = this.getActionOrder(category)
        order.forEach(item => pushAction(item))
        // push 剩下的 Action
        $file.list(categoryPath).forEach(item => {
            if (order.indexOf(item) === -1) pushAction(item)
        })
        return actions
    }

    getCategoryTitle(category) {
        const categoryUpperCase = category.toUpperCase()
        const l10n = $l10n(categoryUpperCase)
        const name = l10n === categoryUpperCase ? category : l10n
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
    }

    changeCategory(from, to) {
        $file.move({
            src: `${this.userActionPath}/${from.category}/${from.dir}`,
            dst: `${this.userActionPath}/${to.category}/${to.dir}`
        })
    }

    saveActionInfo(from, to) {
        if (from) {
            if (from.category !== to.category) {
                this.changeCategory(from, to)
            }
            this.updatePinActions(from, to)
        }

        this.#saveFile(
            {
                icon: to.icon,
                color: to.color,
                name: to.name
            },
            to.category,
            to.dir,
            "config.json"
        )
        this.#saveFile(to.readme, to.category, to.dir, "README.md")
        this.needUpload(true)
    }

    saveMainJs(info, content) {
        this.#saveFile(content, info.category, info.dir, "main.js")
        this.needUpload()
    }

    saveOrder(category, order) {
        this.#saveFile(JSON.stringify(order), category, this.actionOrderFile)
        this.needUpload()
    }

    move(from, to) {
        if (from.section === to.section && from.item === to.item) return

        const fromSection = this.actions[from.section]
        let fromItems = fromSection.items
        const fromCategory = fromSection.dir

        const getOrder = items => {
            return items.map(item => item.dir)
        }

        // 判断是否跨 section
        if (from.section === to.section) {
            const to_i = from.item < to.item ? to.item + 1 : to.item
            const from_i = from.item > to.item ? from.item + 1 : from.item
            fromItems.splice(to_i, 0, fromItems[from.item]) // 在 to 位置插入元素
            fromItems = fromItems.filter((_, i) => i !== from_i)
            this.saveOrder(fromCategory, getOrder(fromItems))
        } else {
            const toSection = this.actions[to.section]
            const toItems = toSection.items
            const toCategory = toSection.dir

            toItems.splice(to.item, 0, fromItems[from.item]) // 在 to 位置插入元素
            fromItems = fromItems.filter((_, i) => i !== from.item) // 删除 from 位置元素
            // 跨 section 则同时移动 Action 目录
            const _fromItem = toItems[to.item]
            const _toItem = Object.assign(JSON.parse(JSON.stringify(toItems[to.item])), { category: toCategory })
            this.changeCategory(_fromItem, _toItem)
            this.updatePinActions(_fromItem, _toItem)
            // 代码顺序不能错
            this.saveOrder(toCategory, getOrder(toItems))
            this.saveOrder(fromCategory, getOrder(fromItems))
        }
        this.needUpload()
    }

    delete(info) {
        $file.delete(`${this.userActionPath}/${info.category}/${info.dir}`)
        this.needUpload(true)
    }

    exists(category, dir) {
        return this.allActions[category + dir] !== undefined
    }
}

module.exports = ActionsData
