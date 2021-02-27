class Album {
    constructor(kernel, setting) {
        this.kernel = kernel
        this.setting = setting
        this.albumPath = `${this.kernel.widgetAssetsPath}/${this.setting.widget}/pictures`
        this.imageMaxSize = 50 // kb
        this.mode = 0 // 0: 正常模式  1: 多选模式
        this.selected = {}
        if (!$file.exists(this.albumPath)) {
            $file.mkdir(this.albumPath)
        }
        if (!$file.exists(`${this.albumPath}/archive`)) {
            $file.mkdir(`${this.albumPath}/archive`)
        }
    }

    /**
     * 获取除去archive目录的所有图片
     * @param {Boolean} isCompress 是否是archive(用于存放压缩后的图片)目录下的图片
     */
    getImages(isCompress) {
        if (isCompress) return $file.list(`${this.albumPath}/archive`)
        const list = $file.list(this.albumPath)
        for (let i = 0; i < list.length; i++) {
            if ($file.isDirectory(`${this.albumPath}/${list[i]}`)) {
                list.splice(i, 1)
                return list
            }
        }
        return list
    }

    deleteImage(src, indexPath) {
        $file.delete(src)
        // 同时删除压缩过的文件
        const name = src.slice(src.lastIndexOf("/"))
        $file.delete(`${this.albumPath}/archive/${name}`)
        if (indexPath) {
            const sender = $("picture-edit-matrix")
            sender.delete(indexPath)
            // 检查是否已经为空，为空则显示提示字样
            if (sender.data.length === 0) {
                $("no-image-text").hidden = false
                sender.hidden = true
            }
        }
    }

    normalMode(indexPath, data) {
        $ui.menu({
            items: [$l10n("SAVE_TO_SYSTEM_ALBUM"), $l10n("DELETE")],
            handler: (title, idx) => {
                if (idx === 0) {
                    $photo.save({
                        data: $file.read(data.image.src),
                        handler: success => {
                            if (success)
                                $ui.success($l10n("SUCCESS"))
                            else
                                $ui.error($l10n("ERROR"))
                        }
                    })
                } else if (idx === 1) {
                    let style = {}
                    if ($alertActionType) {
                        style = { style: $alertActionType.destructive }
                    }
                    $ui.alert({
                        title: $l10n("CONFIRM_DELETE_MSG"),
                        actions: [
                            Object.assign({
                                title: $l10n("DELETE"),
                                handler: () => {
                                    this.deleteImage(data.image.src, indexPath)
                                }
                            }, style),
                            { title: $l10n("CANCEL") }
                        ]
                    })
                }
            }
        })
    }

    multipleSelectionMode(sender, indexPath, data) {
        if (this.selected[data.image.src]) {
            sender.cell(indexPath).alpha = 1
            delete this.selected[data.image.src]
        } else {
            sender.cell(indexPath).alpha = 0.2
            this.selected[data.image.src] = {
                indexPath: indexPath,
                data: data
            }
        }
    }

    changemode() {
        const matrix = $("picture-edit-matrix")
        const button = $("album-multiple-selection-mode")
        switch (this.mode) {
            case 0: // 多选模式，显示删除按钮
                if (matrix.data.length === 0) {
                    $ui.toast($l10n("NO_IMAGES"))
                    break
                }
                button.symbol = "square.fill.on.square.fill"
                this.mode = 1
                $("album-multiple-selection-mode-delete").hidden = false
                break
            case 1: // 隐藏删除按钮
                button.symbol = "square.on.square"
                this.mode = 0
                $("album-multiple-selection-mode-delete").hidden = true
                // 恢复选中的选项
                try {
                    Object.values(this.selected).forEach(item => {
                        matrix.cell(item.indexPath).alpha = 1
                    })
                } catch (error) { }
                break
        }
        // 清空数据
        this.selected = {}
    }

    getAlbumButtons() {
        return [
            this.kernel.UIKit.navButton("album-add-image", "plus", (start, done, cancel) => { // 添加新图片
                $ui.menu({
                    items: [$l10n("SYSTEM_ALBUM"), "iCloud"],
                    handler: (title, idx) => {
                        const saveImageAction = data => {
                            const fileName = new Date().getTime() + data.fileName.slice(data.fileName.lastIndexOf("."))
                            $file.write({
                                data: data,
                                path: `${this.albumPath}/${fileName}`
                            })
                            // 同时保留一份压缩后的图片
                            // TODO 控制压缩图片大小
                            const image = data.image.jpg(this.imageMaxSize * 1024 / data.info.size)
                            $file.write({
                                data: image,
                                path: `${this.albumPath}/archive/${fileName}`
                            })
                            // UI隐藏无图片提示字符
                            if (!$("no-image-text").hidden)
                                $("no-image-text").hidden = true
                            // UI插入图片
                            const matrix = $("picture-edit-matrix")
                            matrix.hidden = false
                            matrix.insert({
                                indexPath: $indexPath(0, matrix.data.length),
                                value: {
                                    image: { src: `${this.albumPath}/${fileName}` }
                                }
                            })
                        }
                        start()
                        if (idx === 0) { // 从系统相册选取图片
                            $photo.pick({
                                format: "data",
                                multi: true,
                                handler: resp => {
                                    if (!resp.status && resp.error.description !== "canceled") {
                                        $ui.error($l10n("ERROR"))
                                        return
                                    }
                                    if (!resp.results) {
                                        cancel()
                                        return
                                    }
                                    resp.results.forEach(image => {
                                        saveImageAction(image.data)
                                    })
                                    $ui.toast($l10n("SUCCESS"))
                                    done()
                                }
                            })
                        } else if (idx === 1) { // 从iCloud选取图片
                            $drive.open({
                                handler: file => {
                                    if (!file) {
                                        cancel()
                                        return
                                    }
                                    saveImageAction(file)
                                    $ui.toast($l10n("SUCCESS"))
                                    done()
                                }
                            })
                        }
                    }
                })
            }),
            { // 多选
                type: "button",
                props: {
                    id: "album-multiple-selection-mode",
                    symbol: "square.on.square",
                    tintColor: this.kernel.page.view.textColor,
                    bgcolor: $color("clear")
                },
                layout: (make, view) => {
                    make.right.equalTo(view.prev.left).offset(-10)
                    make.size.equalTo(view.prev)
                },
                events: {
                    tapped: () => {
                        this.changemode()
                    }
                }
            },
            this.kernel.page.view.navButton("album-multiple-selection-mode-delete", "trash", (start, done, cancel) => {
                let length = Object.keys(this.selected).length
                if (this.mode === 1 && length > 0) {
                    let style = {}
                    if ($alertActionType) {
                        style = { style: $alertActionType.destructive }
                    }
                    start()
                    $ui.alert({
                        title: $l10n("CONFIRM_DELETE_MSG"),
                        actions: [
                            Object.assign({
                                title: $l10n("DELETE"),
                                handler: () => {
                                    for (let i = $("picture-edit-matrix").data.length - 1; i >= 0; i--) {
                                        if (length === 0) break
                                        Object.values(this.selected).forEach(item => {
                                            if (i === item.indexPath.item) {
                                                this.deleteImage(item.data.image.src, item.indexPath)
                                                length--
                                            }
                                        })
                                    }
                                    done()
                                }
                            }, style),
                            {
                                title: $l10n("CANCEL"),
                                handler: () => { cancel() }
                            }
                        ]
                    })
                }
            }, true)
        ]
    }

    getAlbumView() {
        const pictures = this.getImages()
        const data = []
        if (pictures.length > 0) {
            pictures.forEach(picture => {
                data.push({
                    image: { src: `${this.albumPath}/${picture}` }
                })
            })
        }
        return [
            { // 无图片提示字符
                type: "label",
                layout: $layout.fill,
                props: {
                    id: "no-image-text",
                    hidden: pictures.length > 0 ? true : false,
                    text: $l10n("NO_IMAGES"),
                    color: $color("secondaryText"),
                    align: $align.center
                }
            },
            { // 图片列表
                type: "matrix",
                props: {
                    id: "picture-edit-matrix",
                    hidden: pictures.length > 0 ? false : true,
                    columns: this.setting.get("columns"),
                    square: true,
                    data: data,
                    template: {
                        props: {},
                        views: [
                            {
                                type: "image",
                                props: {
                                    id: "image"
                                },
                                layout: make => {
                                    make.size.equalTo($device.info.screen.width / this.setting.get("columns"))
                                }
                            }
                        ]
                    }
                },
                events: {
                    didSelect: (sender, indexPath, data) => {
                        switch (this.mode) {
                            case 0:
                                this.normalMode(indexPath, data)
                                break
                            case 1:
                                this.multipleSelectionMode(sender, indexPath, data)
                                break
                        }
                    }
                },
                layout: $layout.fill
            }]
    }
}

module.exports = Album