# CAE

> Clipboard And Editor

## Action

所有 `Action` 保存在 `scripts/action` 目录下，`Action` 结构如下：
- `ActionName`
  - `config.json` 配置文件
  - `main.js` 入口文件
  - `README.md` 说明文件

`config.json` 配置项
- `type` 类型 不设置则不分类，同时也不会显示
  - `editor` 应用于编辑器
  - `clipboard` 应用于剪切板
- `name` 名称
- `description` 描述信息

`main.js` 文件内如需如下
```js
const Action = require("../action.js")

class TestAction extends Action {
    /**
     * 入口函数
     */
    do() {
        console.log(this.text)
    }
}

module.exports = TestAction
```

父类 `Action` 的属性：
- `this.text` 当前复制的文本或首页列表中长按触发动作菜单的行中的文本
- `this.uuid` 该文本的uuid
- `this.fromList` 来源于首页列表中长按
- `this.fromClipboard` 来源于当前复制的文本
- `this.from` 来源，其值为 `this.fromList` 或 `this.fromClipboard`

方法：
- `updateList(text)` 更新列表选中行的内容，只有来源为 `this.fromList` 时生效