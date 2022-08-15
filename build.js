const { Parcel } = require("@parcel/core")
const fs = require("fs")
const path = require("path")

const outputName = "CAIO"
const distDir = "dist"
const distEntry = `${outputName}.js`
const entryFilePath = path.join(__dirname, "main.js")
const entryFileContent = fs.readFileSync(entryFilePath, "utf-8")

const bundler = new Parcel({
    entries: "main.js",
    defaultConfig: "@parcel/config-default",
    mode: "production",
    targets: {
        main: {
            engines: {}, // Parcel just need this, not sure why
            distDir,
            distEntry,
            includeNodeModules: false
        }
    },
    defaultTargetOptions: {
        shouldOptimize: false,
        shouldScopeHoist: true,
        sourceMaps: false
    }
})

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

    const configFile = fs.readFileSync(path.join(__dirname, "config.json"), "utf-8")
    const configDict = JSON.parse(configFile).settings
    const configText = Object.keys(configDict)
        .map(key => {
            const value = (() => {
                const value = configDict[key]
                if (typeof value === "string") {
                    return `"${value}"`
                } else {
                    return value
                }
            })()
            return `$app.${key} = ${value};`
        })
        .join("\n")

    const readmeText = (() => {
        const files = {}
        const addFile = name => (files[name] = fs.readFileSync(path.join(__dirname, name), "utf-8"))
        addFile("README.md")
        addFile("README_CN.md")
        return `__README__ = ${JSON.stringify(files)}`
    })()

    const settingStructure = (() => {
        try {
            const setting = fs.readFileSync(path.join(__dirname, "setting.json"), "utf-8")
            return `__SETTING__ = ${setting}`
        } catch {
            return ""
        }
    })()

    const actions = (() => {
        const baseActionPath = path.join(__dirname, "scripts/action")
        try {
            const actions = {}
            const addFile = (type, name) => {
                if (!actions[type]) {
                    actions[type] = {}
                }
                const actionPath = path.join(baseActionPath, type, name)
                actions[type][name] = {
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

    const contents = [stringsText, configText, readmeText, settingStructure, actions, entryFileContent]

    fs.writeFileSync(entryFilePath, contents.join("\n\n"))
}

function cleanUp() {
    fs.writeFileSync(entryFilePath, entryFileContent)
    fs.rmSync(path.join(__dirname, distDir, distEntry))
}

function buildTextActions() {
    const script = fs.readFileSync(path.join(__dirname, distDir, distEntry), "utf-8")
    const folder = path.join(__dirname, "templates")
    const templates = fs.readdirSync(folder)
    templates.forEach(fileName => {
        const filePath = path.join(folder, fileName)
        const fileContent = fs.readFileSync(filePath, "utf-8")
        const textActions = JSON.parse(fileContent)
        for (let i = 0; i < textActions.actions.length; i++) {
            if (textActions.actions[i].type === "@flow.javascript") {
                textActions.actions[i].parameters.script.value = script
                break
            }
        }
        const outputPath = path.join(__dirname, `dist/${outputName}-${fileName}`)
        fs.writeFileSync(outputPath, JSON.stringify(textActions, null, 4))
    })
}

function buildJSBox() {
    const script = fs.readFileSync(path.join(__dirname, distDir, distEntry), "utf-8")
    const outputPath = path.join(__dirname, `dist/${outputName}-JSBox.js`)
    fs.writeFileSync(outputPath, script)
}

async function build() {
    injectContent()
    try {
        const { bundleGraph, buildTime } = await bundler.run()
        const bundles = bundleGraph.getBundles()
        console.log(`🔥 Built ${bundles.length} bundles in ${buildTime}ms!`)
    } catch (error) {
        console.error(error.diagnostics)
    }

    buildTextActions()
    buildJSBox()
    cleanUp()
}

build()
