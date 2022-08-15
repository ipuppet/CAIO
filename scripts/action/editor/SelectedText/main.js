class MyAction extends Action {
    do() {
        const selectedText = this.selectedText
        $ui.alert(selectedText)
    }
}
