import type { Buffer } from 'node:buffer'
import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pipeline, Readable } from 'node:stream'
import { promisify } from 'node:util'
import debug from 'debug'
import { chunkArray } from '../utils/array'
import { getLastWeek } from '../utils/date'

const RESULTS_DIR = path.resolve(process.cwd(), 'results')
const MEDIA_DIR = path.resolve(process.cwd(), 'media')
const streamPipeline = promisify(pipeline)

function sanitizeFileName(str: string) {
  return str
    .replace(/\s+/g, '-')
    .replace(/[^-\u4E00-\u9FA5\w]/g, '')
    .replace(/-+/g, '-')
}

async function downloadFile(url: string, dest: string) {
  const res = await fetch(url)
  if (!res.ok || !res.body)
    throw new Error(`下载失败: ${res.statusText}`)
  const total = Number(res.headers.get('content-length')) || 0
  let downloaded = 0
  let lastLogged = 0
  let lastPrintTime = Date.now()
  const nodeStream = (res.body as any).pipe
    ? res.body as Readable
    : Readable.fromWeb(res.body as ReadableStream)
  const fileStream = createWriteStream(dest)
  nodeStream.on('data', (chunk: Buffer) => {
    downloaded += chunk.length
    const now = Date.now()
    let shouldPrint = false
    if (now - lastPrintTime >= 2000) {
      shouldPrint = true
      lastPrintTime = now
    }
    if (total) {
      const percent = Math.floor((downloaded / total) * 100)
      if (
        (percent >= lastLogged + 10
          || downloaded - lastLogged >= 1024 * 1024)
        && shouldPrint
      ) {
        lastLogged = percent
        console.log(
          `下载进度: ${percent}% (${(downloaded / 1024 / 1024).toFixed(2)}MB/${(
            total
            / 1024
            / 1024
          ).toFixed(2)}MB)`,
        )
      }
    }
    else {
      if (downloaded - lastLogged >= 1024 * 1024 && shouldPrint) {
        lastLogged = downloaded
        console.log(`已下载: ${(downloaded / 1024 / 1024).toFixed(2)}MB`)
      }
    }
  })
  await streamPipeline(nodeStream, fileStream)
  console.log('下载完成:', dest)
}

export async function fetchMp3(ctx: any) {
  const log = debug('fetchMp3')
  log('收到 fetchMp3 请求', ctx.body)
  try {
    const week
      = (ctx.body && (ctx.body as any).weekNumber) ?? getLastWeek().weekNumber
    log('使用的 weekNumber', week)
    const resultFile = path.join(RESULTS_DIR, `${week}.json`)
    let json
    if (existsSync(resultFile)) {
      log('结果文件已存在，直接读取', resultFile)
      json = JSON.parse(await readFile(resultFile, 'utf-8'))
    }
    else {
      log('结果文件不存在，调用 /fetchLastWeekPodcast 接口获取数据')
      const res = await fetch('http://localhost:3000/fetchLastWeekPodcast', {
        method: 'POST',
      })
      log('ok 调用 /fetchLastWeekPodcast 接口获取数据')
      json = await res.json()
    }
    const { results } = json
    if (!results) {
      log('无 results 数据')
      return { status: false, msg: '无 results 数据' }
    }
    const tasks: {
      feedTitle: string
      itemTitle: string
      media: string
      itemLink: string
    }[] = []
    for (const feed of results) {
      for (const item of feed.data) {
        if (item.media) {
          tasks.push({
            feedTitle: feed.feedTitle,
            itemTitle: item.itemTitle,
            media: item.media,
            itemLink: item.itemLink,
          })
        }
      }
    }
    log(`共找到 ${tasks.length} 个 media 下载任务`)
    const chunked = chunkArray(
      tasks.map(t => t.media),
      1,
    )
    const mediaDir = path.join(MEDIA_DIR, String(week))
    if (!existsSync(mediaDir)) {
      log('media 目录不存在，创建', mediaDir)
      await mkdir(mediaDir, { recursive: true })
    }
    const success = []
    const failed = []
    for (const group of chunked) {
      log(`开始下载分组: ${group}`)
      const groupResults = await Promise.all(
        group.map(async (media) => {
          const task = tasks.find(t => t.media === media)
          if (!task) {
            log('未找到原始信息', media)
            return { media, status: 'failed', error: '未找到原始信息' }
          }
          const { feedTitle, itemTitle } = task!
          const fileName = `${sanitizeFileName(
            feedTitle,
          )}_${week}_${sanitizeFileName(itemTitle)}`
          const ext = media.split('.').pop()?.split('?')[0] || 'mp3'
          const filePath = path.join(mediaDir, `${fileName}.${ext}`)
          if (existsSync(filePath)) {
            log('文件已存在，跳过下载', filePath)
            return { feedTitle, itemTitle, media, status: 'skipped' }
          }
          try {
            log('开始下载', media, '到', filePath)
            await downloadFile(media, filePath)
            log('下载成功', filePath)
            return { feedTitle, itemTitle, media, status: 'success' }
          }
          catch (e) {
            log('下载失败', media, e)
            return {
              feedTitle,
              itemTitle,
              media,
              status: 'failed',
              error: String(e),
            }
          }
        }),
      )
      for (const r of groupResults) {
        if (r.status === 'success' || r.status === 'skipped')
          success.push(r)
        else failed.push(r)
      }
    }
    log('下载完成，成功：', success.length, '失败：', failed.length)
    return { status: true, week, success, failed }
  }
  catch (e) {
    log('fetchMp3 处理异常', e)
    return { status: false, msg: String(e) }
  }
}
