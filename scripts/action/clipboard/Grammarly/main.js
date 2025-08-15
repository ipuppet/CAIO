/**
 * @typedef {import("../../action").Action} Action
 * @typedef {import("../../action").ActionEnv} ActionEnv
 */
class MyAction extends Action {
    // 计算文本差异的函数
    calculateDifferences(oldText, newText) {
        // 先去除首尾空白字符，避免因为结尾空白导致的误判
        const trimmedOldText = oldText.trim()
        const trimmedNewText = newText.trim()

        // 如果去除空白后文本相同，则无差异
        if (trimmedOldText === trimmedNewText) {
            return []
        }

        const oldWords = trimmedOldText.split(/(\s+)/)
        const newWords = trimmedNewText.split(/(\s+)/)
        const differences = []
        let oldIndex = 0,
            newIndex = 0,
            currentOld = "",
            currentNew = "",
            hasChanges = false

        const saveDifference = () => {
            if (hasChanges) {
                const oldTrimmed = currentOld.trim()
                const newTrimmed = currentNew.trim()
                // 只有当修剪后的文本真正不同时才添加差异
                if (oldTrimmed !== newTrimmed) {
                    differences.push({ oldText: oldTrimmed, newText: newTrimmed, type: "change" })
                }
                currentOld = currentNew = ""
                hasChanges = false
            }
        }

        // 辅助函数：比较两个词是否相等（忽略纯空白差异）
        const wordsEqual = (word1, word2) => {
            // 如果完全相等
            if (word1 === word2) return true

            // 如果都是空白字符，认为相等
            if (/^\s*$/.test(word1) && /^\s*$/.test(word2)) return true

            return false
        }

        while (oldIndex < oldWords.length || newIndex < newWords.length) {
            const oldWord = oldWords[oldIndex] || ""
            const newWord = newWords[newIndex] || ""

            if (wordsEqual(oldWord, newWord)) {
                saveDifference()
                oldIndex++
                newIndex++
            } else {
                hasChanges = true
                let foundMatch = false

                // 查找下一个匹配点（删除或插入情况）
                for (let i = 1; i <= 5 && !foundMatch; i++) {
                    if (wordsEqual(oldWords[oldIndex + i], newWords[newIndex])) {
                        // 删除情况
                        for (let j = 0; j < i; j++) currentOld += oldWords[oldIndex + j] || ""
                        oldIndex += i
                        foundMatch = true
                    } else if (wordsEqual(oldWords[oldIndex], newWords[newIndex + i])) {
                        // 插入情况
                        for (let j = 0; j < i; j++) currentNew += newWords[newIndex + j] || ""
                        newIndex += i
                        foundMatch = true
                    }
                }

                if (!foundMatch) {
                    // 替换情况
                    currentOld += oldWord
                    currentNew += newWord
                    oldIndex++
                    newIndex++
                }
            }
        }

        saveDifference()
        return differences
    }

    async grammarly(text) {
        try {
            const client = this.getAIClient()
            client.setInstruction(`模仿Grammarly应用纠正给出的英文文本中的拼写和语法错误，如有语序错误也进行修正。只输出修改后的文本，不包含任何额外内容或解释。如果没有错误则不进行任何修改，原样输出。

**示例：**

**原文：**
I has went to the store yesterday, and I seen a very prety dog. It's fur was so soft.

**输出：**
I went to the store yesterday, and I saw a very pretty dog. Its fur was so soft.`)
            await client.sendMessage(text)
            return client.parseResponse()
        } catch (error) {
            throw error
        }
    }

    getStyle() {
        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0b0f14;
            color: #e5e7eb;
            line-height: 1.4;
            overflow: hidden;
            height: 100vh;
            -webkit-text-size-adjust: 100%;
            touch-action: manipulation;
        }
        
