package main

import (
	"flag"
	"fmt"
	"log"

	"driver-exam-wx/config"
	"driver-exam-wx/internal/database"
	"driver-exam-wx/internal/handler"
	"driver-exam-wx/internal/middleware"
	"driver-exam-wx/internal/router"
	"driver-exam-wx/internal/service"

	"github.com/robfig/cron/v3"
)

func main() {
	configPath := flag.String("config", "config.yaml", "配置文件路径")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	db, err := database.Init(cfg)
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
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
			log.Printf("检查同步间隔失败: %v", err)
		} else if shouldSync {
			log.Println("开始数据同步...")
			if err := syncSvc.SyncWithRetry(&cfg.Sync); err != nil {
				log.Printf("数据同步失败: %v", err)
			} else {
				log.Println("数据同步完成")
			}
		} else {
			log.Printf("距上次同步不足 %d 小时，跳过本次启动同步", cfg.Sync.MinIntervalHours)
		}
	}

	// 定时同步（cron）
	c := cron.New()
	_, err = c.AddFunc(cfg.Sync.Cron, func() {
		log.Println("定时同步触发")
		if err := syncSvc.SyncWithRetry(&cfg.Sync); err != nil {
			log.Printf("定时同步失败: %v", err)
		} else {
			log.Println("定时同步完成")
		}
	})
	if err != nil {
		log.Fatalf("注册定时同步失败: %v", err)
	}
	c.Start()
	log.Printf("定时同步已注册，cron: %s", cfg.Sync.Cron)

	// Router
	r := router.Setup(authHandler, questionHandler, authMiddleware)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("服务启动于 %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
