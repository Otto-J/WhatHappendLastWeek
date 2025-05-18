import { Elysia } from "elysia";
import { getLastWeeksRssUpdates } from "../scripts/lastWeek";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getLastWeek } from "./utils/date";

const RESULTS_DIR = path.resolve(process.cwd(), "results");

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
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
