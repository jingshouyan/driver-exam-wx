package handler

import (
	"log/slog"
	"net/http"
	"strings"

	"driver-exam-wx/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

type LoginRequest struct {
	Code string `json:"code" binding:"required"`
}

// Login 微信小程序登录
// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "msg": "参数错误"})
		return
	}

	token, openID, err := h.svc.Login(c.Request.Context(), req.Code)
	if err != nil {
		slog.Error("登录失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "msg": "登录失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "ok",
		"data": gin.H{
			"token":   token,
			"open_id": openID,
		},
	})
}

// RefreshToken 刷新 token
// POST /api/v1/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "msg": "缺少 token"})
		return
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "msg": "token 格式错误"})
		return
	}

	newToken, err := h.svc.RefreshToken(parts[1])
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "msg": "token 无效或已过期"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "ok",
		"data": gin.H{"token": newToken},
	})
}
