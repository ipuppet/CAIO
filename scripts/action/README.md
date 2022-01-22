# Action

所有 `Action` 保存在 `storage/user_action` 目录下，按照文件夹分类

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

```js
const Action = require("/scripts/action/action.js")

class MyAction extends Action {
    /**
     * 系统会调用 do() 方法
     */
    do() {
        console.log(this.text)
    }
}

module.exports = MyAction
```

父类 `Action` 的属性：
- `this.config` 当前 `Action` 配置文件内容
- `this.text` 当前复制的文本或剪切板页面选中的文本亦或者编辑器内的文本
- `this.selectedRange` 在编辑器中，当前选中的文本范围 `{location: Number, length: Number}`
- `this.selectedText` 在编辑器中，当前选中的文本

父类的方法：
```js
/**
 * page sheet
 * @param {*} args 
 *  {
        view: args.view, // 视图对象
        title: args.title ?? "", // 中间标题
        done: args.done, // 点击左上角按钮后的回调函数
        doneText: args.doneText ?? $l10n("DONE") // 左上角文本
    }
  */
push(args): void

/**
 * 获取所有剪切板数据
 * @returns Array
 */
getAllContent() {
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
```