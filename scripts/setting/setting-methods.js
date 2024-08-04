const { Kernel, UIKit } = require("../libs/easy-jsbox")

const { KeyboardAddins, KeyboardPinActions } = require("../ui/components/keyboard-scripts")
const ActionScripts = require("../ui/components/action-scripts")
const { TodayPinActions } = require("../ui/components/today-actions")

/**
 * @typedef {import("../app-main").AppKernel} AppKernel
 */

/**
 * @type {AppKernel}
 */
let kernel

function clips() {
    kernel.setting.method.exportClipboard = animate => {
        animate.start()
        kernel.storage.export(success => {
            if (success) {
                animate.done()
            } else {
                animate.cancel()
            }
        })
    }

    kernel.setting.method.importClipboard = animate => {
        animate.start()
        $ui.alert({
            title: $l10n("ALERT_INFO"),
            message: $l10n("OVERWRITE_ALERT"),
            actions: [
                {
                    title: $l10n("OK"),
                    handler: () => {
                        $drive.open({
                            handler: data => {
                                if (data === undefined) {
                                    animate.cancel()
                                    return
                                }
                                if (data.fileName.slice(-2) === "db" || data.fileName.slice(-3) === "zip") {
                                    kernel.storage
                                        .import(data)
                                        .then(() => {
                                            animate.done()
                                            $delay(0.3, () => {
                                                $addin.restart()
                                            })
                                        })
                                        .catch(error => {
                                            $ui.error(error)
                                            kernel.logger.error(error)
                                            animate.cancel()
                                        })
                                } else {
                                    $ui.warning($l10n("FILE_TYPE_ERROR"))
                                    animate.cancel()
                                }
                            }
                        })
                    }
                },
                {
                    title: $l10n("CANCEL"),
                    handler: () => animate.cancel()
                }
            ]
        })
    }

    kernel.setting.method.rebuildDatabase = animate => {
        animate.start()
        const rebuildDatabase = () => {
            try {
                kernel.storage.rebuild()
                animate.done()
                $delay(0.8, () => $addin.restart())
            } catch (error) {
                animate.cancel()
                $ui.alert(error)
            }
        }
        $ui.alert({
            title: $l10n("REBUILD_DATABASE_ALERT"),
            actions: [
                {
                    title: $l10n("REBUILD"),
                    style: $alertActionType.destructive,
                    handler: () => {
                        rebuildDatabase()
                    }
                },
                {
                    title: $l10n("CANCEL"),
                    handler: () => {
                        animate.cancel()
                    }
                }
            ]
        })
    }

    kernel.setting.method.deleteAllData = animate => {
        animate.start()
        $ui.alert({
            title: $l10n("DELETE_ALL_DATA_ALERT"),
            actions: [
                {
                    title: $l10n("DELETE"),
                    style: $alertActionType.destructive,
                    handler: () => {
                        kernel.storage.deleteAllData()
                        animate.done()
                        $delay(0.5, () => $addin.restart())
                    }
                },
                {
                    title: $l10n("CANCEL"),
                    handler: () => {
                        animate.cancel()
                    }
                }
            ]
        })
    }

    const recycleBinId = $text.uuid
    const getRecycleBinData = () => {
        return kernel.clips.getRecycleBin().map(i => i?.text ?? "None")
    }
    kernel.setting.method.recycleBin = () => {
        const listView = {
            type: "list",
            props: {
                id: recycleBinId,
                data: getRecycleBinData(),
                actions: [
                    {
                        title: "delete",
                        handler: (sender, indexPath) => {
                            kernel.clips.removeFromRecycleBin(indexPath.row)
                        }
                    }
                ]
            },
            events: {
                didSelect: (sender, indexPath) => {
                    const recycleBin = kernel.clips.getRecycleBin()
                    const item = recycleBin[indexPath.row] ?? {}
                    if (item.text) {
                        const clip = kernel.clips.addItem(item.text)
                        if (item.tag) {
                            kernel.storage.setTag(clip.uuid, item.tag)
                        }
                        kernel.clips.removeFromRecycleBin(indexPath.row)
                        kernel.clips.updateList(true)
                        sender.delete(indexPath)
                    }
                }
            },
            layout: $layout.fill
        }
        return listView
    }
    kernel.setting.method.recycleBinNavButtons = () => {
        return [
            {
                symbol: "trash",
                tapped: () => {
                    UIKit.deleteConfirm($l10n("DELETE_TABLE").replace("${table}", $l10n("RECYCLE_BIN")), () => {
                        kernel.clips.clearRecycleBin()
                        $(recycleBinId).data = getRecycleBinData()
                    })
                }
            }
        ]
    }
}

