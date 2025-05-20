import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
// @ts-expect-error: jstoxml 没有类型声明
import { toXML } from 'jstoxml'
import { getLastWeeksRssUpdates } from '../../scripts/lastWeek'
import { getLastWeek } from '../utils/date'

const RESULTS_DIR = path.resolve(process.cwd(), 'results')

export async function rss(ctx: any) {
  try {
    const { weekNumber } = getLastWeek()
    const filePath = path.join(RESULTS_DIR, `${weekNumber}.json`)
    let json
    if (existsSync(filePath)) {
      json = JSON.parse(await readFile(filePath, 'utf-8'))
    }
    else {
      const result = await getLastWeeksRssUpdates(weekNumber)
      json = result
      await writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8')
    }
    const rssObj = {
      _name: 'rss',
      _attrs: {
        'version': '2.0',
        'xmlns:itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
      },
      _content: {
        channel: [
          { title: 'What Happened Last Week' },
          { link: 'https://your-domain.com/rss' },
          { language: 'zh-cn' },
          {
            description: `播客周报，周数：${json.weekNumber}，起始：${json.startOfWeek}`,
          },
          ...json.results.flatMap((feed: any) =>
            (feed.data as any[]).map((item: any) => ({
              item: {
                'title': item.itemTitle,
                'description': item.itemTitle,
                ...(item.media
                  ? {
                      enclosure: {
                        _attrs: {
                          url: item.media,
                          type: 'audio/mpeg',
                        },
                      },
                    }
                  : {}),
                'itunes:author': feed.feedTitle,
              },
            })),
          ),
        ],
      },
    }
    ctx.set.headers['content-type'] = 'application/xml; charset=utf-8'
    return toXML(rssObj, { header: true, indent: '  ' })
  }
  catch (e) {
    ctx.set.status = 500
    return `RSS 生成失败: ${e}`
  }
}
