class MyAction extends Action {
    do() {
        const data = this.getAllContent().join("\n")
        if (data) $share.sheet(data)
        else $ui.alert("无数据")
    }
}
