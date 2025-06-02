# What Happened Last Week

本项目是一个基于 [Elysia](https://elysiajs.com/) + Bun 的播客周报服务，自动抓取并汇总上周各大前端/技术播客的最新节目，支持 RSS 输出和音频批量下载。

注意：考虑到需要良好的网络环境、漫长的音频下载、运行频次比较低，本应用更适合本地运行。

## 主要特性

- 自动抓取并汇总上周各大播客的最新节目
- 支持 RSS 输出，方便订阅
- 支持一键批量下载音频
- Docker 支持，易于部署

---

## 依赖

- [Bun](https://bun.sh/) 1.2.3+
- Node.js（部分依赖如 `fs`、`stream`）
- 主要依赖见 `package.json`，如 `elysia`, `rss-parser`, `dayjs`, `jstoxml` 等

---

## 快速开始

### 本地开发

1. 安装依赖

   ```sh
   bun install
   ```

2. 启动开发服务器

   ```sh
   bun run dev
   ```

   默认监听 3000 端口。

### Docker 部署

非 arm 芯片电脑：

```sh
docker pull oven/bun:1.2.3-alpine --platform linux/amd64
```

arm 芯片电脑：

```sh
docker pull oven/bun:1.2.3-alpine --platform linux/arm64/v8
```

构建并运行：

```sh
bun run docker:build
bun run docker:run
```

---

## 主要 API

### 1. `POST /fetchLastWeekPodcast`

- 功能：抓取上周所有播客的最新节目，结果写入 `results/{week}.json`，返回本周数据。
- 返回示例：

  ```json
  {
    "status": true,
    "file": "24.json",
    "msg": "写入成功",
    "startOfWeek": "2024-06-10",
    "weekNumber": 24,
    "results": [
      {
        "feedTitle": "xxx",
        "updateStatus": 2,
        "data": [
          {
            "itemTitle": "xxx",
            "media": "http://...",
            "itemLink": "http://..."
          }
        ]
      }
    ]
  }
  ```

### 2. `POST /fetchMp3`

- 功能：批量下载本周所有有音频链接的节目，音频保存到 `media/{week}/` 目录。
- 请求体可选参数：`weekNumber`
- 返回：下载成功/失败的详细列表

### 3. `GET /rss`

- 功能：输出本周所有播客节目的 RSS，支持标准订阅。
- 返回：`application/xml` 格式的 RSS 内容

### 4. `GET /`

- 健康检查，返回 `"Hello Elysia"`

---

## 目录结构

- `src/` 主要源码
  - `index.ts` 入口，注册路由
  - `service/` 业务逻辑
  - `utils/` 工具函数
- `results/` 每周播客数据缓存
- `media/` 下载的音频文件
- `scripts/lastWeek.ts` 抓取播客的核心脚本

---

## 常见问题

- **如何添加新的播客源？**
  编辑 `scripts/lastWeek.ts` 中的 `rssList` 数组，添加新的 RSS 链接即可。

- **如何更换端口？**
  修改 `src/index.ts` 中的 `.listen(3000)`。

---

## Podcast MP3 Download Workflow

This project includes a GitHub Action workflow (`.github/workflows/download-mp3s.yml`) that automates the downloading of podcast MP3 files referenced in the weekly JSON data and uploads them to an S3-compatible storage service.

### Triggers

- **Manual:** Can be triggered manually from the GitHub Actions tab.
- **Automatic:** Runs automatically after the "Update Weekly Podcast JSON" workflow completes successfully on the `main` branch.

### S3 Configuration

To use this workflow, you need to configure the following secrets in your GitHub repository settings (Settings > Secrets and variables > Actions > New repository secret):

- `S3_ENDPOINT_URL`: The full endpoint URL for your S3-compatible storage (e.g., `https://your-s3-provider.com`).
- `S3_REGION`: The AWS region of your bucket (e.g., `us-east-1`). This might be a default value if your S3-compatible service doesn't strictly use AWS regions.
- `S3_ACCESS_KEY_ID`: Your S3 access key ID.
- `S3_SECRET_ACCESS_KEY`: Your S3 secret access key.
- `S3_BUCKET_NAME`: The name of the S3 bucket where the MP3 files will be stored.
- `S3_PATH_PREFIX` (Optional): A path prefix (folder) within the bucket to store the MP3 files (e.g., `podcasts/`). If not provided, it defaults to `podcasts/`.

The script `scripts/downloadMp3sToS3.ts` handles the download and upload logic. You can also run this script manually using `bun run download-mp3s` after ensuring the necessary environment variables are set.
