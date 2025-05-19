import { createWriteStream } from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import { fetchLastWeekPodcast } from "./fetchLastWeekPodcast";
import { hello } from "./hello";
import { fetchMp3 } from "./fetchMp3";
import { rss } from "./rss";

const streamPipeline = promisify(pipeline);

async function downloadFile(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`下载失败: ${res.statusText}`);
  const total = Number(res.headers.get("content-length")) || 0;
  let downloaded = 0;
  let lastLogged = 0;
  let lastPrintTime = Date.now();
  const nodeStream = (res.body as any).pipe
    ? res.body
    : require("stream").Readable.fromWeb(res.body);
  const fileStream = createWriteStream(dest);
  nodeStream.on("data", (chunk: Buffer) => {
    downloaded += chunk.length;
    const now = Date.now();
    let shouldPrint = false;
    if (now - lastPrintTime >= 2000) {
      shouldPrint = true;
      lastPrintTime = now;
    }
    if (total) {
      const percent = Math.floor((downloaded / total) * 100);
      if (
        (percent >= lastLogged + 10 ||
          downloaded - lastLogged >= 1024 * 1024) &&
        shouldPrint
      ) {
        lastLogged = percent;
        console.log(
          `下载进度: ${percent}% (${(downloaded / 1024 / 1024).toFixed(2)}MB/${(
            total /
            1024 /
            1024
          ).toFixed(2)}MB)`
        );
      }
    } else {
      if (downloaded - lastLogged >= 1024 * 1024 && shouldPrint) {
        lastLogged = downloaded;
        console.log(`已下载: ${(downloaded / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  });
  await streamPipeline(nodeStream, fileStream);
  console.log("下载完成:", dest);
}

export class Service {
  async fetchLastWeekPodcast(ctx: any) {
    return fetchLastWeekPodcast(ctx);
  }

  hello(ctx: any) {
    return hello(ctx);
  }

  async fetchMp3(ctx: any) {
    return fetchMp3(ctx);
  }

  async rss(ctx: any) {
    return rss(ctx);
  }
}
