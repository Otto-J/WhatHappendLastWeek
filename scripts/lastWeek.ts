import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek.js'
import weekOfYear from 'dayjs/plugin/weekOfYear.js'
import debug from 'debug'
import Parser from 'rss-parser'
import { chunkArray } from '../src/utils/array'
import { parseWeekNumber } from '../src/utils/date'

process.env.DEBUG = process.env.DEBUG || '*'

dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)

// const rssList3 = ['https://rss.art19.com/whiskey-web-and-whatnot']
const rssList = [
  // whiskey
  'https://rss.art19.com/whiskey-web-and-whatnot',
  // this dot labs
  'https://www.thisdot.co/rss.xml',
  // shop talk
  'https://shoptalkshow.com/feed/podcast/default-podcast/',
  // soft skills engineering
  'https://softskills.audio/feed.xml',
  // front end fire
  'https://feeds.buzzsprout.com/2226499.rss',
  // modern web
  'https://anchor.fm/s/f9191780/podcast/rss',
  // indie bites
  'https://feeds.transistor.fm/indie-bites',
  // stack overflow podcast: oh 这个不是标准的 rss，而且频率也太高了
  // "https://stackoverflow.blog/feed",
  'https://anchor.fm/s/dd6922b4/podcast/rss',
  'https://anchor.fm/s/4c227378/podcast/rss',
  'http://feeds.feedburner.com/Http203Podcast',
  'https://feeds.simplecast.com/sOJAMohP',
  'https://feeds.transistor.fm/svelte-radio',
  'https://changelog.com/jsparty/feed',
  'https://feeds.fireside.fm/podrocket/rss',
  'https://feeds.simplecast.com/tOjNXec5',
  'https://www.heavybit.com/category/library/podcasts/jamstack-radio/feed/feed.rss',
  'https://www.spreaker.com/show/6102064/episodes/feed',
  'https://feeds.transistor.fm/dejavue',
  'https://feed.syntax.fm/',
  'https://anchor.fm/s/d279c1b0/podcast/rss',
  'https://anchor.fm/s/fb57a4a8/podcast/rss',
  'https://feeds.libsyn.com/492353/rss',
  'https://thecsspodcast.libsyn.com/rss',
]

const parser = new Parser({
  customFields: {
    item: [['media:content', 'media', { keepArray: false }]],
  },
  timeout: 10 * 1000,
})

const log = debug('fetchLastWeekPodcast')

export async function getLastWeeksRssUpdates(weekNumber: number) {
  const { startOfWeek, endOfWeek } = parseWeekNumber(weekNumber)
  log(
    `开始获取第${weekNumber}周（${startOfWeek.format(
      'YYYY-MM-DD',
    )}~${endOfWeek.format('YYYY-MM-DD')})的播客更新`,
  )
  // 分组处理，每组n个，组间串行
  const chunkedFeeds = chunkArray(rssList, 1)
  const results = []

  for (const group of chunkedFeeds) {
    log(`处理分组: ${group}`)
    const groupResults = await Promise.all(
      group.map(async (feedUrl) => {
        log(`拉取 RSS: ${feedUrl}`)
        try {
          const feed = await parser.parseURL(feedUrl)
          const feedTitle = feed.title || '未知源标题'
          if (feed && feed.items) {
            const weeklyItems = feed.items.filter((item) => {
              const dateStr = item.isoDate || item.pubDate || null
              if (!dateStr)
                return false
              const itemDate = dayjs(dateStr)
              return (
                itemDate.isValid()
                && (itemDate.isAfter(startOfWeek)
                  || itemDate.isSame(startOfWeek, 'day'))
                && (itemDate.isBefore(endOfWeek)
                  || itemDate.isSame(endOfWeek, 'day'))
              )
            })

            log(`${feedTitle} 有 ${weeklyItems.length} 条本周更新`)
            if (weeklyItems.length > 0) {
              const data = weeklyItems.map((item) => {
                let mediaUrl = null
                if (item.media && item.media.$ && item.media.$.url) {
                  mediaUrl = item.media.$.url
                }
                else if (item.enclosure && item.enclosure.url) {
                  mediaUrl = item.enclosure.url
                }

                return {
                  itemTitle: item.title || '未知条目标题',
                  media: mediaUrl || null,
                  showNotes: item.contentSnippet || (item as any)['content:encodedSnippet'] || item.content || (item as any)['content:encoded'] || null,
                  itemLink: item.link || feed.link || feed.feedUrl,
                }
              })
              return {
                feedTitle,
                updateStatus: data.length,
                data,
              }
            }
            else {
              // 无更新
              return {
                feedTitle,
                updateStatus: 0,
                data: [],
              }
            }
          }
          else {
            // 没有 items 也算无更新
            log(`${feedTitle} 没有 items 字段`)
            return {
              feedTitle,
              updateStatus: -1,
              data: [],
            }
          }
        }
        catch (error) {
          log(`拉取失败: ${feedUrl}, 错误: ${error}`)
          // 访问失败
          return {
            feedTitle: feedUrl, // 失败时用 url 作为标题
            updateStatus: -1,
            data: [],
          }
        }
      }),
    )
    results.push(...groupResults)
  }

  log(`全部处理完成，共 ${results.length} 个源`)
  return {
    startOfWeek: startOfWeek.format('YYYY-MM-DD'),
    weekNumber,
    availableItems: results.reduce((acc, curr) => {
      // 如果为 -1 就跳过
      if (curr.updateStatus < 0) {
        return acc
      }

      return acc + curr.updateStatus
    }, 0),
    results, // 这里返回新的结构
  }
}
