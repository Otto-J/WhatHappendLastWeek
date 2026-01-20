import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import debug from 'debug'
// @ts-expect-error: jstoxml does not have type declarations
import { toXML } from 'jstoxml'
import { getLastWeek } from '../src/utils/date' // Utility to get current week if needed
import { getLastWeeksRssUpdates } from './lastWeek' // Assuming this script is in the same /scripts directory

// 确保始终启用日志，如果没有设置DEBUG环境变量
process.env.DEBUG = process.env.DEBUG || 'rss'

const RESULTS_DIR = path.resolve(process.cwd(), 'results')
const log = debug('rss')

async function getJsonDataByWeekNumber(weekNumber: number) {
  const jsonFilePath = path.join(RESULTS_DIR, `${weekNumber}.json`)

  try {
    log(`Looking for JSON file: ${weekNumber}.json`)
    const fileContent = await readFile(jsonFilePath, 'utf-8')
    return JSON.parse(fileContent)
  }
  catch {
    log(`No JSON file found for week ${weekNumber}. Fetching data for this week.`)
    return getLastWeeksRssUpdates(weekNumber)
  }
}

async function generateRss() {
  try {
    // Get the last week's data based on getLastWeek()
    const { weekNumber } = getLastWeek()
    const json = await getJsonDataByWeekNumber(weekNumber)

    if (!json || !json.results) {
      log('Failed to get valid JSON data.')
      return
    }

    const channelItems = json.results.flatMap((feed: any) =>
      (feed.data as any[]).map((item: any) => {
        // Use the real pubDate from the item, fallback to start of week if not available
        const itemPubDate = item.pubDate
          ? new Date(item.pubDate).toUTCString()
          : new Date(json.startOfWeek).toUTCString()

        return {
          item: {
            'title': item.itemTitle || 'No Title',
            'link': item.itemLink || '',
            'description': item.showNotes || item.itemTitle || 'No Description', // Use showNotes as description
            'pubDate': itemPubDate,
            'guid': item.itemLink || item.media || `${json.weekNumber}-${feed.feedTitle}-${item.itemTitle}`, // Unique GUID
            ...(item.media
              ? {
                  enclosure: {
                    _attrs: {
                      url: item.media,
                      type: 'audio/mpeg', // Assuming audio/mpeg, might need to be dynamic if other types are possible
                      length: 0, // RSS best practice is to include length, but we don't have it. Set to 0.
                    },
                  },
                }
              : {}),
            'itunes:author': feed.feedTitle,
            'itunes:summary': item.showNotes || item.itemTitle,
            'itunes:explicit': 'no', // Assuming content is not explicit
            // 'itunes:duration': 'HH:MM:SS', // We don't have duration
          },
        }
      }),
    )

    // Filter out items that might be empty if a feed had an error or no data
    const validChannelItems = channelItems.filter((channelItem: any) => channelItem.item.title !== 'No Title')

    const rssObj = {
      _name: 'rss',
      _attrs: {
        'version': '2.0',
        'xmlns:atom': 'http://www.w3.org/2005/Atom',
        'xmlns:itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
        'xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
      },
      _content: {
        channel: [
          {
            'atom:link': {
              _attrs: {
                href: '/rss.xml',
                rel: 'self',
                type: 'application/rss+xml',
              },
            },
          },
          { title: 'Weekly Podcast Updates' }, // General title for the feed
          { link: '/' }, // Link to the project or website
          { language: 'en-us' }, // Assuming English, adjust if needed. The original issue was in Chinese, but the content seems to be English.
          { description: `Weekly digest of podcast episodes from week ${json.weekNumber}, starting ${json.startOfWeek}.` },
          { lastBuildDate: new Date().toUTCString() },
          { pubDate: new Date(json.startOfWeek).toUTCString() }, // Publication date of the feed itself
          // TODO: Add other optional channel elements like image, category, etc.
          // 'itunes:author': 'Your Name/Organization',
          // 'itunes:owner': {
          //   'itunes:name': 'Owner Name',
          //   'itunes:email': 'owner@example.com',
          // },
          // 'itunes:image': {
          //   _attrs: {
          //     href: 'https://<link-to-your-podcast-image.png>',
          //   },
          // },
          // 'itunes:category': {
          //   _attrs: {
          //     text: 'Technology', // Example category
          //   },
          // },
          // 'itunes:explicit': 'no',
          ...validChannelItems,
        ],
      },
    }

    let xmlContent = toXML(rssObj, { header: true, indent: '  ' })

    // Add XSL stylesheet reference after XML declaration
    const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>'
    const xslStylesheet = '<?xml-stylesheet type="text/xsl" href="feed.xsl"?>'
    xmlContent = xmlContent.replace(xmlDeclaration, `${xmlDeclaration}\n${xslStylesheet}`)

    // Save both the main rss.xml and a week-specific version in results
    const mainRssPath = path.resolve(process.cwd(), 'rss.xml')
    const weekRssPath = path.join(RESULTS_DIR, `${weekNumber}.xml`)

    await writeFile(mainRssPath, xmlContent, 'utf-8')
    await writeFile(weekRssPath, xmlContent, 'utf-8')

    log(`Successfully generated rss.xml for week ${json.weekNumber}`)
    log(`Also saved as ${weekNumber}.xml in results directory`)
  }
  catch (e) {
    log('Failed to generate RSS feed:', e)
    process.exit(1)
  }
}

generateRss()
