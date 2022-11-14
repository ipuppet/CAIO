class MyAction extends Action {
    do() {
        if (this.selectedRange.length > 0) {
            const selectedText = this.text
            $ui.alert(selectedText)
        }
    }
}
