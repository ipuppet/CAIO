const CryptoJS = require("crypto-js")

class AES {
    key
    iv

    constructor(key, iv) {
        this.key = CryptoJS.enc.Utf8.parse(key) //16位
        this.iv = CryptoJS.enc.Utf8.parse(iv)
    }

    encrypt(text) {
        const wordArray = CryptoJS.enc.Utf8.parse(text)
        let encrypted = CryptoJS.AES.encrypt(wordArray, this.key, {
            iv: this.iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        })
        return CryptoJS.enc.Base64.stringify(encrypted.ciphertext)
    }

    decrypt(base64String) {
        const wordArray = CryptoJS.enc.Base64.parse(base64String)
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: wordArray
        })
        const decrypt = CryptoJS.AES.decrypt(cipherParams, this.key, {
            iv: this.iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        })

        const decryptedStr = decrypt.toString(CryptoJS.enc.Utf8)
        return decryptedStr
    }
}

module.exports = AES
