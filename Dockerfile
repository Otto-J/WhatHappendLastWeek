FROM oven/bun:1.2.3-alpine
# 设置工作目录
WORKDIR /app

# 复制 package.json 和 bun.lockb
COPY package.json bun.lockb ./

# 安装依赖
RUN bun install

# 复制源码
COPY src ./src

# 构建项目（如果需要）
RUN bun run build

# 暴露端口（假设你的应用监听 3000 端口）
EXPOSE 3000

# 启动应用
CMD ["bun", "run", "start"]