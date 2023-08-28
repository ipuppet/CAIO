/**
 * @typedef {import("../app-main").AppKernel} AppKernel
 * @typedef {SecureFunction} SecureFunction
 * @typedef {SecureScript} SecureScript
 */

class SecureFunctionBase {
    /**
     * @type {AppKernel}
     */
    #kernel
    #config

    notAllowed = `"The parameter or method is not allowed in Action."`

    constructor(kernel, config) {
        this.#kernel = kernel
        this.#config = JSON.parse(JSON.stringify(config))
        if (!this.#config?.name || this.#config?.name === "undefined") {
            throw new Error("Cannot get Action name.")
        }
    }

    get name() {
        return this.#config.name
    }
    set name(name) {
        const message = $l10n("ACTION_RESET_NAME_WARNING")
            .replaceAll("${name}", this.name)
            .replaceAll("${to_name}", name)
        $ui.alert({
            title: $l10n("ACTION_SAFETY_WARNING"),
            message
        })
        throw new Error(message)
    }

    info(parameter) {
        this.#kernel.logger.info(parameter)
    }
    error(parameter) {
        this.#kernel.logger.error(parameter)
    }
}

class SecureFile extends SecureFunctionBase {
    rootPath = this.notAllowed
    extensions = this.notAllowed

    read() {
        throw new Error(this.notAllowed)
    }
    async download() {
        throw new Error(this.notAllowed)
    }
    write() {
        throw new Error(this.notAllowed)
    }
    delete() {
        throw new Error(this.notAllowed)
    }
    list() {
        throw new Error(this.notAllowed)
    }
    copy() {
        throw new Error(this.notAllowed)
    }
    move() {
        throw new Error(this.notAllowed)
    }
    mkdir() {
        throw new Error(this.notAllowed)
    }
    exists() {
        throw new Error(this.notAllowed)
    }
    isDirectory() {
        throw new Error(this.notAllowed)
    }
    merge() {
        throw new Error(this.notAllowed)
    }
    absolutePath() {
        throw new Error(this.notAllowed)
    }
}

class SecureHttp extends SecureFunctionBase {
    #permissionCacheKey = "ActionHttpPermission"

    get #permissions() {
        const permissions = $cache.get(this.#permissionCacheKey)
        if (!permissions) {
            this.#permissions = {}
            return {}
        }
        return permissions
    }
    set #permissions(permissions = {}) {
        return $cache.set(this.#permissionCacheKey, permissions)
    }

    async #requestPermission() {
        const res = await $ui.alert({
            title: $l10n("ACTION_PERMISSION_REQUEST"),
            message: $l10n("ACTION_NETWORK_PERMISSION_MESSAGE").replaceAll("${name}", this.name),
            actions: [
                {
                    title: $l10n("OK"),
                    style: $alertActionType.destructive
                },
                { title: $l10n("CANCEL") }
            ]
        })

        if (res.index === 0) {
            const permissions = this.#permissions
            permissions[this.name] = true
            this.#permissions = permissions
            return true
        }
        return false
    }
    async #checkPermission() {
        const permissions = this.#permissions
        if (typeof permissions[this.name] === "boolean") {
            return permissions[this.name]
        }
        if (await this.#requestPermission()) {
            return true
        }
        return false
    }

    async request(request = {}) {
        try {
            if (!(await this.#checkPermission())) {
                throw new Error("No network permission.")
            }
            this.info(`sending request [${request.method}]: ${request.url}`)
            const resp = await $http.request(Object.assign({ timeout: 3 }, request))

            if (typeof request?.handler === "function") {
                request?.handler(resp)
            }

            if (resp.error) {
                throw resp.error
            } else if (resp?.response?.statusCode >= 400) {
                let errMsg = resp.data
                if (typeof errMsg === "object") {
                    errMsg = JSON.stringify(errMsg)
                }
                throw new Error("Http error: [" + resp.response.statusCode + "] " + errMsg)
            }

            return resp
        } catch (error) {
            if (error.code) {
                error = new Error("Network error: [" + error.code + "] " + error.localizedDescription)
            }
            this.error(`Action request error: ${this.name}`)
            this.error(error)
            throw error
        }
    }
    async get(parameter) {
        if (typeof parameter === "string") {
            parameter = { url: parameter }
        }
        parameter.method = "GET"
        return await this.request(parameter)
    }
    async post(parameter) {
        if (typeof parameter === "string") {
            parameter = { url: parameter }
        }
        parameter.method = "POST"
        return await this.request(parameter)
    }
    async download() {
        throw new Error(this.notAllowed)
    }
    async upload() {
        throw new Error(this.notAllowed)
    }
    async startServer() {
        throw new Error(this.notAllowed)
    }
    async stopServer() {
        throw new Error(this.notAllowed)
    }
    async shorten(param) {
        return await $http.shorten(param)
    }
    async lengthen(param) {
        return await $http.lengthen(param)
    }
}

class SecureFunction extends SecureFunctionBase {
    constructor(...args) {
        super(...args)
        this.file = new SecureFile(...args)
        this.http = new SecureHttp(...args)
    }

    addin() {
        throw new Error(this.notAllowed)
    }
}

class SecureScript {
    /**
     * @typedef {string}
     */
    script
    sf = "this.secureFunction"

    /**
     * @param {string} script
     */
    constructor(script) {
        this.script = script
    }

    /**
     * Replaces text in a string, using a regular expression or search string.
     * @param {string | RegExp} searchValue A string or regular expression to search for.
     * @param {string} replaceValue A string containing the text to replace. When the searchValue is a RegExp, all matches are replaced if the g flag is set (or only those matches at the beginning, if the y flag is also present). Otherwise, only the first match of searchValue is replaced.
     */
    #replace(searchValue, replaceValue) {
        this.script = this.script.replaceAll(searchValue, replaceValue)
    }

    replaceEval() {
        this.#replace(/\$addin\.*[a-zA-Z0-9\[\]'"`]+/gi, `${this.sf}.addin()`)
        this.#replace("eval", `${this.sf}.addin()`)
    }

    replaceFile() {
        this.#replace("$file", `${this.sf}.file`)
    }
    replaceHttp() {
        this.#replace("$http", `${this.sf}.http`)
    }

    secure() {
        this.replaceEval()
        this.replaceFile()
        this.replaceHttp()
        return this.script
    }
}

module.exports = {
    SecureFunction,
    SecureScript
}
