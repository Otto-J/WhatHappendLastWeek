import { existsSync, readdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
// @ts-expect-error: jstoxml does not have type declarations
import { toXML } from 'jstoxml'
import { getLastWeeksRssUpdates } from './lastWeek' // Assuming this script is in the same /scripts directory
import { getWeekNumber, parseWeekNumber } from '../src/utils/date' // Utility to get current week if needed

const RESULTS_DIR = path.resolve(process.cwd(), 'results')
const RSS_FILE_PATH = path.resolve(process.cwd(), 'rss.xml')

async function getLatestJsonData() {
  const files = readdirSync(RESULTS_DIR)
    .filter(file => file.endsWith('.json') && !isNaN(parseInt(file.split('.')[0])))
    .sort((a, b) => parseInt(b.split('.')[0]) - parseInt(a.split('.')[0]));

  if (files.length === 0) {
    console.log('No JSON files found in results directory. Fetching data for the current week.');
    const { weekNumber } = getWeekNumber(new Date()); // Get current week number
    return getLastWeeksRssUpdates(weekNumber);
  }

  const latestFile = files[0];
  const filePath = path.join(RESULTS_DIR, latestFile);
  console.log(`Using latest JSON file: ${latestFile}`);
  const fileContent = await readFile(filePath, 'utf-8');
  return JSON.parse(fileContent);
}

async function generateRss() {
  try {
    const json = await getLatestJsonData();

    if (!json || !json.results) {
      console.error('Failed to get valid JSON data.');
      return;
    }

    const channelItems = json.results.flatMap((feed: any) =>
      (feed.data as any[]).map((item: any) => {
        // Try to find a publication date. Fallback to start of week.
        // Ideally, each item in lastWeek.ts would also store its original pubDate.
        // For now, we'll use the startOfWeek for all items in the feed for simplicity,
        // or a more specific date if available (e.g. item.isoDate or item.pubDate from original feed processing)
        // The current structure of results/xx.json does not store individual item pubDates.
        // We will use startOfWeek as a general pubDate for the items of that week.
        const itemPubDate = new Date(json.startOfWeek).toUTCString();

        return {
          item: {
            title: item.itemTitle || 'No Title',
            link: item.itemLink || '',
            description: item.showNotes || item.itemTitle || 'No Description', // Use showNotes as description
            pubDate: itemPubDate,
            guid: item.itemLink || item.media || `${json.weekNumber}-${feed.feedTitle}-${item.itemTitle}`, // Unique GUID
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
        };
      })
    );

    // Filter out items that might be empty if a feed had an error or no data
    const validChannelItems = channelItems.filter((channelItem: any) => channelItem.item.title !== 'No Title');


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
                href: 'https://<your-domain-here>/rss.xml', // Replace with actual link to where rss.xml will be hosted
                rel: 'self',
                type: 'application/rss+xml',
              },
            },
          },
          { title: 'Weekly Podcast Updates' }, // General title for the feed
          { link: 'https://<your-project-link-here>' }, // Link to the project or website
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
    };

    const xmlContent = toXML(rssObj, { header: true, indent: '  ' });
    await writeFile(RSS_FILE_PATH, xmlContent, 'utf-8');
    console.log(`Successfully generated rss.xml for week ${json.weekNumber}`);

  } catch (e) {
    console.error('Failed to generate RSS feed:', e);
    process.exit(1);
  }
}

generateRss();
