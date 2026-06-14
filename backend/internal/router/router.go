package router

import (
	"driver-exam-wx/internal/handler"
	"driver-exam-wx/internal/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(
	authHandler *handler.AuthHandler,
	questionHandler *handler.QuestionHandler,
	imageHandler *handler.ImageHandler,
	examSetHandler *handler.ExamSetHandler,
	authMiddleware *middleware.AuthMiddleware,
) *gin.Engine {
	r := gin.Default()

	// 健康检查（微信云托管需要）
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	{
		// 无需登录
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// 题目 & 图片（游客可访问）
		api.GET("/questions", questionHandler.ListQuestions)
		api.GET("/questions/version", questionHandler.GetVersion)
		api.GET("/images/by-url", imageHandler.GetByURL)
api.GET("/images/:md5", imageHandler.GetByMD5)

		// 套题（游客可访问）
		api.GET("/exam-sets", examSetHandler.ListExamSets)
		api.GET("/exam-sets/:id/questions", examSetHandler.GetQuestions)

		// 需要登录的操作
		api.Use(authMiddleware.Handle())
		{
			// 预留后续需要登录的接口
		}
	}

	return r
}
