# Action

所有 `Action` 保存在 `scripts/action` 目录下，按照文件夹分类

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
const Action = require("../../action.js")

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

系统会调用当前 `Action` 的 `do()` 方法