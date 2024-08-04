# CAIO

> Clipboard all in one.  
> An iOS clipboard tool based on JSBox.

[查看我的博客](https://blog.ultagic.com/#/detail/42/)

支持桌面小组件和通知中心小组件

## 构建 Taio 动作

构建脚本依赖 [Parcel](https://parceljs.org/)

```shell
npm i -g parcel
npm run build
```

您也可以直接使用已打包好的文件 [dist/CAIO.json](./dist/CAIO.json)

## Actions

> 编写方式详见 `scripts/action/README.md` 或应用内 `Action` 编辑页面右上角图书按钮。

### 不同环境中 `Action` 数据区别

- 首页顶部 `Action` 按钮处理的数据为当前复制的内容
- 长按列表弹出的 `Action` 菜单处理的数据为被选中的内容
- 编辑器中顶部 `Action` 按钮（闪电图形按钮）处理的数据为正在编辑的所有内容

## Today Widget

> 点击复制，长按触发动作。

请尽量避免在 JSBox 运行 CAIO 时使用 Today Widget

## WebDAV

> 通过 WebDAV 同步数据

示例配置:  
Host: `https://example.com/dav`  
User: `guest`  
Password: `password123`  
Base Path: `/path/to/save`

## 快捷指令

添加一个名为 `运行 JSBox 脚本` 的动作，并将 `脚本名` 参数设置为 `CAIO`。

然后将 `参数词典` 设置为一个 `字典`。

| 参数  | 类型   |
| ----- | ------ |
| set   | Text   |
| get   | Number |
| table | Text   |

- `set`：将把内容保存到CAIO中，除非已存在相同内容的项。
- `get`：将返回指定索引（例如：0）处的项。
- `delete`：将删除指定索引（例如：0）处的项，返回该项内容。
- `table`：将指定要设置或获取项的表格，可选项为 `["favorite", "clips"]`。此项可省略，默认值为 `clips`。
