## docker

非 arm 芯片电脑

```sh
# amd/intel
docker pull oven/bun:1.2.3-alpine --platform linux/arm64
# arm
docker pull oven/bun:1.2.3-alpine --platform linux/arm64/v8
```