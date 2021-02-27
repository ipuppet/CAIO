const Widget = require("../widget")
const JoinSetting = require("./setting")

class JoinWidget extends Widget {
    constructor(kernel) {
        super(kernel, new JoinSetting(kernel))
        this.spacing = this.setting.get("spacing")
        // 左侧视图设置
        this.left = this.setting.get("left")
        this.leftJoinMode = this.setting.get("left.joinMode")
        if (typeof this.left === "object") this.left = this.left[1]
        else this.left = this.setting.menu[this.left]
        // 右侧视图设置
        this.right = this.setting.get("right")
        this.rightJoinMode = this.setting.get("right.joinMode")
        if (typeof this.right === "object") this.right = this.right[1]
        else this.right = this.setting.menu[this.right]
    }

    /**
     * 不使用缓存
     */
    refreshCache() { }

    async view2x4() {
        const leftWidget = this.kernel.widgetInstance(this.left)
        const rightWidget = this.kernel.widgetInstance(this.right)
        const leftView = await leftWidget.joinView(this.leftJoinMode)
        const rightView = await rightWidget.joinView(this.rightJoinMode)
        $widget.family = this.setting.family.medium
        const width = $widget.displaySize.width / 2 - this.spacing / 2
        const height = $widget.displaySize.height
        // 调节宽度并裁剪多余部分
        if (!leftView.props.frame) leftView.props.frame = {}
        leftView.props.frame["maxWidth"] = width
        leftView.props["clipped"] = true
        if (!rightView.props.frame) rightView.props.frame = {}
        rightView.props.frame["maxWidth"] = width
        rightView.props["clipped"] = true
        return {
            type: "hstack",
            props: {
                spacing: this.spacing,
                frame: {
                    maxWidth: Infinity,
                    height: height
                }
            },
            views: [leftView, rightView]
        }
    }

    async render() {
        const switchInterval = 1000 * 60 * this.switchInterval
        const expireDate = new Date(new Date() + switchInterval)
        const view2x4 = await this.view2x4()
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
                this.printTimeConsuming()
                switch (ctx.family) {
                    case 0:
                        return {
                            type: "text",
                            props: { text: $l10n("NO_SMALL_VIEW") }
                        }
                    case 1:
                        return view2x4
                    /* case 2:
                        return this.view4x4() */
                    default:
                        return {
                            type: "text",
                            props: { text: "在未来可能会提供该视图" }
                        }
                }
            }
        })
    }
}

module.exports = {
    Widget: JoinWidget
}