# Action

所有 Action 保存在 `storage/user_action` 目录下，按照文件夹分类

`Action` 结构如下：

- `ActionName`
  - `config.json` 配置文件
  - `main.js` 入口文件
  - `README.md` 说明文件

### `config.json` 配置项

- `icon` 图标 可以是 [JSBox 内置图标](https://github.com/cyanzhong/xTeko/tree/master/extension-icons)、SF Symbols图标、base64图片数据和来自 url 的图片
- `color` 颜色
- `name` 名称
- `description` 描述信息

### `main.js` 入口文件

创建名为 `MyAction` 的类并继承 `Action` 类

```js
/**
 * @typedef {import("scripts/action/action.js").Action} Action
 */
/**
 * 必须为 MyAction
 */
class MyAction extends Action {
    /**
     * 系统会调用 do() 方法
     */
    do() {
        console.log(this.text)
    }
}
```

### 父类 `Action` 的属性：
- `this.env`  
  当前运行环境，参见 [ActionEnv](#ActionEnv)
- `this.config`  
  当前 Action 配置文件内容
- `this.originalContent`  
  原始数据
- `this.text`  
  优先为选中的文本，若无则：当处于键盘中运行时为输入框内文本，处于编辑器时为编辑器内文本，其他情况为剪切板内文本
- `this.selectedRange`  
  在编辑器中，当前选中的文本范围 `{location: Number, length: Number}`

更多参见 [ActionData](#ActionData)

### 父类的方法：
```js
/**
 * 重写该防范返回 l10n 对象可注入 l10n
 * l10n() {
        return {
            "zh-Hans": {
                "clipboard.clean.success": "剪切板已清空"
            },
            en: {
                "clipboard.clean.success": "Clipboard is cleaned"
            }
        }
    }
 */
l10n()

/**
 * page sheet
 * @param {*} args 
 *  {
        view: args.view, // 视图对象
        title: args.title ?? "", // 中间标题
        done: args.done, // 点击左上角按钮后的回调函数
        doneText: args.doneText ?? $l10n("DONE") // 左上角文本
        rightButtons: [{ title:string, symbol:string, tapped:function }] // 右上角按钮
    }
  */
pageSheet(args): void

/**
 * 获取所有剪切板数据
 * @returns Array
 */
getAllClipboard() {
    return this.kernel.storage.all()
}

/**
 * 更新当前文本，当用户侧滑返回时才会触发保存操作
 */
setContent(text): void

/**
 * 运行指定的 Action 并返回该 Action do() 方法的返回值
 */
runAction(type, name): any

/**
 * 从 `this.text` 中匹配所有 url
 */
getUrls(): []
```

### <span id="ActionEnv">ActionEnv</span>
```js
class ActionEnv {
    static keyboard = 0
    static today = 0
    static editor = 1
    static clipboard = 2
    static action = 3
}
```

### <span id="ActionData">ActionData</span>
```js
class ActionData {
    env
    text
    originalContent
    uuid // 首页剪切板项目 uuid
    selectedRange
    textBeforeInput
    textAfterInput
}
```