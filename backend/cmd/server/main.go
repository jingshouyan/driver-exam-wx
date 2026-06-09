package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"log/slog"
	"os"
	"path/filepath"

	"driver-exam-wx/config"
	"driver-exam-wx/internal/database"
	"driver-exam-wx/internal/handler"
	"driver-exam-wx/internal/middleware"
	"driver-exam-wx/internal/router"
	"driver-exam-wx/internal/service"

	"github.com/robfig/cron/v3"
	"gopkg.in/natefinch/lumberjack.v2"
)

func main() {
	configPath := flag.String("config", "config.yaml", "配置文件路径")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 日志：slog + lumberjack
	setupLog(&cfg.Log)

	db, err := database.Init(cfg)
	if err != nil {
		slog.Error("数据库初始化失败", "error", err)
		os.Exit(1)
	}

	// Service
	authSvc := service.NewAuthService(&cfg.WeChat, db)
	questionSvc := service.NewQuestionService(db)
	syncSvc := service.NewSyncService(db, &cfg.JisuAPI)

	// Handler
	authHandler := handler.NewAuthHandler(authSvc)
	questionHandler := handler.NewQuestionHandler(questionSvc)
	authMiddleware := middleware.NewAuthMiddleware(authSvc)

	// 启动同步（检查间隔）
	if cfg.Sync.OnStartup {
		shouldSync, err := syncSvc.ShouldSync(cfg.Sync.MinIntervalHours)
		if err != nil {
			slog.Error("检查同步间隔失败", "error", err)
		} else if shouldSync {
			slog.Info("开始数据同步...")
			if err := syncSvc.SyncWithRetry(&cfg.Sync); err != nil {
				slog.Error("数据同步失败", "error", err)
			} else {
				slog.Info("数据同步完成")
			}
		} else {
			slog.Info("距上次同步不足指定小时，跳过本次启动同步", "min_interval_hours", cfg.Sync.MinIntervalHours)
		}
	}

	// 定时同步（cron）
	c := cron.New()
	_, err = c.AddFunc(cfg.Sync.Cron, func() {
		slog.Info("定时同步触发")
		if err := syncSvc.SyncWithRetry(&cfg.Sync); err != nil {
			slog.Error("定时同步失败", "error", err)
		} else {
			slog.Info("定时同步完成")
		}
	})
	if err != nil {
		slog.Error("注册定时同步失败", "error", err)
		os.Exit(1)
	}
	c.Start()
	slog.Info("定时同步已注册", "cron", cfg.Sync.Cron)

	// Router
	r := router.Setup(authHandler, questionHandler, authMiddleware)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	slog.Info("服务启动", "addr", addr)
	if err := r.Run(addr); err != nil {
		slog.Error("服务启动失败", "error", err)
		os.Exit(1)
	}
}

func setupLog(cfg *config.LogConfig) {
	var writer io.Writer = os.Stdout

	if cfg.File != "" {
		dir := filepath.Dir(cfg.File)
		if dir != "." {
			if err := os.MkdirAll(dir, 0755); err != nil {
				log.Fatalf("创建日志目录失败: %v", err)
			}
		}

		lj := &lumberjack.Logger{
			Filename:   cfg.File,
			MaxSize:    cfg.MaxSize,
			MaxBackups: cfg.MaxBackups,
			MaxAge:     cfg.MaxAge,
			Compress:   cfg.Compress,
		}

		// 同时写入 stdout 和文件
		writer = io.MultiWriter(os.Stdout, lj)
	}

	handler := slog.NewTextHandler(writer, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	slog.SetDefault(slog.New(handler))

	// 标准 log 包也重定向到同一输出（用于第三方库和 Fatal）
	log.SetOutput(writer)

	slog.Info("日志已初始化", "file", cfg.File)
}