function action() {
    kernel.setting.method.exportAction = animate => {
        animate.start()
        // 备份动作
        const fileName = "actions.zip"
        const tempPath = `/${fileName}`
        const jsboxPath = kernel.fileStorage.filePath(tempPath)
        $archiver.zip({
            directory: kernel.actions.userActionPath,
            dest: jsboxPath,
            handler: () => {
                $share.sheet({
                    items: [
                        {
                            name: fileName,
                            data: $data({ path: jsboxPath })
                        }
                    ],
                    handler: success => {
                        if (success) {
                            animate.done()
                        } else {
                            animate.cancel()
                        }
                        kernel.fileStorage.delete(tempPath)
                    }
                })
            }
        })
    }

    kernel.setting.method.importAction = animate => {
        animate.start()
        $drive.open({
            handler: data => {
                if (data === undefined) {
                    animate.cancel()
                    return
                }
                if (data.fileName.slice(-3) === "zip") {
                    const path = `${kernel.fileStorage.basePath}/action_import`
                    $archiver.unzip({
                        file: data,
                        dest: path,
                        handler: () => {
                            $file.list(path).forEach(item => {
                                if ($file.isDirectory(`${path}/${item}`)) {
                                    $file.copy({
                                        src: `${path}/${item}`,
                                        dst: `${kernel.actions.userActionPath}/${item}`
                                    })
                                }
                            })
                            $file.delete(path)
                            animate.done()
                        }
                    })
                } else {
                    $ui.warning($l10n("FILE_TYPE_ERROR"))
                    animate.cancel()
                }
            }
        })
    }

    kernel.setting.method.importExampleAction = animate => {
        animate.start()
        kernel.actions.importExampleAction()
        animate.done()
    }

    kernel.setting.method.rebuildAction = animate => {
        animate.start()
        $ui.alert({
            title: $l10n("REBUILD_ACTION_DATABASE_ALERT_TITLE"),
            message: $l10n("REBUILD_ACTION_DATABASE_ALERT_MESSAGE"),
            actions: [
                {
                    title: $l10n("REBUILD"),
                    style: $alertActionType.destructive,
                    handler: () => {
                        $file.delete(kernel.actions.userActionPath)
                        kernel.actions.needUpload()
                        animate.done()
                        $delay(0.8, () => $addin.restart())
                    }
                },
                { title: $l10n("CANCEL"), handler: () => animate.cancel() }
            ]
        })
    }

    kernel.setting.method.editCategory = () => ActionScripts.sheet(kernel)
}

