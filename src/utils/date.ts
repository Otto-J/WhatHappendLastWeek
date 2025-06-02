import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek.js'
import weekOfYear from 'dayjs/plugin/weekOfYear.js'

dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)

export function getLastWeek() {
  const now = dayjs()
  const lastWeek = now.subtract(1, 'week')
  const startOfLastWeek = lastWeek.startOf('isoWeek')
  const endOfLastWeek = lastWeek.endOf('isoWeek')
  const weekNumber = lastWeek.isoWeek()
  return {
    startOfLastWeek,
    endOfLastWeek,
    weekNumber,
  }
}

// parseWeekNumber
export function parseWeekNumber(weekNumber: number) {
  return {
    startOfWeek: dayjs().isoWeek(weekNumber).startOf('isoWeek'),
    endOfWeek: dayjs().isoWeek(weekNumber).endOf('isoWeek'),
  }
}
