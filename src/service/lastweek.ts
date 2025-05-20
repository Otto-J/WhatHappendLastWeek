import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getLastWeeksRssUpdates } from '../../scripts/lastWeek'
import { getLastWeek } from '../utils/date'

const RESULTS_DIR = path.resolve(process.cwd(), 'results')

export async function fetchLastWeekPodcast(): Promise<{
  status: boolean
  msg: string
  data: any
}> {
  try {
    const { weekNumber } = getLastWeek()
    const filePath = path.join(RESULTS_DIR, `${weekNumber}.json`)
    if (existsSync(filePath)) {
      const fileContent = await readFile(filePath, 'utf-8')
      const json = JSON.parse(fileContent)
      return {
        status: true,
        file: `${weekNumber}.json`,
        msg: '已存在，直接返回',
        ...json,
      }
    }
    const result = await getLastWeeksRssUpdates(weekNumber)
    if (!existsSync(RESULTS_DIR)) {
      await mkdir(RESULTS_DIR)
    }
    await writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8')
    return {
      status: true,
      msg: `${weekNumber}.json 写入成功`,
      data: result,
    }
  }
  catch (e) {
    return {
      status: false,
      data: null,
      msg:
        typeof e === 'object' && e && 'message' in e
          ? (e as any).message
          : String(e),
    }
  }
}
