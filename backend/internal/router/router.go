package router

import (
	"driver-exam-wx/internal/handler"
	"driver-exam-wx/internal/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(
	authHandler *handler.AuthHandler,
	questionHandler *handler.QuestionHandler,
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

		// 需要登录
		api.Use(authMiddleware.Handle())
		{
			api.GET("/questions", questionHandler.ListQuestions)
		}
	}

	return r
}
