# ===== 构建阶段 =====
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /build

# 先复制依赖文件，利用 Docker 缓存
COPY go.mod go.sum ./
RUN go mod download

# 先复制套题数据（.dockerignore 排除了 data/）
COPY data/c1k1 /build/data/c1k1

# 复制源码并编译
COPY . .
RUN CGO_ENABLED=0 go build -o /build/server ./cmd/server

# ===== 运行阶段 =====
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# 创建数据目录和日志目录
RUN mkdir -p /app/data /app/logs

# 从构建阶段复制编译好的二进制
COPY --from=builder /build/server /app/server

# 复制示例配置（部署时通过挂载覆盖）
COPY --from=builder /build/config.example.yaml /app/config.yaml

# 复制套题数据文件（用于启动时导入）
COPY --from=builder /build/data /app/data

EXPOSE 8080

CMD ["/app/server", "-config", "/app/config.yaml"]
