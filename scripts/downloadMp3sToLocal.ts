import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fetchMp3 } from '../src/service/fetchMp3'

const MEDIA_DIR = path.resolve(process.cwd(), 'media')
const TEMP_MEDIA_DIR = path.resolve(process.cwd(), 'temp-media')
async function main() {
  const res = await fetchMp3({
    body: {},
  })
  if (res.status) {
    console.log('下载所有音频成功,week:', res.week)
    // mv media/week 到 temp-media 目录
    const week = res.week
    const mediaDir = path.join(MEDIA_DIR, String(week))
    if (!existsSync(mediaDir)) {
      console.log('media 目录不存在，创建', mediaDir)
      mkdirSync(mediaDir, { recursive: true })
    }

    // 将 media/week 目录下的所有文件移动到 temp-media 目录
    console.log(`mv ${mediaDir}/* ${TEMP_MEDIA_DIR}`)
    execSync(`mv ${mediaDir}/* ${TEMP_MEDIA_DIR} && ls -l ${TEMP_MEDIA_DIR}`)
  }
  else {
    console.log('下载失败', res.msg)
    process.exit(1)
  }
}

main()
