const { Kernel, UIKit } = require("./libs/easy-jsbox")

const KeyboardScripts = require("./ui/components/keyboard-scripts")
const TodayActions = require("./ui/components/today-actions")

/**
 * @typedef {import("./app").AppKernel} AppKernel
 */

/**
 * @type {AppKernel}
 */
let kernel

function clips() {
    kernel.setting.method.exportClipboard = animate => {
        animate.actionStart()
        kernel.storage.export(success => {
            if (success) {
                animate.actionDone()
            } else {
                animate.actionCancel()
            }
        })
    }

    kernel.setting.method.importClipboard = animate => {
        animate.actionStart()
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
                                    animate.actionCancel()
                                    return
                                }
                                if (data.fileName.slice(-2) === "db" || data.fileName.slice(-3) === "zip") {
                                    kernel.storage
                                        .import(data)
                                        .then(() => {
                                            animate.actionDone()
                                            $delay(0.3, () => {
                                                $addin.restart()
                                            })
                                        })
                                        .catch(error => {
                                            $ui.error(error)
                                            kernel.print(error)
                                            animate.actionCancel()
                                        })
                                } else {
                                    $ui.warning($l10n("FILE_TYPE_ERROR"))
                                    animate.actionCancel()
                                }
                            }
                        })
                    }
                },
                {
                    title: $l10n("CANCEL"),
                    handler: () => animate.actionCancel()
                }
            ]
        })
    }

    kernel.setting.method.rebuildDatabase = animate => {
        animate.actionStart()
        const rebuildDatabase = () => {
            try {
                kernel.storage.rebuild()
                animate.actionDone()
                $delay(0.8, () => $addin.restart())
            } catch (error) {
                animate.actionCancel()
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
                        animate.actionCancel()
                    }
                }
            ]
        })
    }

    kernel.setting.method.deleteAllData = animate => {
        animate.actionStart()
        $ui.alert({
            title: $l10n("DELETE_ALL_DATA_ALERT"),
            actions: [
                {
                    title: $l10n("DELETE"),
                    style: $alertActionType.destructive,
                    handler: () => {
                        kernel.storage.deleteAllData()
                        animate.actionDone()
                        $delay(0.5, () => $addin.restart())
                    }
                },
                {
                    title: $l10n("CANCEL"),
                    handler: () => {
                        animate.actionCancel()
                    }
                }
            ]
        })
    }
}

function action() {
    kernel.setting.method.exportAction = animate => {
        animate.actionStart()
        // 备份动作
        const fileName = "actions.zip"
        const tempPath = `/${fileName}`
        const jsboxPath = kernel.fileStorage.filePath(tempPath)
        $archiver.zip({
            directory: kernel.actionManager.userActionPath,
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
                            animate.actionDone()
                        } else {
                            animate.actionCancel()
                        }
                        kernel.fileStorage.delete(tempPath)
                    }
                })
            }
        })
    }

    kernel.setting.method.importAction = animate => {
        animate.actionStart()
        $drive.open({
            handler: data => {
                if (data === undefined) {
                    animate.actionCancel()
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
                                        dst: `${kernel.actionManager.userActionPath}/${item}`
                                    })
                                }
                            })
                            $file.delete(path)
                            animate.actionDone()
                        }
                    })
                } else {
                    $ui.warning($l10n("FILE_TYPE_ERROR"))
                    animate.actionCancel()
                }
            }
        })
    }

    kernel.setting.method.importExampleAction = animate => {
        animate.actionStart()
        kernel.actionManager.importExampleAction()
        animate.actionDone()
    }

    kernel.setting.method.rebuildAction = animate => {
        animate.actionStart()
        $ui.alert({
            title: $l10n("REBUILD_ACTION_DATABASE_ALERT_TITLE"),
            message: $l10n("REBUILD_ACTION_DATABASE_ALERT_MESSAGE"),
            actions: [
                {
                    title: $l10n("REBUILD"),
                    style: $alertActionType.destructive,
                    handler: () => {
                        $file.delete(kernel.actionManager.userActionPath)
                        $file.delete(kernel.actionManager.iCloudPath)
                        animate.actionDone()
                        $delay(0.8, () => $addin.restart())
                    }
                },
                { title: $l10n("CANCEL"), handler: () => animate.actionCancel() }
            ]
        })
    }
}

function keyboard() {
    const Keyboard = require("./ui/keyboard")
    const keyboardMaxHeight = 400
    const keyboardMinHeight = 200

    kernel.setting.method.previewKeyboard = () => {
        const keyboard = new Keyboard(kernel)

        const keyboardId = $text.uuid
        const updateHeight = height => {
            $(keyboardId).updateLayout(make => {
                make.height.equalTo(height)
            })
            keyboard.keyboardHeight = height
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
                {
                    type: "view",
                    props: { id: keyboardId },
                    views: [keyboard.getView()],
                    layout: (make, view) => {
                        make.width.equalTo(view.super)
                        make.height.equalTo(keyboard.keyboardHeight)
                        make.bottom.inset(0)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    kernel.setting.method.setKeyboardQuickStart = () => KeyboardScripts.sheet()
}

function todayWidget() {
    kernel.setting.method.previewTodayWidget = animate => {
        animate.touchHighlightStart()
        const Today = require("./ui/today")
        const today = new Today(kernel).getView()
        UIKit.push({
            views: [today],
            disappeared: () => animate.touchHighlightEnd()
        })
    }

    kernel.setting.method.setTodayWidgetActions = animate => {
        TodayActions.sheet(kernel)
    }
}

/**
 * 注入设置中的脚本类型方法
 * @param {AppKernel} kernel
 */
function settingMethods(appKernel) {
    kernel = appKernel

    kernel.setting.method.checkUpdate = async animate => {
        animate.actionStart()

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

        $http.get({
            url: "https://raw.githubusercontent.com/ipuppet/CAIO/master/config.json",
            handler: resp => {
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
                animate.actionDone()
            }
        })
    }

    kernel.setting.method.previewWidget = animate => {
        const { Widget } = require("./app")
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
                Widget.render(widgets[name])
            }
        })
    }

    kernel.setting.method.fileManager = () => {
        kernel.fileManager.push("storage")
    }

    clips()

    action()

    keyboard()

    todayWidget()
}

module.exports = settingMethods
