import dayjs from 'dayjs'

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
