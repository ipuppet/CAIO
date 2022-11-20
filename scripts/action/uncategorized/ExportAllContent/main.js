class MyAction extends Action {
    do() {
        const data = this.getAllClipboard()
        if (data.clipboard.length > 0 || data.pin.length > 0) {
            $share.sheet(JSON.stringify(data, null, 2))
        } else {
            $ui.alert("无数据")
        }
    }
}
