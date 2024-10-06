class MyAction extends Action {
    getView() {
        const color = {
            background: {
                normal: $color("#E7F2FF", "#E7F2FF"),
                highlight: $color("##074FF", "#BBDAFF")
            },
            text: {
                normal: $color("##074FF", "##074FF"),
                highlight: $color("#FFFFFF", "#ADADAD")
            }
        }
        const fontSize = 16
        const edges = 10
        return {
            type: "matrix",
            layout: $layout.fill,
            props: {
                spacing: edges,
                data: this.results.map(item => ({ label: { text: item } })),
                template: {
                    views: [{
                        type: "label",
                        props: {
                            id: "label",
                            align: $align.center,
                            cornerRadius: edges,
                            bgcolor: color.background.normal,
                            font: $font(fontSize),
                            textColor: color.text.normal
                        },
                        layout: $layout.fill
                    }]
                }
            },
            events: {
                highlighted: () => { },
                itemSize: (sender, indexPath) => {
                    const width = fontSize * this.results[indexPath.item].length + 1
                    if (this.maxtrixItemHeight === undefined)
                        this.maxtrixItemHeight = fontSize + edges * 2
                    return $size(width + edges * 2, this.maxtrixItemHeight)
                },
                didSelect: (sender, indexPath) => {
                    const index = this.selected.indexOf(indexPath.item)
                    const label = sender.cell(indexPath).get("label")
                    if (index === -1) {
                        this.selected.push(indexPath.item)
                        label.bgcolor = color.background.highlight
                        label.textColor = color.text.highlight
                    } else {
                        this.selected.splice(index, 1)
                        label.bgcolor = color.background.normal
                        label.textColor = color.text.normal
                    }
                }
            }
        }
    }
    /**
     * 系统会调用 do() 方法
     */
    do() {
        this.selected = []
        this.results = []
        $text.tokenize({
            text: this.selectedText ?? this.text,
            handler: results => {
                this.results = results
                this.pageSheet({
                    view: this.getView(),
                    done: () => {
                        const result = []
                        this.selected.sort().forEach(i => {
                            result.push(this.results[i])
                        })
                        if (result.length > 0) {
                            const text = result.join("")
                            $clipboard.text = text
                            $ui.alert({
                                title: "完成",
                                message: `已复制内容：${text}`
                            })
                        }
                    }
                })
            }
        })
    }
}
