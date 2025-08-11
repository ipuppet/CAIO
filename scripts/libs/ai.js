class AIConfig {
    apiKey = ""
    model = ""
    endpoint = ""
    instruction = ""

    response

    constructor(apiKey, model, endpoint) {
        this.apiKey = apiKey
        this.model = model
        this.endpoint = endpoint
        this.instruction = this.buildInstruction()
    }

    buildInstruction() {
        let instruction = "You are ChatGPT, a large language model trained by OpenAI."
        instruction += `\nKnowledge cutoff: ${new Date().toISOString().split("T")[0]}`
        instruction += `\nCurrent model: ${this.model}`
        instruction += `\nCurrent time: ${new Date().toISOString()}`
        return instruction
    }

    setInstruction(instruction) {
        this.instruction = instruction
    }

    getInstruction() {
        return this.instruction
    }

    setModel(model) {
        return (this.model = model)
    }

    getHeaders() {
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
        }
    }

    getEndpoint() {
        return this.endpoint
    }

    getBody(message) {
        return {
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: this.getInstruction()
                },
                {
                    role: "user",
                    content: message
                }
            ]
        }
    }

    async sendMessage(message) {
        try {
            this.response = await $http.post({
                url: this.getEndpoint(),
                header: this.getHeaders(),
                body: this.getBody(message)
            })
            const statusCode = this.response.response.statusCode
            if (statusCode !== 200) {
                let errorMsg = this.response.data.error.message
                if (statusCode === 401) errorMsg = "API Key is invalid"
                else if (statusCode === 403) errorMsg = "API Key is not authorized to access this endpoint"
                else if (statusCode === 429) errorMsg = "Rate limit exceeded"
                else if (statusCode === 500) errorMsg = "Internal server error"
                else if (statusCode === 503) errorMsg = "Service unavailable"
                throw new Error(errorMsg)
            }
            return this.response
        } catch (error) {
            throw new Error(error)
        }
    }

    parseResponse() {
        if (!this.response) {
            throw new Error("Use before sending a message")
        }

        let errorMsg = ""
        let responseText = ""

        if (this.response.data.error) errorMsg = this.response.data.error.message
        else if (this.response.data.choices && this.response.data.choices[0] && this.response.data.choices[0].message) {
            responseText = this.response.data.choices[0].message.content
        } else errorMsg = "OpenAI Completion API Response Error"

        if (errorMsg) {
            console.error("OpenAI API Error:", errorMsg)
            throw new Error(errorMsg)
        }

        return responseText
    }
}

class OpenAI extends AIConfig {
    constructor(apiKey, model, endpoint) {
        model = model ?? "gpt-5-nano"
        endpoint = endpoint ?? "https://api.openai.com/v1/chat/completions"
        super(apiKey, model, endpoint)
    }
}

class Gemini extends AIConfig {
    constructor(apiKey, model, endpoint) {
        model = model ?? "gemini-2.0-flash"
        endpoint =
            endpoint ?? "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        super(apiKey, model, endpoint)
    }

    getHeaders() {
        return { "Content-Type": "application/json" }
    }

    getEndpoint() {
        return this.endpoint.replace("{model}", this.model).replace("{api_key}", this.apiKey)
    }

    getBody(message) {
        return {
            system_instruction: {
                parts: [{ text: this.getInstruction() }]
            },
            contents: [{ parts: [{ text: message }] }]
        }
    }

    parseResponse() {
        if (!this.response) {
            throw new Error("Use before sending a message")
        }

        let errorMsg = ""
        let responseText = ""

        if (this.response.data.error) {
            errorMsg = `Gemini API Error: ${this.response.data.error.message}`
        } else if (
            this.response.data.candidates &&
            this.response.data.candidates[0] &&
            this.response.data.candidates[0].content &&
            this.response.data.candidates[0].content.parts &&
            this.response.data.candidates[0].content.parts[0]
        ) {
            responseText = this.response.data.candidates[0].content.parts[0].text
        } else if (this.response.data.promptFeedback && this.response.data.promptFeedback.blockReason) {
            errorMsg = `Content blocked: ${this.response.data.promptFeedback.blockReason}`
        } else {
            errorMsg = "Gemini API Response Error"
        }

        if (errorMsg) {
            console.error("Gemini API Error:", errorMsg)
            throw new Error(errorMsg)
        }

        return responseText
    }
}

module.exports = (type, apiKey, model, endpoint) => {
    let client = null
    switch (type) {
        case "openai":
            client = new OpenAI(apiKey, model, endpoint)
            break
        case "gemini":
            client = new Gemini(apiKey, model, endpoint)
            break
    }
    return client
}
