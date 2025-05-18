process.env.DEBUG = process.env.DEBUG || "*";
import Parser from "rss-parser";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear.js";
import isoWeek from "dayjs/plugin/isoWeek.js";
import { getLastWeek, parseWeekNumber } from "../src/utils/date";
import { chunkArray } from "../src/utils/array";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const rssList = [
  // whiskey
  "https://rss.art19.com/whiskey-web-and-whatnot",
  // this dot labs
  "https://www.thisdot.co/rss.xml",
  // shop talk
  "https://shoptalkshow.com/feed/podcast/default-podcast/",
  // soft skills engineering
  "https://softskills.audio/feed.xml",
  // front end fire
  "https://feeds.buzzsprout.com/2226499.rss",
  // modern web
  "https://anchor.fm/s/f9191780/podcast/rss",
  // indie bites
  "https://feeds.transistor.fm/indie-bites",
  // stack overflow podcast
  "https://stackoverflow.blog/feed",
  "https://anchor.fm/s/dd6922b4/podcast/rss",
  "https://anchor.fm/s/4c227378/podcast/rss",
  "http://feeds.feedburner.com/Http203Podcast",
  "https://feeds.simplecast.com/sOJAMohP",
  "https://feeds.transistor.fm/svelte-radio",
  "https://changelog.com/jsparty/feed",
  "https://feeds.fireside.fm/podrocket/rss",
  "https://feeds.simplecast.com/tOjNXec5",
  "https://www.heavybit.com/category/library/podcasts/jamstack-radio/feed/feed.rss",
  "https://www.spreaker.com/show/6102064/episodes/feed",
  "https://feeds.transistor.fm/dejavue",
  "https://feed.syntax.fm/",
  "https://anchor.fm/s/d279c1b0/podcast/rss",
  "https://anchor.fm/s/fb57a4a8/podcast/rss",
  "https://feeds.libsyn.com/492353/rss",
  "https://thecsspodcast.libsyn.com/rss",
];

const parser = new Parser({
  customFields: {
    item: [["media:content", "media", { keepArray: false }]],
  },
});

export async function getLastWeeksRssUpdates(weekNumber: number) {
  const { startOfWeek, endOfWeek } = parseWeekNumber(weekNumber);
  // 分组处理，每组3个，组间串行
  const chunkedFeeds = chunkArray(rssList, 3); // 每组3个
  const results = [];

  for (const group of chunkedFeeds) {
    const groupResults = await Promise.all(
      group.map(async (feedUrl) => {
        try {
          const feed = await parser.parseURL(feedUrl);
          let feedTitle = feed.title || "未知源标题";
          if (feed && feed.items) {
            const weeklyItems = feed.items.filter((item) => {
              let dateStr = item.isoDate || item.pubDate || null;
              if (!dateStr) return false;
              const itemDate = dayjs(dateStr);
              return (
                itemDate.isValid() &&
                (itemDate.isAfter(startOfWeek) ||
                  itemDate.isSame(startOfWeek, "day")) &&
                (itemDate.isBefore(endOfWeek) ||
                  itemDate.isSame(endOfWeek, "day"))
              );
            });

            if (weeklyItems.length > 0) {
              const data = weeklyItems.map((item) => {
                let mediaUrl = null;
                if (item.media && item.media.$ && item.media.$.url) {
                  mediaUrl = item.media.$.url;
                } else if (item.enclosure && item.enclosure.url) {
                  mediaUrl = item.enclosure.url;
                } else if (item["itunes:image"] && item["itunes:image"].href) {
                  mediaUrl = item["itunes:image"].href;
                }
                return {
                  itemTitle: item.title || "未知条目标题",
                  media: mediaUrl || null,
                };
              });
              return {
                feedTitle,
                updateStatus: data.length,
                data,
              };
            } else {
              // 无更新
              return {
                feedTitle,
                updateStatus: 0,
                data: [],
              };
            }
          } else {
            // 没有 items 也算无更新
            return {
              feedTitle,
              updateStatus: 0,
              data: [],
            };
          }
        } catch (error) {
          // 访问失败
          return {
            feedTitle: feedUrl, // 失败时用 url 作为标题
            updateStatus: -1,
            data: [],
          };
        }
      })
    );
    results.push(...groupResults);
  }

  return {
    startOfWeek: startOfWeek.format("YYYY-MM-DD"),
    weekNumber,
    results, // 这里返回新的结构
  };
}
