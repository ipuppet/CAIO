function HtmlTemplate(html) {
    return `
<html>
<head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body>
${html}
</body>
</html>
`
}

class MyAction extends Action {
    do() {
        $ui.menu({
            items: ["忽略大小写", "大小写敏感", "正则表达式"],
            handler: async (title, idx) => {
                const patternText = await $input.text({
                    placeholder: "查找内容"
                })
                const replaceString = await $input.text({
                    placeholder: "替换内容"
                })
                let pattern = undefined
                if (idx === 0) {
                    pattern = new RegExp(`(${patternText})+`, "gi")
                } else if (idx === 1) {
                    pattern = new RegExp(`(${patternText})+`, "g")
                } else if (idx === 2) {
                    pattern = new RegExp(patternText, "g")
                }

                const matchResultPreview = this.text.replaceAll(pattern, `<font color=red>${replaceString}</font>`)
                const matchResult = this.text.replaceAll(pattern, replaceString)
                this.pageSheet({
                    title: "替换预览",
                    doneText: "替换",
                    view: {
                        type: "web",
                        props: {
                            html: HtmlTemplate(matchResultPreview)
                        },
                        layout: $layout.fill
                    },
                    done: () => {
                        this.setContent(matchResult)
                    }
                })
            }
        })
        // this.setContent("Hello world!")
    }
}
