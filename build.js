const fs = require("fs")
const path = require("path")
const process = require("child_process")

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"))

const outputName = config.info.name
const distEntryPath = path.join(__dirname, `dist/${outputName}.js`)
const entryFileContent = fs.readFileSync(path.join(__dirname, "main.js"), "utf-8")

const entryFile = "main.build.js"
const entryFilePath = path.join(__dirname, entryFile)

function injectContent() {
    const stringsFolder = path.join(__dirname, "strings")
    const stringsFiles = fs.readdirSync(stringsFolder)
    const localizedText = {}
    stringsFiles.forEach(fileName => {
        if (path.extname(fileName) !== ".strings") {
            return
        }

        const locale = fileName.replace(".strings", "")
        localizedText[locale] = {}

        const filePath = path.join(stringsFolder, fileName)
        const content = fs.readFileSync(filePath, "utf-8")
        const lines = content.split(/\r?\n/)
        lines.forEach(line => {
            const match = /[\"'](.+)[\"'][ \n]*=[ \n]*[\"'](.+)[\"']/.exec(line)
            if (match) {
                localizedText[locale][match[1]] = match[2]
            }
        })
    })
    const stringsText = `$app.strings = ${JSON.stringify(localizedText)};`

    const configSettings = Object.keys(config.settings)
        .map(key => {
            const value = (() => {
                const value = config.settings[key]
                if (typeof value === "string") {
                    return `"${value}"`
                } else {
                    return value
                }
            })()
            return `$app.${key} = ${value};`
        })
        .join("\n")
    const configInfo = `__INFO__ = ${JSON.stringify(config.info)};`

    const readmeText = (() => {
        const files = {}
        const fileList = ["README.md", "README_CN.md"]
        fileList.map(name => (files[name] = fs.readFileSync(path.join(__dirname, name), "utf-8")))
        return `__README__ = ${JSON.stringify(files)}`
    })()

    const actions = (() => {
        const baseActionPath = path.join(__dirname, "scripts/action")
        try {
            const actions = {}
            const addFile = (type, dir) => {
                if (!actions[type]) {
                    actions[type] = {}
                }
                const actionPath = path.join(baseActionPath, type, dir)
                actions[type][dir] = {
                    "config.json": fs.readFileSync(path.join(actionPath, "config.json"), "utf-8"),
                    "main.js": fs.readFileSync(path.join(actionPath, "main.js"), "utf-8"),
                    "README.md": fs.readFileSync(path.join(actionPath, "README.md"), "utf-8")
                }
            }

            const allActionType = fs.readdirSync(baseActionPath)
            allActionType.forEach(type => {
                const filePath = path.join(baseActionPath, type)
                const stat = fs.lstatSync(filePath)
                if (stat.isDirectory()) {
                    const actions = fs.readdirSync(filePath)
                    actions.forEach(name => {
                        addFile(type, name)
                    })
                }
            })

            return `__ACTIONS__ = ${JSON.stringify(actions)}`
        } catch (error) {
            console.error(error)
            return ""
        }
    })()

    const actionReadme = (() => {
        const file = path.join(__dirname, "scripts/action/README.md")
        const content = fs.readFileSync(file, "utf-8")
        return `__ACTION_README__ = ${JSON.stringify({ content })}`
    })()

    const contents = [stringsText, configSettings, configInfo, readmeText, actions, actionReadme, entryFileContent]

    fs.writeFileSync(entryFilePath, contents.join("\n\n"))
}

function buildTextActions() {
    const script = fs.readFileSync(distEntryPath, "utf-8")
    const folder = path.join(__dirname, "templates")
    const templates = fs.readdirSync(folder)
    templates.forEach(fileName => {
        const filePath = path.join(folder, fileName)
        const fileContent = fs.readFileSync(filePath, "utf-8")
        const textAction = JSON.parse(fileContent)

        textAction.name = config.info.name

        for (let i = 0; i < textAction.actions.length; i++) {
            if (textAction.actions[i].type === "@flow.javascript") {
                textAction.actions[i].parameters.script.value = script
                break
            }
        }
        const outputPath = path.join(__dirname, `dist/${outputName}-${fileName}`)
        fs.writeFileSync(outputPath, JSON.stringify(textAction, null, 4))
    })
}

function injectPackageJson(packageJson) {
    packageJson.jsbox = distEntryPath
    packageJson.targets = {
        jsbox: {
            source: entryFile,
            includeNodeModules: false,
            sourceMap: false,
            outputFormat: "global"
        }
    }

    return packageJson
}

async function build() {
    const packageJsonPath = path.join(__dirname, "package.json")
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8")

    const packageJson = injectPackageJson(JSON.parse(packageJsonContent))
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson))

    try {
        injectContent()
        const stdout = process.execSync(`parcel build`)
        console.log(stdout.toString())
        buildTextActions()
    } catch (error) {
        if (error.stdout) {
            console.error(error.stdout.toString())
        } else {
            console.error(error)
        }
    } finally {
        // 恢复文件内容
        fs.unlinkSync(entryFilePath)
        fs.writeFileSync(packageJsonPath, packageJsonContent)
    }
}

build()
