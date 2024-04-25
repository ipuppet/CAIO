# CAIO

> Clipboard all in one.
>
> A Clipboard tool based on JSBox.

[See My Blog](https://blog.ultagic.com/#/detail/42/)

Support for home widget and notification center widgets.

## Build Taio Action

Build script depend on [Parcel](https://parceljs.org/).

```shell
npm i -g parcel
npm run build
```

You can also use the packaged files directly [dist/CAIO-en.json](./dist/CAIO-en.json).

## Actions

> For details on how to write, see `scripts/action/README.md` or the book button in the upper right corner of the `Action` edit page in the app.

### `Action` data difference in different environments

- The data processed by the `Action` button at the top of the home page is the currently copied content.
- The data processed by the `Action` menu that pops up by long-pressing the list is the selected content.
- The data processed by the `Action` button in the editor is whatever is being edited.

## Today Widget

> Click to copy, long press to trigger the action.

Please try to avoid using the Today Widget when JSBox is running CAIO.

## WebDAV

> Sync data with WebDAV.

Config Example:  
Host: `https://example.com/dav`  
User: `guest`  
Password: `password123`  
Bast Path: `/path/to/save/appdata`

## Shortcuts

Please add a new action called `Run JSBox script` and set the `Name` parameter to `CAIO`.

Next, set the `Parameter Dictionary` to a `Dictionary`.

| Parameter | Type   |
| --------- | ------ |
| set       | Text   |
| get       | Number |
| table     | Text   |

`set`: The content will be saved to CAIO unless there is already an existing item with the same name.

`get`: The item at the specified index (e.g., 0) will be returned.

`table`: It will specify the table to either set or get the item from, with options being `["favorite", "clips"]`. This parameter is optional and has a default value of `clips`.
