import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs'
import path from 'node:path'
import debug from 'debug'
import { fetchMp3 } from '../src/service/fetchMp3'

const log = debug('downloadMp3sToLocal')

const MEDIA_DIR = path.resolve(process.cwd(), 'media')
const TEMP_MEDIA_DIR = path.resolve(process.cwd(), 'temp-media')
async function main() {
  const res = await fetchMp3({})
  if (res.status) {
    console.log('下载成功')
    // mv media/week 到 temp-media 目录
    const week = res.week
    const mediaDir = path.join(MEDIA_DIR, String(week))
    if (!existsSync(mediaDir)) {
      log('media 目录不存在，创建', mediaDir)
      mkdirSync(mediaDir, { recursive: true })
    }

    // 将 media/week 目录下的所有文件移动到 temp-media 目录
    execSync(`mv ${mediaDir}/* ${TEMP_MEDIA_DIR}`)
    // 循环 media/week 所有文件，文件开头添加 week_ 前缀
    const files = readdirSync(TEMP_MEDIA_DIR)
    for (const file of files) {
      // renameSync(path.join(mediaDir, file), path.join(TEMP_MEDIA_DIR, `week_${file}`))
      renameSync(path.join(TEMP_MEDIA_DIR, file), path.join(TEMP_MEDIA_DIR, `${week}_${file}`))
    }
  }
  else {
    console.log('下载失败', res.msg)
    process.exit(1)
  }
}

main()
