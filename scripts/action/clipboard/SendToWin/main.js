/**
 * @typedef {import("../../action").Action} Action
 */
class MyAction extends Action {
    async getIp(refresh = false) {
        let address = $cache.get("caio.action.clipsync.address")
        if (refresh || !address) {
            address = await $input.text({
                placeholder: "Address",
                text: $cache.get("caio.action.clipsync.address")
            })
        }

        $cache.set("caio.action.clipsync.address", address)

        if (!address.startsWith("http")) {
            address = "http://" + address
        }

        return address
    }

    async do() {
        let address = await this.getIp()

        $ui.toast("Loading...", 5)
        try {
            const resp = await this.request(address + "/api/clip", "POST", {
                content: $clipboard.text
            })
            if (resp.data.status) {
                $ui.success("success")
            }
        } catch (error) {
            $ui.clearToast()
            $ui.alert({
                title: "Error",
                message: String(error),
                actions: [
                    { title: "OK" },
                    {
                        title: "Reset Adress",
                        handler: () => this.getIp(true)
                    }
                ]
            })
        }
    }
}