        .container {
            width: 100%;
            height: 100vh;
            background: #0f141a;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        
        .close-btn {
            width: 32px;
            height: 32px;
            border: 1px solid #2a2f3a;
            background: #111827;
            border-radius: 6px;
            cursor: pointer;
            font-size: 18px;
            color: #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }
        
        .close-btn:hover {
            background: #1f2937;
            color: #e5e7eb;
            border-color: #374151;
        }
        
        .diff-container {
            flex: 1;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            padding: 3vh 0;
            min-height: 0;
            padding-bottom: 80px;
        }
        
        .diff-slider {
            display: flex;
            transition: transform 0.3s ease;
            will-change: transform;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
        }
        
        .diff-item {
            flex: 0 0 100%;
            min-width: 100%;
            display: flex;
            flex-direction: column;
            gap: 12px;
            height: 100%;
        }
        
        .indicator-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 0 16px;
            margin-bottom: 4px;
            flex-shrink: 0;
        }
        
        .diff-item .content-area {
            flex: 1;
            width: 100%;
            display: flex;
            align-items: center;
        }
        
        .change-indicator {
            text-align: left;
            font-size: 14px;
            color: #9ca3af;
            font-weight: 500;
        }
        
        .context-line {
            font-size: 17px;
            line-height: 1.65;
            text-align: left;
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 0 16px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            align-self: center;
        }
        
        .context-text {
            color: #9ca3af;
        }
        
        .original-text {
            background: rgba(220, 38, 38, 0.15);
            color: #ef4444;
            text-decoration: line-through;
            padding: 2px 4px;
            border-radius: 3px;
            margin: 0 2px;
        }
        
        .suggested-text {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            font-weight: 500;
            padding: 2px 4px;
            border-radius: 3px;
            margin: 0 2px;
        }
        
        .navigation {
            background: #0f141a;
            border-top: 1px solid #2a2f3a;
            flex-shrink: 0;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 12px 0;
        }

        .nav-inner {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 0 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .nav-buttons {
            display: flex;
            gap: 8px;
        }
        
        .nav-btn {
            background: #111827;
            border: 1px solid #2a2f3a;
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 13px;
            color: #cbd5e1;
            transition: all 0.2s ease;
            touch-action: manipulation;
        }
        
        .nav-btn:hover:not(:disabled) {
            background: #1f2937;
            border-color: #374151;
        }
        
        .nav-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .nav-btn:active:not(:disabled) {
            transform: scale(0.95);
        }
        
        .accept-btn {
            background: linear-gradient(135deg, #15ac7f 0%, #0ea270 100%);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 4px;
            touch-action: manipulation;
        }
        
        .accept-btn:hover {
            background: linear-gradient(135deg, #0fb37a 0%, #0a8f62 100%);
        }
        
        .accept-btn:active {
            transform: scale(0.95);
        }
        
        .no-changes {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 2vh 0 80px;
            color: #9ca3af;
        }
        
        .no-changes .content-area {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .no-changes-inner {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 0 16px;
            text-align: center;
        }
        
        .no-changes-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .no-changes h3 {
            font-size: 18px;
            margin-bottom: 8px;
        }
        
        .no-changes p {
            font-size: 14px;
        }
        `
    }

    renderHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>Grammar Check</title>
    <style>${this.getStyle()}</style>
</head>
<body>
    <div class="container">
        <!-- Loading state -->
        <div id="loadingContent" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; padding: 40px 20px;">
            <div style="font-size: 24px; margin-bottom: 16px;">✨</div>
            <h3 style="font-size: 18px; margin-bottom: 8px;">Checking grammar...</h3>
            <p style="color: #9ca3af; font-size: 14px;">Please wait while we analyze your text</p>
        </div>
        
        <!-- Content will be initialized by JavaScript -->
        <div id="mainContent" style="display: none;"></div>
    </div>
</body>
</html>
        `
    }

    getWebView(html) {
        function script() {
            // 处理初始化数据
            function handleInitializeDiff(message) {
                window.originalText = message.originalText
                window.suggestedText = message.suggestedText
                window.differences = message.differences
                window.currentDiffIndex = 0
                window.acceptedChanges = []
                window.isInitialized = true

                // 隐藏加载状态，显示主内容
                const loadingContent = document.getElementById("loadingContent")
                const mainContent = document.getElementById("mainContent")
                if (loadingContent) loadingContent.style.display = "none"
                if (mainContent) mainContent.style.display = "block"

                // 初始化内容
                initializeContent()
                bindEventListeners()
                setupTouchSupport()
                updateDiffDisplay()
            }

            // 转义HTML函数
            function escapeHtml(text) {
                return text
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;")
            }

            // 生成带上下文的差异显示
            function generateContextualDiff(diff, originalText) {
                const words = originalText.split(/(\s+)/)
                const oldWords = diff.oldText.split(/(\s+)/)

                // 找到差异在原文中的位置
                let startIndex = -1
                for (let i = 0; i <= words.length - oldWords.length; i++) {
                    let match = true
                    for (let j = 0; j < oldWords.length; j++) {
                        if (words[i + j] !== oldWords[j]) {
                            match = false
                            break
                        }
                    }
                    if (match) {
                        startIndex = i
                        break
                    }
                }

                if (startIndex === -1) {
                    return {
                        before: "",
                        original: diff.oldText,
                        suggested: diff.newText,
                        after: ""
                    }
                }

                // 获取前后上下文（大约3-5个词）
                const contextLength = 4
                const beforeWords = words.slice(Math.max(0, startIndex - contextLength), startIndex)
                const afterWords = words.slice(
                    startIndex + oldWords.length,
                    Math.min(words.length, startIndex + oldWords.length + contextLength)
                )

                return {
                    before: beforeWords.join(""),
                    original: diff.oldText,
                    suggested: diff.newText,
                    after: afterWords.join("")
                }
            }

            // 创建DOM元素的辅助函数
            function createElement(tag, props = {}, children = []) {
                const el = document.createElement(tag)
                Object.entries(props).forEach(([key, value]) => {
                    if (key === "className") el.className = value
                    else if (key === "innerHTML") el.innerHTML = value
                    else el.setAttribute(key, value)
                })
                children.forEach(child => {
                    if (typeof child === "string") el.appendChild(document.createTextNode(child))
                    else el.appendChild(child)
                })
                return el
            }

            // 创建差异项的辅助函数
            function createDiffItem(diff, index) {
                const context = generateContextualDiff(diff, window.originalText)
                return createElement("div", { className: "diff-item" }, [
                    createElement("div", { className: "indicator-row" }, [
                        createElement("div", { className: "change-indicator" }, [
                            `Change ${index + 1} of ${window.differences.length}`
                        ]),
                        createElement("button", {
                            className: "close-btn",
                            id: "closeBtn",
                            innerHTML: "✕"
                        })
                    ]),
                    createElement("div", { className: "content-area" }, [
                        createElement("div", { className: "context-line" }, [
                            createElement("span", { className: "context-text" }, [escapeHtml(context.before)]),
                            createElement("span", { className: "original-text" }, [escapeHtml(context.original)]),
                            createElement("span", { className: "suggested-text" }, [escapeHtml(context.suggested)]),
                            createElement("span", { className: "context-text" }, [escapeHtml(context.after)])
                        ])
                    ])
                ])
            }

            // 初始化主内容
            function initializeContent() {
                const mainContent = document.getElementById("mainContent")
                if (!mainContent) return
                mainContent.innerHTML = ""

                if (window.differences.length > 0) {
                    const diffSlider = createElement("div", { className: "diff-slider", id: "diffSlider" })
                    window.differences.forEach((diff, index) => diffSlider.appendChild(createDiffItem(diff, index)))

                    const prevBtn = createElement("button", { className: "nav-btn", id: "prevBtn" }, ["Previous"])
                    const nextBtn = createElement("button", { className: "nav-btn", id: "nextBtn" }, ["Next"])
                    const acceptBtn = createElement("button", { className: "accept-btn", id: "acceptBtn" }, [
                        "✓ Accept"
                    ])

                    prevBtn.onclick = previousDiff
                    nextBtn.onclick = nextDiff

                    mainContent.appendChild(
                        createElement("div", { className: "diff-container", id: "diffContainer" }, [diffSlider])
                    )
                    mainContent.appendChild(
                        createElement("div", { className: "navigation" }, [
                            createElement("div", { className: "nav-inner" }, [
                                createElement("div", { className: "nav-buttons" }, [prevBtn, nextBtn]),
                                acceptBtn
                            ])
                        ])
                    )
                } else {
                    mainContent.appendChild(
                        createElement("div", { className: "no-changes" }, [
                            createElement("div", { className: "indicator-row" }, [
                                createElement("div", { className: "change-indicator" }, ["No suggestions found"]),
                                createElement("button", {
                                    className: "close-btn",
                                    id: "closeBtn",
                                    innerHTML: "✕"
                                })
                            ]),
                            createElement("div", { className: "content-area" }, [
                                createElement("div", { className: "no-changes-inner" }, [
                                    createElement("div", { className: "no-changes-icon" }, ["✨"]),
                                    createElement("h3", {}, ["Your text looks great!"]),
                                    createElement("p", {}, ["No grammar issues detected"])
                                ])
                            ])
                        ])
                    )
                }
            }

            // 更新差异显示
            function updateDiffDisplay() {
                const slider = document.getElementById("diffSlider")
                const prevBtn = document.getElementById("prevBtn")
                const nextBtn = document.getElementById("nextBtn")

                if (slider && window.differences.length > 0) {
                    const translateX = -window.currentDiffIndex * 100
                    slider.style.transform = `translateX(${translateX}%)`

                    // 更新按钮状态
                    if (prevBtn) {
                        prevBtn.disabled = window.currentDiffIndex === 0
                    }

                    if (nextBtn) {
                        nextBtn.disabled = window.currentDiffIndex === window.differences.length - 1
                    }
                }
            }

            // 上一个差异
            window.previousDiff = function () {
                if (window.currentDiffIndex > 0) {
                    window.currentDiffIndex--
                    updateDiffDisplay()
                }
            }

            // 下一个差异
            window.nextDiff = function () {
                if (window.currentDiffIndex < window.differences.length - 1) {
                    window.currentDiffIndex++
                    updateDiffDisplay()
                }
            }

            // 绑定事件监听器
            function bindEventListeners() {
                // 关闭按钮（现在在每个diff-item中）
                const closeBtns = document.querySelectorAll("#closeBtn")
                closeBtns.forEach(closeBtn => {
                    if (closeBtn) {
                        closeBtn.onclick = function () {
                            $notify("close", {})
                        }
                    }
                })

                // 接受当前差异
                const acceptBtn = document.getElementById("acceptBtn")
                if (acceptBtn) {
                    acceptBtn.onclick = function (event) {
                        event.preventDefault()
                        if (window.differences.length === 0) return

                        acceptBtn.style.transform = "scale(0.95)"
                        setTimeout(() => {
                            acceptBtn.style.transform = "scale(1)"
                        }, 150)

                        const currentDiff = window.differences[window.currentDiffIndex]
                        window.acceptedChanges.push({
                            index: window.currentDiffIndex,
                            oldText: currentDiff.oldText,
                            newText: currentDiff.newText
                        })

                        $notify("acceptDiff", {
                            diffIndex: window.currentDiffIndex,
                            oldText: currentDiff.oldText,
                            newText: currentDiff.newText,
                            allAcceptedChanges: window.acceptedChanges
                        })

                        window.differences.splice(window.currentDiffIndex, 1)

                        if (window.currentDiffIndex >= window.differences.length) {
                            window.currentDiffIndex = Math.max(0, window.differences.length - 1)
                        }

                        initializeContent()
                        bindEventListeners()
                        setupTouchSupport()
                        updateDiffDisplay()
                    }
                }
            }

            // 设置触摸滑动支持
            function setupTouchSupport() {
                const diffContainer = document.getElementById("diffContainer")
                if (diffContainer) {
                    let startX = 0
                    let startTime = 0

                    diffContainer.addEventListener("touchstart", function (e) {
                        startX = e.touches[0].clientX
                        startTime = Date.now()
                    })

                    diffContainer.addEventListener("touchend", function (e) {
                        const endX = e.changedTouches[0].clientX
                        const endTime = Date.now()
                        const deltaX = startX - endX
                        const deltaTime = endTime - startTime

                        // 检测有效滑动：距离大于30px且时间少于300ms
                        if (Math.abs(deltaX) > 30 && deltaTime < 300) {
                            if (deltaX > 0) {
                                // 向左滑动，显示下一个
                                window.nextDiff()
                            } else {
                                // 向右滑动，显示上一个
                                window.previousDiff()
                            }
                        }
                    })
                }
            }

            setTimeout(() => $notify("initDiff", {}), 0)
        }

        return {
            type: "web",
            props: {
                id: "GrammarlyWebView",
                html,
                script: script,
                transparent: true,
                toolbar: false,
                canGoBack: false,
                canGoForward: false,
                allowsNavigation: false,
                showsProgress: false
            },
            events: {
                acceptDiff: data => this.acceptDiff(data),
                initDiff: data => this.initDiff(data),
                close: data => this.close(data)
            },
            layout: $layout.fill
        }
    }

    async initDiff() {
        const text = this.text ?? ""
        try {
            const suggestion = text === "" ? "" : await this.grammarly(text)
            const differences = this.calculateDifferences(text, suggestion)
            $("GrammarlyWebView").notify({
                event: "handleInitializeDiff",
                message: {
                    originalText: text,
                    suggestedText: suggestion,
                    differences: differences
                }
            })
        } catch (error) {
            this.showTextContent(error.message || error.toString())
        }
    }

    acceptDiff(data) {
        const { oldText, newText } = data
        if (this.env === ActionEnv.keyboard) {
            // 执行单个差异的替换
            this.replaceKeyboardText(oldText, newText)
        } else {
            // 使用更智能的替换方式，处理可能的空白字符问题
            let newContent = this.text

            // 首先尝试直接替换
            if (newContent.includes(oldText)) {
                newContent = newContent.replace(oldText, newText)
            } else {
                // 如果直接替换失败，尝试使用正则表达式进行更灵活的匹配
                // 转义特殊字符并允许空白字符的灵活匹配
                const escapedOldText = oldText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                const flexiblePattern = escapedOldText.replace(/\s+/g, "\\s*")
                const regex = new RegExp(flexiblePattern, "g")

                if (regex.test(newContent)) {
                    newContent = newContent.replace(regex, newText)
                } else {
                    // 如果仍然失败，使用最后的回退策略：查找相似内容
                    const trimmedOldText = oldText.trim()
                    const index = newContent.indexOf(trimmedOldText)
                    if (index !== -1) {
                        newContent =
                            newContent.substring(0, index) +
                            newText +
                            newContent.substring(index + trimmedOldText.length)
                    }
                }
            }

            this.setContent(newContent)
        }
    }

    close(data) {
        this.sheet.dismiss()
    }

    async do() {
        const html = this.renderHTML()
        this.sheet = this.pageSheet({
            view: this.getWebView(html),
            navbar: false,
            fullScreen: this.env === ActionEnv.keyboard
        })
    }
}
