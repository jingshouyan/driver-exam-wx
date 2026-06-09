package middleware

import (
	"net/http"
	"strings"

	"driver-exam-wx/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthMiddleware struct {
	authSvc *service.AuthService
}

func NewAuthMiddleware(authSvc *service.AuthService) *AuthMiddleware {
	return &AuthMiddleware{authSvc: authSvc}
}

func (m *AuthMiddleware) Handle() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": 401, "msg": "缺少 token"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": 401, "msg": "token 格式错误"})
			return
		}

		openID, err := m.authSvc.ValidateToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": 401, "msg": "token 无效或已过期"})
			return
		}

		c.Set("openid", openID)
		c.Next()
	}
}
