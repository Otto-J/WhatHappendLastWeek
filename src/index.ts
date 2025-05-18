import { Elysia } from "elysia";
import { getLastWeeksRssUpdates } from "../scripts/lastWeek";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync, createWriteStream } from "fs";
import path from "path";
import { getLastWeek } from "./utils/date";
import { chunkArray } from "./utils/array";
import { pipeline } from "stream";
import { promisify } from "util";

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
