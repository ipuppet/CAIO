class Calendar {
    constructor(kernel, setting) {
        this.kernel = kernel
        this.setting = setting
        this.sloarToLunar = this.kernel.registerPlugin("sloarToLunar")
        this.onlyCurrentMonth = this.setting.get("onlyCurrentMonth")
        this.colorTone = this.setting.get("colorTone")
        this.hasHoliday = this.setting.get("holiday")
        this.holidayColor = this.setting.get("holidayColor")
        this.holidayNoRestColor = this.setting.get("holidayNoRestColor")// 调休
        if (this.hasHoliday && $file.exists(this.setting.holidayPath)) {// 假期信息
            this.holiday = JSON.parse($file.read(this.setting.holidayPath).string).holiday
        }
        this.monthDisplayMode = this.setting.get("monthDisplayMode")// 月份显示模式
        this.firstDayOfWeek = this.setting.get("firstDayOfWeek")// 每周第一天
        this.titleYear = this.setting.get("title.year")// 标题是否显示年
        this.titleFullYear = this.setting.get("title.fullYear")// 标题是否显示完整年
        this.titleLunar = this.setting.get("title.lunar")// 标题是否显示农历
        this.titleLunarYear = this.setting.get("title.lunarYear")// 标题是否显示农历年
        this.titleAddSpacer = this.setting.get("title.addSpacer")// 是否在标题和日历间增加spacer
        this.backgroundImage = this.setting.getBackgroundImage()// 背景图片
    }

    localizedWeek(index) {
        const week = [
            $l10n("SUNDAY"),
            $l10n("MONDAY"),
            $l10n("TUESDAY"),
            $l10n("WEDNESDAY"),
            $l10n("THURSDAY"),
            $l10n("FRIDAY"),
            $l10n("SATURDAY")
        ]
        if (this.firstDayOfWeek === 1) {
            index += 1
            if (index > 6) index = 0
        }
        return week[index]
    }

    localizedMonth(index) {
        const mode = this.monthDisplayMode === 0 ? "_C" : "_N"
        const month = [
            $l10n("JANUARY" + mode),
            $l10n("FEBRUARY" + mode),
            $l10n("MARCH" + mode),
            $l10n("APRIL" + mode),
            $l10n("MAY" + mode),
            $l10n("JUNE" + mode),
            $l10n("JULY" + mode),
            $l10n("AUGUST" + mode),
            $l10n("SEPTEMBER" + mode),
            $l10n("OCTOBER" + mode),
            $l10n("NOVEMBER" + mode),
            $l10n("DECEMBER" + mode)
        ]
        return month[index] + $l10n("BLANK_MONTH")
    }

    isHoliday(year, month, date) {
        /**
         * 数字补0
         */
        const toString = number => {
            if (number < 10) {
                number = "0" + number
            }
            return String(number)
        }
        if (!this.holiday) {
            return false
        }
        const key = toString(month) + "-" + toString(date)
        const holiday = this.holiday[key]
        if (holiday && holiday.date === year + "-" + key) {
            return holiday
        }
        return false
    }

    getCalendar(lunar, isFullMonth = true) {
        const dateInstance = new Date()
        const year = dateInstance.getFullYear()
        const month = dateInstance.getMonth()
        const dateNow = dateInstance.getDate() // 当前日期
        const days = new Date(year, month + 1, 0).getDate() // 总天数
        let firstDay = new Date(year, month, 1).getDay() // 本月第一天是周几
        let lastMonthDates = new Date(year, month, 0).getDate() // 上个月总天数
        let nextMonth = 1 // 下个月的日期计数器
        lastMonthDates -= 7 - firstDay // 补齐本月开始前的空位
        if (this.firstDayOfWeek === 1) { // 设置中设定每周第一天是周几
            firstDay -= 1
            if (firstDay < 0) firstDay = 6
            lastMonthDates++ // 上周补到这周的天数少一天，加上一才会少一天
        }
        let calendar = []
        let date = 1 // 日期计数器
        for (let i = 0; i < 6; i++) { // 循环6次，每个月显示6周
            const week = []
            for (let day = 0; day <= 6; day++) {
                // 当每周第一天为0时，代表前方无偏移量
                if (day === firstDay && firstDay !== 0) firstDay = 0
                let formatDay = this.firstDayOfWeek === 1 ? day + 1 : day // 格式化每周第一天
                if (formatDay > 6) formatDay = 0 // 格式化每周第一天 end
                // 只有当firstDay为0时才到本月第一天
                let formatDate
                // 是否仅显示本月
                if (this.onlyCurrentMonth) {
                    if (firstDay === 0) {
                        // 判断是否到达最后一天
                        if (date > days) {
                            break
                        }
                        formatDate = {
                            month: month,
                            date: date,
                            day: formatDay
                        }
                    } else {
                        formatDate = 0
                    }
                } else {
                    if (firstDay === 0) {
                        // 判断是否到达最后一天
                        formatDate = date > days ? {
                            month: month + 1,
                            date: nextMonth++,
                            day: formatDay
                        } : {
                                month: month,
                                date: date,
                                day: formatDay
                            }
                    } else {
                        // 补齐第一周前面空缺的日期
                        formatDate = {
                            month: month - 1,
                            date: lastMonthDates++,
                            day: formatDay
                        }
                    }
                }
                // 农历
                if (date === dateNow) {
                    // 保存农历信息
                    this.lunar = this.sloarToLunar(year, month + 1, date)
                }
                if (lunar && formatDate !== 0) {
                    // month是0-11，故+1
                    formatDate["lunar"] = date === dateNow ? this.lunar : this.sloarToLunar(
                        year, formatDate.month + 1, formatDate.date
                    )
                }
                // 节假日
                if (this.hasHoliday && formatDate !== 0) { // 判断是否需要展示节假日
                    // month是0-11，故+1
                    const holiday = this.isHoliday(year, formatDate.month + 1, formatDate.date)
                    if (holiday) {
                        formatDate["holiday"] = holiday
                    }
                }
                week.push(formatDate)
                if (firstDay === 0) date++
            }
            if (!isFullMonth) { // 是否获取整个月
                if (date > dateNow) { // 当循环日期大于当前日期时，说明本周已经循环完毕
                    calendar = week
                    break
                }
            }
            if (week.length > 0)
                calendar.push(week)
        }
        return {
            year: year,
            month: month,
            calendar: calendar,
            date: dateNow,
        }
    }

    /**
     * 不同日期显示不同样式
     */
    formatDay(date, calendarInfo, hasExtra) {
        if (date === 0) { // 空白直接跳过
            return {
                date: "",
                props: {},
                extra: null
            }
        }
        // 初始样式
        const props = {
            text: { color: $color("primaryText") },
            ext: { color: $color("primaryText") }, // 额外信息样式，如农历等
            box: {}
        }
        // 周末
        if (date.day === 0 || date.day === 6) {
            props.ext.color = props.text.color = $color("systemGray2")
        }
        // 节假日
        if (date.holiday) {
            if (date.holiday.holiday) {
                props.ext.color = props.text.color = $color(this.holidayColor)
            } else {
                props.ext.color = props.text.color = $color(this.holidayNoRestColor)
            }
        }
        // 当天
        if (date.date === calendarInfo.date) {
            props.text.color = $color("white")
            props.ext.color = $color("white")
            if (!date.holiday) {
                props.box.background = $color(this.colorTone)
            } else {
                if (date.holiday.holiday)
                    props.box.background = $color(this.holidayColor)
                else
                    props.box.background = $color(this.holidayNoRestColor)
            }
        }
        // 本月前后补位日期
        if (date.month !== calendarInfo.month) {
            props.ext.color = props.text.color = $color("systemGray2")
            props.box = {}
        }
        // 4x4 widget 可显示额外信息
        let extra = null
        if (hasExtra) {
            extra = date.holiday ? date.holiday.name : date.lunar.lunarDay
        }
        return {
            date: String(date.date),
            props: props,
            extra: extra
        }
    }

    /**
     * 每天的模板
     * @param {String} text 
     * @param {Object} props 
     * @param {*} extra 
     */
    dayTemplate(text, props = {}, extra, family) {
        const views = [{
            type: "text",
            props: Object.assign({
                text: text,
                font: $font(12),
                lineLimit: 1,
                minimumScaleFactor: 0.5,
                frame: {
                    maxWidth: Infinity,
                    maxHeight: Infinity
                }
            }, props.text)
        }]
        if (extra) { // 判断是否有额外信息
            views.push({
                type: "text",
                props: Object.assign({
                    text: extra,
                    font: $font(12),
                    lineLimit: extra.length > 3 ? 2 : 1,
                    minimumScaleFactor: 0.5,
                    frame: Object.assign({
                        maxWidth: Infinity
                    }, family ? {
                        height: (() => {
                            $widget.family = family
                            return ($widget.displaySize.height - 20) / 13
                        })()
                    } : { maxHeight: Infinity })
                }, props.ext)
            })
        }
        return {
            type: "vstack",
            modifiers: [
                Object.assign({
                    background: $color("clear"),
                    color: $color("primaryText"),
                    padding: 2
                }, props.box),
                {
                    frame: {
                        maxWidth: Infinity,
                        maxHeight: Infinity
                    },
                    cornerRadius: 5
                }
            ],
            views: views
        }
    }

    /**
     * 周指示器模板
     */
    weekIndexTemplate() {
        const title = []
        for (let i = 0; i < 7; i++) {
            title.push(this.dayTemplate(this.localizedWeek(i), {
                text: { color: $color(this.colorTone) }
            }))
        }
        return title
    }

    formatCalendar(family, calendarInfo, hasExtra) {
        const calendar = calendarInfo.calendar
        const days = []
        for (let line of calendar) { // 设置不同日期显示不同样式
            for (let date of line) {
                date = this.formatDay(date, calendarInfo, hasExtra)
                days.push(this.dayTemplate(date.date, date.props, date.extra, family))
            }
        }
        const weekTitle = this.weekIndexTemplate()
        return { // 返回完整视图
            type: "vgrid",
            props: {
                columns: Array(7).fill({
                    flexible: {
                        minimum: 0,
                        maximum: Infinity
                    },
                    spacing: 0
                }),
                spacing: 0,
                frame: {
                    maxWidth: Infinity,
                    maxHeight: Infinity
                }
            },
            views: weekTitle.concat(days)
        }
    }

    titleBarTemplate(family, calendarInfo) {
        // 标题栏文字内容
        let content
        let left = "", right = ""
        if (this.titleYear) {
            let year = !this.titleFullYear ? String(calendarInfo.year).slice(-2) + $l10n("YEAR") : calendarInfo.year + $l10n("YEAR")
            left = year + this.localizedMonth(calendarInfo.month)
        } else {
            left = this.localizedMonth(calendarInfo.month)
        }
        if (this.titleLunar) {
            right = this.lunar.lunarMonth + "月" + this.lunar.lunarDay
            if (this.titleLunarYear) right = this.lunar.lunarYear + "年" + right
        }
        content = {
            left: left,
            right: right,
            size: family === this.setting.family.small ? 12 : 18
        }
        return {
            type: "hstack",
            props: {
                frame: {
                    maxWidth: Infinity,
                    maxHeight: Infinity
                },
                padding: (() => {
                    switch (family) {
                        case this.setting.family.small:
                            return $insets(0, 3, 0, 3)
                        case this.setting.family.meduim:
                            return $insets(0, 10, 0, 10)
                        case this.setting.family.large:
                            return $insets(0, 10, 0, 10)
                    }
                })()
            },
            views: [
                {
                    type: "text",
                    props: {
                        text: content.left,
                        lineLimit: 1,
                        color: $color(this.colorTone),
                        font: $font("bold", content.size),
                        frame: {
                            alignment: $widget.alignment.leading,
                            maxWidth: Infinity,
                            height: Infinity
                        }
                    }
                },
                {
                    type: "text",
                    props: {
                        text: content.right,
                        lineLimit: 1,
                        color: $color(this.colorTone),
                        font: $font("bold", content.size),
                        frame: {
                            alignment: $widget.alignment.trailing,
                            maxWidth: Infinity,
                            height: Infinity
                        }
                    }
                }
            ]
        }
    }

    calendarView(family, reviseFamily) {
        const calendarInfo = this.getCalendar(family === this.setting.family.large)
        const calendar = this.formatCalendar(family, calendarInfo, family !== this.setting.family.small)
        const titleBar = this.titleBarTemplate(family, calendarInfo)
        return {
            type: "vstack",
            props: Object.assign({
                frame: {
                    maxWidth: Infinity,
                    maxHeight: Infinity
                },
                spacing: 0,
                padding: 10
            }, reviseFamily === this.setting.family.medium ? {
                link: this.setting.settingUrlScheme
            } : {
                    widgetURL: this.setting.settingUrlScheme
                },
                $file.exists(this.backgroundImage) ? {
                    background: {
                        type: "image",
                        props: {
                            image: $image(this.backgroundImage),
                            resizable: true,
                            scaledToFill: true
                        }
                    }
                } : {}
            ),
            views: this.titleAddSpacer ? [
                { type: "spacer" }, titleBar, { type: "spacer" }, calendar, { type: "spacer" }
            ] : [
                    { type: "spacer" }, titleBar, calendar, { type: "spacer" }
                ]
        }
    }

    weekView(family) {
        const weekView = this.getCalendar(true, false)
        const days = []
        for (let date of weekView.calendar) {
            date = this.formatDay(date, weekView, true)
            days.push(this.dayTemplate(date.date, date.props, date.extra))
        }
        const weekTitle = this.weekIndexTemplate()
        const calendar = {
            type: "vgrid",
            props: {
                columns: Array(7).fill({
                    flexible: {
                        minimum: 0,
                        maximum: Infinity
                    },
                    spacing: 0
                }),
                spacing: 5,
                frame: {
                    maxWidth: Infinity,
                    maxHeight: Infinity
                },
                padding: $insets(0, 3, 0, 3)
            },
            views: weekTitle.concat(days)
        }
        const titleBar = this.titleBarTemplate(family, weekView)
        return {
            type: "vstack",
            props: Object.assign({
                frame: {
                    maxWidth: Infinity,
                    maxHeight: Infinity
                },
                spacing: 0,
                padding: 10
            }, family === this.setting.family.medium ? {
                link: this.setting.settingUrlScheme
            } : {
                    widgetURL: this.setting.settingUrlScheme
                },
                $file.exists(this.backgroundImage) ? {
                    background: {
                        type: "image",
                        props: {
                            image: $image(this.backgroundImage),
                            resizable: true,
                            scaledToFill: true
                        }
                    }
                } : {}
            ),
            views: [{ type: "spacer" }, titleBar, { type: "spacer" }, calendar, { type: "spacer" }]
        }
    }
}

module.exports = Calendar