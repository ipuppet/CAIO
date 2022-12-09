class MyAction extends Action {
    do() {
        const data = this.getAllClips()
        if (data.clips.length > 0 || data.favorite.length > 0) {
            $share.sheet(JSON.stringify(data, null, 2))
        } else {
            $ui.alert("无数据")
        }
    }
}
