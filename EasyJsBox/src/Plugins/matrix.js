const VERSION = "1.0.0"

class Matrix {
    constructor() {
        this.indexFlag = 1
        this.height = 90
        this.spacing = 15
        this.columns = 2
        this.id = "Matrix"
        this.contentViewId = this.id + "Content"
    }

    getWidth() {
        this.width = $device.info.screen.width / this.columns
        this.width = this.width - this.spacing * (this.columns + 1) / this.columns
        return this.width
    }

    cardTemplate(views, events) {
        return {
            type: "view",
            props: {
                bgcolor: $color("tertiarySurface"),
                cornerRadius: 10
            },
            layout: (make, view) => {
                make.width.equalTo(view.super.width)
                    .multipliedBy(1 / this.columns)
                    // this.spacing / this.columns 是应为最后一个块右侧边距为0，需要所有块均摊最后一个块右侧边距
                    .offset(-this.spacing - this.spacing / this.columns)
                make.height.equalTo(this.height)
                // 边距控制
                if (this.indexFlag === 1) {
                    make.left.inset(this.spacing)
                    if (!view.prev) {
                        make.top.equalTo(view.super).offset(this.spacing)
                    } else {
                        make.top.equalTo(view.prev).offset(this.height + this.spacing)
                    }
                } else {
                    make.left.equalTo(view.prev.right).offset(this.spacing)
                    make.top.equalTo(view.prev)
                }
                this.indexFlag === this.columns ? this.indexFlag = 1 : this.indexFlag++
            },
            views: views,
            events: events
        }
    }

    scrollTemplate(data, bottomOffset = this.spacing) {
        // 计算尺寸
        const line = Math.ceil(data.length / this.columns)
        const height = line * (this.height + this.spacing) + bottomOffset
        return {
            type: "scroll",
            props: {
                id: this.id,
                bgcolor: $color("insetGroupedBackground"),
                scrollEnabled: true,
                indicatorInsets: $insets(this.spacing, 0, 50, 0),
                contentSize: $size(0, height)
            },
            layout: (make, view) => {
                make.left.right.equalTo(view.super.safeArea)
                make.bottom.inset(0)
                view.prev ? make.top.equalTo(view.prev).offset(50) : make.top.inset(0)
            },
            events: {
                layoutSubviews: () => {
                    const addView = () => {
                        // 重置变量
                        this.indexFlag = 1
                        // 插入视图
                        if ($(this.contentViewId)) $(this.contentViewId).remove()
                        $(this.id).add({
                            type: "view",
                            props: { id: this.contentViewId },
                            views: data,
                            layout: (make, view) => {
                                make.size.equalTo(view.super)
                            }
                        })
                    }
                    if (!this.orientation) {
                        this.orientation = $device.info.screen.orientation
                        addView()
                        return
                    }
                    if (this.orientation !== $device.info.screen.orientation) {
                        this.orientation = $device.info.screen.orientation
                        addView()
                    }
                }
            }
        }
    }
}

module.exports = {
    VERSION: VERSION,
    Plugin: Matrix
}