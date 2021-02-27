const Widget = require("../widget")
const ScheduleSetting = require("./setting")
const Schedule = require("./schedule")

class ScheduleWidget extends Widget {
    constructor(kernel) {
        super(kernel, new ScheduleSetting(kernel))
        this.schedule = new Schedule(this.kernel, this.setting)
        this.timeSpan = this.setting.get("timeSpan")
    }

    async getCalendar(startDate, hours, nowDate) {
        const res = []
        const calendar = await $calendar.fetch({
            startDate: startDate,
            hours: hours
        })
        // 未过期日程
        calendar.events.forEach(item => {
            if (item.endDate >= nowDate) {
                res.push(item)
            }
        })
        return res
    }

    async getReminder(startDate, hours) {
        const res = []
        const reminder = await $reminder.fetch({
            startDate: startDate,
            hours: hours
        })
        // 未完成提醒事项
        reminder.events.forEach(item => {
            if (!item.completed) {
                res.push(item)
            }
        })
        return res
    }

    view2x2() {
        return this.schedule.scheduleView(this.setting.family.small)
    }

    view2x4() {
        return this.schedule.scheduleView(this.setting.family.medium)
    }

    async render() {
        const nowDate = new Date()
        const expireDate = new Date(nowDate + this.cacheLife)
        // 获取数据
        const startDate = new Date().setDate(nowDate.getDate() - parseInt(this.timeSpan / 2))
        const hours = this.timeSpan * 24
        const calendar = await this.getCalendar(startDate, hours, nowDate)
        const reminder = await this.getReminder(startDate, hours)
        this.schedule.setData(calendar, reminder)
        $widget.setTimeline({
            entries: [
                {
                    date: nowDate,
                    info: {}
                }
            ],
            policy: {
                afterDate: expireDate
            },
            render: ctx => {
                // 获取视图
                let view
                if (ctx.family === this.setting.family.small) {
                    view = this.view2x2()
                } else {
                    view = this.view2x4()
                }
                this.printTimeConsuming()
                return view
            }
        })
    }
}

module.exports = {
    Widget: ScheduleWidget
}