import { Elysia } from "elysia";
import { getLastWeeksRssUpdates } from "../scripts/lastWeek";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync, createWriteStream } from "fs";
import path from "path";
import { getLastWeek } from "./utils/date";
import { chunkArray } from "./utils/array";
import { pipeline } from "stream";
import { promisify } from "util";
// @ts-expect-error: jstoxml 没有类型声明
import { toXML } from "jstoxml";

const RESULTS_DIR = path.resolve(process.cwd(), "results");
const MEDIA_DIR = path.resolve(process.cwd(), "media");

const app = new Elysia()
  .post("/lastweek", async (ctx) => {
    try {
      // 先获取本周 weekNumber
      const { weekNumber } = getLastWeek();

      const filePath = path.join(RESULTS_DIR, `${weekNumber}.json`);
      // 检查文件是否存在
      if (existsSync(filePath)) {
        // 直接读取并返回
        const fileContent = await readFile(filePath, "utf-8");
        const json = JSON.parse(fileContent);
        return {
          status: true,
          file: `${weekNumber}.json`,
          msg: "已存在，直接返回",
          ...json,
        };
      }
      // 获取数据
      const result = await getLastWeeksRssUpdates(weekNumber);
      // 确保 results 目录存在
      if (!existsSync(RESULTS_DIR)) {
        await mkdir(RESULTS_DIR);
      }
      // 写入文件
      await writeFile(filePath, JSON.stringify(result, null, 2), "utf-8");
      return {
        status: true,
        file: `${weekNumber}.json`,
        msg: "写入成功",
        ...result,
      };
    } catch (e) {
      return {
        status: false,
        msg:
          typeof e === "object" && e && "message" in e
            ? (e as any).message
            : String(e),
      };
    }
  })
  .get("/", () => "Hello Elysia")
  .post("/fetchMp3", async (ctx) => {
    try {
      const week =
        (ctx.body && (ctx.body as any).weekNumber) ?? getLastWeek().weekNumber;
      const resultFile = path.join(RESULTS_DIR, `${week}.json`);
      let json;
      if (existsSync(resultFile)) {
        json = JSON.parse(await readFile(resultFile, "utf-8"));
      } else {
        const res = await fetch("http://localhost:3000/lastweek", {
          method: "POST",
        });
        json = await res.json();
      }
      const { results } = json;
      if (!results) return { status: false, msg: "无 results 数据" };
      // 过滤所有 media
      let tasks: { feedTitle: string; itemTitle: string; media: string }[] = [];
      for (const feed of results) {
        for (const item of feed.data) {
          if (item.media) {
            tasks.push({
              feedTitle: feed.feedTitle,
              itemTitle: item.itemTitle,
              media: item.media,
            });
          }
        }
      }
      // 只分组 media url
      const chunked = chunkArray(
        tasks.map((t) => t.media),
        3
      );
      const mediaDir = path.join(MEDIA_DIR, String(week));
      if (!existsSync(mediaDir)) await mkdir(mediaDir, { recursive: true });
      let success = [],
        failed = [];
      for (const group of chunked) {
        const groupResults = await Promise.all(
          group.map(async (media) => {
            const task = tasks.find((t) => t.media === media);
            if (!task)
              return { media, status: "failed", error: "未找到原始信息" };
            const { feedTitle, itemTitle } = task!;
            const fileName = `${sanitizeFileName(
              feedTitle
            )}_${week}_${sanitizeFileName(itemTitle)}`;
            const ext = media.split(".").pop().split("?")[0] || "mp3";
            const filePath = path.join(mediaDir, `${fileName}.${ext}`);
            if (existsSync(filePath)) {
              return { feedTitle, itemTitle, media, status: "skipped" };
            }
            try {
              await downloadFile(media, filePath);
              return { feedTitle, itemTitle, media, status: "success" };
            } catch (e) {
              return {
                feedTitle,
                itemTitle,
                media,
                status: "failed",
                error: String(e),
              };
            }
          })
        );
        for (const r of groupResults) {
          if (r.status === "success" || r.status === "skipped") success.push(r);
          else failed.push(r);
        }
      }
      return { status: true, week, success, failed };
    } catch (e) {
      return { status: false, msg: String(e) };
    }
  })
  .get("/rss", async (ctx) => {
    try {
      // 获取上一周 weekNumber
      const { weekNumber } = getLastWeek();
      const filePath = path.join(RESULTS_DIR, `${weekNumber}.json`);
      let json;
      if (existsSync(filePath)) {
        json = JSON.parse(await readFile(filePath, "utf-8"));
      } else {
        // 兼容首次无缓存
        const result = await getLastWeeksRssUpdates(weekNumber);
        json = result;
        await writeFile(filePath, JSON.stringify(result, null, 2), "utf-8");
      }
      // 构造 RSS 2.0 结构
      const rssObj = {
        _name: "rss",
        _attrs: {
          version: "2.0",
          "xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
        },
        _content: {
          channel: [
            { title: "What Happened Last Week" },
            { link: "https://your-domain.com/rss" },
            { language: "zh-cn" },
            {
              description: `播客周报，周数：${json.weekNumber}，起始：${json.startOfWeek}`,
            },
            // 可选: { "itunes:author": "What Happened Last Week" },
            ...json.results.flatMap((feed: any) =>
              (feed.data as any[]).map((item: any) => ({
                item: {
                  title: item.itemTitle,
                  description: item.itemTitle,
                  ...(item.media
                    ? {
                        enclosure: {
                          _attrs: {
                            url: item.media,
                            type: "audio/mpeg",
                          },
                        },
                      }
                    : {}),
                  "itunes:author": feed.feedTitle,
                  // 可选: pubDate, guid 等
                },
              }))
            ),
          ],
        },
      };
      const xml = toXML(rssObj, { header: true, indent: "  " });
      ctx.set.headers["content-type"] = "application/xml; charset=utf-8";
      return xml;
    } catch (e) {
      ctx.set.status = 500;
      return `RSS 生成失败: ${e}`;
    }
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

function sanitizeFileName(str: string) {
  // 只保留中英文、数字、-、_，空格转-，其他去掉
  return str
    .replace(/\s+/g, "-")
    .replace(/[^\u4e00-\u9fa5\w\-]/g, "")
    .replace(/-+/g, "-");
}

const streamPipeline = promisify(pipeline);

async function downloadFile(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`下载失败: ${res.statusText}`);
  // Node fetch 返回的是 web ReadableStream，需要转成 Node.js Readable
  const nodeStream = (res.body as any).pipe
    ? res.body
    : require("stream").Readable.fromWeb(res.body);
  const fileStream = createWriteStream(dest);
  await streamPipeline(nodeStream, fileStream);
}
