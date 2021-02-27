# EasyJsBox

> 一个简单的JSBox应用框架
> 
> 框架为模块化设计，可按照自身需求灵活增减模块。

## Foundation

该目录下为基础库，供各个组件使用

- controller 控制器基类

    控制器基类

- view 视图基类

    该类包含多个实用方法，且包含一些默认样式

- data-center 数据中心

    数据中心用来在controller和view之间传递数据，kernel中的`this.components`可通过同名属性快速访问数据。

