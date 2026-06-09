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
)

func main() {
	configPath := flag.String("config", "config.yaml", "配置文件路径")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	db, err := database.Init(&cfg.MySQL)
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}

	// Service
	authSvc := service.NewAuthService(&cfg.WeChat)
	questionSvc := service.NewQuestionService(db)
	syncSvc := service.NewSyncService(db, &cfg.JisuAPI)

	// Handler
	authHandler := handler.NewAuthHandler(authSvc)
	questionHandler := handler.NewQuestionHandler(questionSvc)
	authMiddleware := middleware.NewAuthMiddleware(authSvc)

	// 启动同步（TODO: 实现）
	_ = syncSvc

	// Router
	r := router.Setup(authHandler, questionHandler, authMiddleware)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("服务启动于 %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
