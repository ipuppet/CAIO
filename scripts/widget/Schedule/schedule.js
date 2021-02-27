class Schedule {
    constructor(kernel, setting) {
        this.kernel = kernel
        this.setting = setting
        this.colorDate = this.setting.get("colorDate")
        this.colorCalendar = this.setting.get("colorCalendar")
        this.colorReminder = this.setting.get("colorReminder")
        this.itemLength = this.setting.get("itemLength")
        this.calendarUrlScheme = `jsbox://run?name=${this.kernel.name}&url-scheme=calshow://`
        this.reminderUrlScheme = `jsbox://run?name=${this.kernel.name}&url-scheme=x-apple-reminderkit://`
        switch (this.setting.get("clickEvent")) {
            case 0:
                this.urlScheme = this.setting.settingUrlScheme
                break
            case 1:
                this.urlScheme = this.reminderUrlScheme
                break
            case 2:
                this.urlScheme = this.calendarUrlScheme
                break
        }
    }

    /**
     * 排序
     * @param {Array} arr 数组
     * @param {CallableFunction} compare 比较大小
     */
    quicksort(arr, left, right, compare) {
        let i, j, temp, middle
        if (left > right) return
        middle = arr[left]
        i = left
        j = right
        while (i != j) {
            while (compare(arr[j], middle) && i < j) j--
            while (compare(middle, arr[i]) && i < j) i++
            if (i < j) {
                temp = arr[i]
                arr[i] = arr[j]
                arr[j] = temp
            }
        }
        arr[left] = arr[i]
        arr[i] = middle
        this.quicksort(arr, left, i - 1, compare)
        this.quicksort(arr, i + 1, right, compare)
    }

    /**
     * 格式化日期时间
     * @param {Date} date 
     * @param {Number} mode 模式，0：只有日期，1：只有时间
     */
    formatDate(date, mode = 0) {
        if (!date) return $l10n("NO_DATE")
        const formatInt = int => int < 10 ? `0${int}` : String(int)
        if (mode === 0) {
            const month = date.getMonth() + 1
            date = date.getDate()
            return date === new Date().getDate() ? $l10n("TODAY") : `${month}${$l10n("MONTH")}${date}${$l10n("DATE")}`
        } else if (mode === 1) {
            return `${formatInt(date.getHours())}:${formatInt(date.getMinutes())}`
        }

    }

    getListView(list) {
        if (list.length === 0) return null
        let itemLength = 0
        const dateCollect = {}
        const isReminder = item => item.completed !== undefined
        const isExpire = date => date ? date.getTime() < new Date().getTime() : false
        for (let item of list) {
            // 控制显示数目
            if (itemLength >= this.itemLength) break
            const dateString = isReminder(item) ? this.formatDate(item.alarmDate) : this.formatDate(item.endDate)
            if (!dateCollect[dateString])
                dateCollect[dateString] = []
            itemLength++
            dateCollect[dateString].push(item)
        }
        const views = []
        for (let date of Object.keys(dateCollect)) {
            const view = []
            for (let item of dateCollect[date]) {
                view.push({
                    type: "vstack",
                    props: {
                        frame: { maxWidth: Infinity },
                        spacing: 0
                    },
                    views: [
                        { // 颜色条和事件名称
                            type: "hstack",
                            props: {
                                frame: {
                                    maxWidth: Infinity,
                                    height: 20,
                                    alignment: $widget.alignment.leading,
                                },
                                spacing: 5
                            },
                            views: [
                                { // 颜色条
                                    type: "color",
                                    props: {
                                        frame: {
                                            alignment: $widget.alignment.trailing,
                                            width: 2,
                                            height: 12
                                        },
                                        color: isReminder(item) ? $color(this.colorReminder) : $color(this.colorCalendar)
                                    }
                                },
                                { // 事件名称
                                    type: "text",
                                    props: {
                                        lineLimit: 1,
                                        text: item.title,
                                        font: $font(14),
                                        frame: {
                                            maxWidth: Infinity,
                                            alignment: $widget.alignment.leading
                                        }
                                    }
                                },
                            ]
                        },
                        { // 图标和日期
                            type: "hstack",
                            props: {
                                frame: {
                                    maxWidth: Infinity,
                                    alignment: $widget.alignment.leading,
                                },
                                spacing: 5,
                                padding: $insets(0, 7, 0, 0)
                            },
                            views: [
                                { // 图标
                                    type: "image",
                                    props: {
                                        symbol: isReminder(item) ? "list.dash" : "calendar",
                                        frame: {
                                            width: 12,
                                            height: 12
                                        },
                                        color: isReminder(item) ? $color(this.colorReminder) : $color(this.colorCalendar),
                                        resizable: true
                                    }
                                },
                                { // 日期文字
                                    type: "text",
                                    props: {
                                        lineLimit: 1,
                                        text: isReminder(item) ? this.formatDate(item.alarmDate, 1) : (() => {
                                            const startDate = this.formatDate(item.startDate, 1)
                                            const endDate = this.formatDate(item.endDate, 1)
                                            return `${startDate}-${endDate}`
                                        })(),
                                        font: $font(12),
                                        color: $color("systemGray2"),
                                        frame: { height: 12 }
                                    }
                                },
                                { // 已过期
                                    type: "image",
                                    props: {
                                        opacity: (() => {
                                            if (isReminder(item)) return isExpire(item.alarmDate) ? 1 : 0
                                            else return isExpire(item.endDate) ? 1 : 0
                                        })(),
                                        symbol: "exclamationmark.triangle.fill",
                                        color: $color("red"),
                                        frame: {
                                            width: 12,
                                            height: 12
                                        },
                                        resizable: true
                                    }
                                }
                            ]
                        }
                    ]
                })
            }
            views.push({
                type: "vstack",
                props: { spacing: 0 },
                views: [
                    {
                        type: "text",
                        props: {
                            text: date,
                            color: $color(this.colorDate),
                            font: $font("bold", 12),
                            frame: {
                                maxWidth: Infinity,
                                alignment: $widget.alignment.leading,
                                height: 12,
                            },
                            padding: $insets(0, 7, 0, 0) // +2为竖线颜色条宽度
                        }
                    }
                ].concat(view)
            })
        }
        return views
    }

    setData(calendar, reminder) {
        this.calendar = calendar
        this.reminder = reminder
    }

    /**
     * 获取视图
     */
    scheduleView(family) {
        const nothingView = text => {
            return {
                type: "text",
                props: {
                    frame: {
                        maxHeight: Infinity,
                        maxWidth: Infinity,
                        alignment: $widget.alignment.top
                    },
                    text: text,
                    widgetURL: this.urlScheme
                }
            }
        }
        const listView = (views, props = {}) => {
            return {
                type: "vstack",
                props: Object.assign({
                    frame: {
                        maxHeight: Infinity,
                        alignment: $widget.verticalAlignment.firstTextBaseline
                    },
                    padding: 15,
                    spacing: 8
                }, props),
                views: views
            }
        }
        const compareByDate = (item, compare) => {
            const nowDate = new Date()
            const itemDate = item.endDate ? item.endDate : item.alarmDate ? item.alarmDate : nowDate
            const compareDate = compare.endDate ? compare.endDate : compare.alarmDate ? compare.alarmDate : nowDate
            return itemDate.getTime() >= compareDate.getTime()
        }
        if (family === this.setting.family.small) {
            // 混合日程和提醒事项
            const schedule = [].concat(this.calendar).concat(this.reminder)
            // 按结束日期排序
            this.quicksort(schedule, 0, schedule.length - 1, compareByDate)
            // 获取视图
            const view = this.getListView(schedule)
            if (null === view) return nothingView($l10n("NO_CALENDAR&REMINDER"))
            return listView(view, { widgetURL: this.urlScheme })
        } else {
            // 整理数据
            this.quicksort(this.calendar, 0, this.calendar.length - 1, compareByDate)
            this.quicksort(this.reminder, 0, this.reminder.length - 1, compareByDate)
            // 获取视图
            const calendarView = this.getListView(this.calendar) ?? [nothingView($l10n("NO_CALENDAR"))]
            const reminderView = this.getListView(this.reminder) ?? [nothingView($l10n("NO_REMINDER"))]
            return {
                type: "hstack",
                props: {
                    frame: {
                        maxWidth: Infinity,
                        maxHeight: Infinity,
                        alignment: $widget.verticalAlignment.firstTextBaseline
                    },
                    spacing: 0
                },
                views: [
                    listView(calendarView, { link: this.calendarUrlScheme }),
                    listView(reminderView, { link: this.reminderUrlScheme })
                ]
            }
        }
    }
}

module.exports = Schedule