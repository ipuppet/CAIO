const Action = require("../../action.js")

class MyAction extends Action {
    /**
     * 系统会调用 do() 方法
     */
    do() {
        this.selected = []
        this.results = []
        $text.tokenize({
            text: this.text,
            handler: results => {
                this.results = results
                this.push({
                    views: [{
                        type: "view",
                        layout: make => {
                            make.top.inset(10)
                            make.bottom.right.left.inset(0)
                        },
                        views: results.map((item, index) => {
                            return {
                                type: "view",
                                props: {
                                    bgcolor: $color("#E7F2FF"),
                                    cornerRadius: 5,
                                    smoothCorners: true,
                                    id: index
                                },
                                layout: (make, view) => {
                                    if (view.prev) {
                                        make.left.equalTo(view.prev.right).offset(10)
                                    } else {
                                        make.left.inset(10)
                                    }
                                },
                                views: [{
                                    type: "label",
                                    props: {
                                        text: item,
                                        color: $color("##074FF")
                                    },
                                    layout: make => {
                                        make.edges.inset(5)
                                    }
                                }],
                                events: {
                                    tapped: sender => {
                                        const index = this.selected.indexOf(sender.id)
                                        if (index === -1) {
                                            this.selected.push(sender.id)
                                            sender.bgcolor = $color("#BBDAFF")
                                        } else {
                                            this.selected.splice(index, 1)
                                            sender.bgcolor = $color("#E7F2FF")
                                        }
                                    }
                                }
                            }
                        })
                    }],
                    done: () => {
                        const result = []
                        this.selected.sort().forEach(i => {
                            result.push(this.results[i])
                        })
                        const text = result.join("")
                        $clipboard.text = text
                        $ui.alert({
                            title: "完成",
                            message: `已复制内容：${text}`
                        })
                    }
                })
            }
        })
    }
}

module.exports = MyAction