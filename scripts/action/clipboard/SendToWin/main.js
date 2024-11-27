/**
 * @typedef {import("../../action").Action} Action
 */
class MyAction extends Action {
    key = $cache.get("caio.action.clipsync.key")
    iv = $cache.get("caio.action.clipsync.iv")
    address = $cache.get("caio.action.clipsync.address")

    async getInfo(refresh = false) {
        if (refresh || !this.address || !this.key || !this.iv) {
            const result = await this.input([
                {
                    key: "key",
                    value: this.key,
                    placeholder: "key"
                },
                {
                    key: "iv",
                    value: this.iv,
                    placeholder: "iv"
                },
                {
                    key: "address",
                    value: this.address,
                    placeholder: "Address"
                }
            ])
            this.key = result.key
            this.iv = result.iv
            this.address = result.address

            $cache.set("caio.action.clipsync.key", this.key)
            $cache.set("caio.action.clipsync.iv", this.iv)
            $cache.set("caio.action.clipsync.address", this.address)
        }

        if (!this.address.startsWith("http")) {
            this.address = "http://" + this.address
        }
    }

    async do() {
        await this.getInfo()

        $ui.toast("Loading...", 5)
        try {
            const aes = this.aes(this.key, this.iv)
            const data = this.selectedText ?? this.text ?? ""
            const resp = await this.request(this.address + "/api/clip", "POST", {
                data: aes.encrypt(data)
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
                        handler: () => this.getInfo(true)
                    }
                ]
            })
        }
    }
}
