const Widget = require("../widget")
const PictureSetting = require("./setting")

class PictureWidget extends Widget {
    constructor(kernel) {
        super(kernel, new PictureSetting(kernel))
        this.albumPath = this.setting.album.albumPath
        this.imageSwitchMethod = this.setting.get("imageSwitchMethod")
        this.switchInterval = 1000 * 60 * Number(this.setting.get("switchInterval"))
        this.useCompressedImage = this.setting.get("useCompressedImage")
        this.urlScheme = `jsbox://run?name=${this.kernel.name}&url-scheme=${this.setting.get("urlScheme")}`
        this.pictures = this.setting.album.getImages()
        // 缓存
        this.data = $cache.get("switch.data")
        if (!this.data) { // 首次写入缓存
            this.data = {
                date: new Date().getTime(),
                index: this.imageSwitchMethod === 0 ? this.randomNum(0, this.pictures.length - 1) : 0
            }
            $cache.set("switch.data", this.data)
        }
    }

    randomNum(min, max) {
        switch (arguments.length) {
            case 1:
                return parseInt(Math.random() * min + 1, 10)
            case 2:
                return parseInt(Math.random() * (max - min + 1) + min, 10)
            default:
                return 0
        }
    }

    view2x2(family) {
        let index = 0 // 图片索引
        if (new Date().getTime() - this.data.date > this.switchInterval) { // 下一张
            if (this.imageSwitchMethod === 0) { // 0随机切换，1顺序切换
                index = this.randomNum(0, this.pictures.length - 1)
            } else {
                index = this.data.index + 1
                if (index > this.pictures.length - 1) index = 0
            }
            $cache.set("switch.data", {
                date: new Date().getTime(),
                index: index
            })
        } else { // 维持不变
            index = this.data.index
        }
        let imagePath // 获取图片
        if (this.useCompressedImage) { // 检查是否使用压缩后的图片
            imagePath = `${this.albumPath}/archive/${this.pictures[index]}`
        } else {
            imagePath = `${this.albumPath}/${this.pictures[index]}`
        }
        let view
        if (!$file.exists(imagePath)) {
            view = {
                type: "text",
                props: {
                    widgetURL: this.setting.settingUrlScheme,
                    text: `${$l10n("NO_IMAGE")}:\n${imagePath}`
                }
            }
        } else {
            view = {
                type: "image",
                props: Object.assign({
                    image: $image(imagePath),
                    resizable: true,
                    scaledToFill: true,
                    frame: {
                        maxWidth: Infinity,
                        maxHeight: Infinity
                    }
                }, family !== this.setting.family.small ? {
                    link: this.urlScheme ? this.urlScheme : this.setting.settingUrlScheme
                } : {
                        widgetURL: this.urlScheme ? this.urlScheme : this.setting.settingUrlScheme
                    })
            }
        }
        return view
    }

    render() {
        const expireDate = new Date(this.data.date + this.switchInterval)
        $widget.setTimeline({
            entries: [
                {
                    date: new Date(),
                    info: {}
                }
            ],
            policy: {
                afterDate: expireDate
            },
            render: ctx => {
                let view = this.view2x2(ctx.family)
                this.printTimeConsuming()
                return view
            }
        })
    }
}

module.exports = {
    Widget: PictureWidget
}