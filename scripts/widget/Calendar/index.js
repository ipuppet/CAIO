const Widget = require("../widget")
const CalendarSetting = require("./setting")
const Calendar = require("./calendar")

class CalendarWidget extends Widget {
    constructor(kernel) {
        super(kernel, new CalendarSetting(kernel))
        this.calendar = new Calendar(this.kernel, this.setting)
        this.cacheLife = 1000 * 60 * 60 * 24
        this.cacheDateStartFromZero = true
    }

    view2x2(family = this.setting.family.small) {
        return this.calendar.calendarView(this.setting.family.small, family)
    }

    view2x4() {
        return this.calendar.weekView(this.setting.family.meduim)
    }

    view4x4() {
        return this.calendar.calendarView(this.setting.family.large)
    }

    render() {
        const midnight = new Date()
        midnight.setHours(0, 0, 0, 0)
        const expireDate = new Date(midnight.getTime() + 60 * 60 * 24 * 1000)
        $widget.setTimeline({
            entries: [
                {
                    date: new Date(),
                    info: {}
                }
            ],
            policy: {
                afterDate: expireDate
            },
            render: ctx => {
                let view
                switch (ctx.family) {
                    case 0:
                        view = this.view2x2()
                        break
                    case 1:
                        view = this.view2x4()
                        break
                    case 2:
                        view = this.view4x4()
                        break
                    default:
                        view = this.errorView
                }
                this.printTimeConsuming()
                return view
            }
        })
    }
}

module.exports = {
    Widget: CalendarWidget
}