function keyboard() {
    const Keyboard = require("../ui/keyboard")
    const keyboardMaxHeight = 400
    const keyboardMinHeight = 200

    kernel.setting.method.previewKeyboard = () => {
        const keyboard = new Keyboard(kernel)

        const updateHeight = height => {
            keyboard.setKeyboardHeight(height)
            $(keyboard.keyboardId).updateLayout(make => {
                make.height.equalTo(keyboard.keyboardHeight)
            })
            if (keyboard.keyboardDisplayMode === 1) {
                $(keyboard.keyboardId).get(keyboard.views.listId).reload()
            }
        }
        const getPercentage = v => (v - keyboardMinHeight) / (keyboardMaxHeight - keyboardMinHeight)
        return {
            views: [
                {
                    type: "label",
                    layout: (make, view) => {
                        make.top.inset(20)
                        make.centerX.equalTo(view.super)
                    },
                    events: {
                        ready: sender => (sender.text = keyboard.keyboardHeight),
                        tapped: sender => {
                            $input.text({
                                type: $kbType.number,
                                text: keyboard.keyboardHeight,
                                handler: text => {
                                    const reg = /^[0-9]+$/
                                    if (reg.test(text)) {
                                        let value = Number(text)
                                        value = Math.min(value, keyboardMaxHeight)
                                        value = Math.max(value, keyboardMinHeight)

                                        sender.text = value
                                        sender.next.value = getPercentage(value)

                                        updateHeight(value)
                                    } else {
                                        $ui.toast("Only integers can be entered.")
                                    }
                                }
                            })
                        }
                    }
                },
                {
                    type: "slider",
                    props: { max: 1, min: 0 },
                    layout: (make, view) => {
                        make.top.equalTo(view.prev.bottom)
                        make.right.inset(20)
                        make.width.equalTo(view.super).offset(-40)
                    },
                    events: {
                        ready: sender => (sender.value = getPercentage(keyboard.keyboardHeight)),
                        changed: sender => {
                            const value = Math.floor(
                                sender.value * (keyboardMaxHeight - keyboardMinHeight) + keyboardMinHeight
                            )

                            sender.prev.text = value
                            updateHeight(value)
                        }
                    }
                },
                keyboard.getView()
            ],
            layout: (make, view) => {
                make.left.right.bottom.equalTo(view.super.safeArea)
                let inset = 0
                if (kernel.setting.get("mainUIDisplayMode") === 1) {
                    inset = UIKit.NavigationBarNormalHeight
                }
                make.top.equalTo(view.super.safeArea).inset(inset)
            }
        }
    }

    kernel.setting.method.setKeyboardQuickStart = () => {
        const addins = new KeyboardAddins()
        addins.sheet()
    }

    kernel.setting.method.keyboardPinAction = () => {
        KeyboardPinActions.shared.setKernel(kernel).sheet()
    }
}

function todayWidget() {
    kernel.setting.method.previewTodayWidget = animate => {
        const Today = require("../ui/today")
        const today = new Today(kernel).getView()
        UIKit.push({
            views: [today]
        })
    }

    kernel.setting.method.setTodayWidgetActions = animate => {
        TodayPinActions.shared.setKernel(kernel).sheet()
    }
}

/**
 * 注入设置中的脚本类型方法
 * @param {AppKernel} kernel
 */
function settingMethods(appKernel) {
    kernel = appKernel

    kernel.setting.method.checkUpdate = async animate => {
        animate.start()

        const easyJsboxPath = "scripts/libs/easy-jsbox.js"
        if ($file.exists(easyJsboxPath)) {
            try {
                const res = await kernel.checkUpdate()
                if (res) {
                    $file.write({
                        data: $data({ string: res }),
                        path: easyJsboxPath
                    })
                    $ui.toast("The framework has been updated.")
                }
            } catch {}
        }

        const resp = await $http.get({
            url: "https://raw.githubusercontent.com/ipuppet/CAIO/master/config.json"
        })
        const version = resp.data?.info.version
        let info
        try {
            info = __INFO__
        } catch {
            info = JSON.parse($file.read("config.json").string).info
        }
        if (Kernel.versionCompare(version, info.version) > 0) {
            $ui.alert({
                title: "New Version",
                message: `New version found: ${version}\nUpdate via Github or click the button to open Erots.`,
                actions: [
                    { title: $l10n("CANCEL") },
                    {
                        title: "Erots",
                        handler: () => {
                            $addin.run({
                                name: "Erots",
                                query: {
                                    q: "show",
                                    objectId: "603e6eaaca0dd64fcef93e2d"
                                }
                            })
                        }
                    }
                ]
            })
        } else {
            $ui.toast("No need to update")
        }
        animate.done()
    }

    kernel.setting.method.previewWidget = () => {
        const widgets = {}
        try {
            JSON.parse($file.read("widget-options.json").string).forEach(item => {
                widgets[item.name] = item.value
            })
        } catch (error) {
            $ui.error(error)
            return
        }
        $ui.menu({
            items: Object.keys(widgets),
            handler: name => {
                const { Widget } = require("../widget")
                Widget.render(widgets[name])
            }
        })
    }

    kernel.setting.method.fileManager = () => {
        kernel.fileManager.push(kernel.fileStorage.basePath)
    }

    clips()

    action()

    keyboard()

    todayWidget()
}

module.exports = settingMethods
