# EasyJsBox-Setting

> 默认提供的设置组件，提供一个设置功能的UI页面和数据存储功能。

# 使用

## `Setting.controller`

> 组件控制器方法

- `init(args)`  
初始化，`kernel` 会自动调用，直接向 `kernel` 传递 `args` 即可。如：  
    ```js
    const kernel = new Kernel()
    const MySetting = kernel._registerComponent("Setting", {
        name: "MySetting",
        savePath: "/assets/setting.json", // 数据文件保存路径，其中的数据优先级将高于 `settintPath` 中的默认数据。
        struct: "", // 设置页面的结构，该属性优先级高于 `structPath` 属性
        structPath: "/setting.json" // 存放设置页面结构数据的 `.json` 文件
    })
    const MySettingController = MySetting.controller
    // 或 通过 `getComponent(component)` 获取：
    // `const MySettingController = kernel.getComponent("MySetting").controller`
    ```

- `get(key)`  
根据 `key` 获取值。

- `set(key, value)`  
设置键值对，该方法会将数据保存到文件，同时更新内存中的数据，这意味着设置即时生效，可随时调用 `get()` 获取数据。

- `setHook(hook)`  
您可以通过调用来监听 `set()` 方法，每当触发 `set()` 方法时都会调用通过该方法

- `isSecondaryPage(secondaryPage, pop)`  
用来设置是否是二级页面，默认不是。若改为是，则会显示一个标题栏并提供一个返回按钮。
    - `secondaryPage`: 是否是二级页面，默认不是
    - `pop`: 如果设置为二级页面，该参数应该提供一个可执行的函数，提供关闭该页面的方法。如
        ```js
        () => {
            $ui.pop()
            console.log("页面关闭了")
        }
        ```

- `setFooter(footer)`  
用来设置页脚视图，若不调用，将提供默认样式，显示作者和版本号。(作者和版本号将从根目录的 `config.js` 获取)

## Struct

> 组件提供的设置项类型

等待更新