package handler

import (
	"net/http"

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

	// TODO: 调用微信 Code2Session 换取 openid
	// openID, err := h.svc.Code2Session(c.Request.Context(), req.Code)
	// if err != nil { ... }

	// 占位：直接返回
	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "ok",
		"data": gin.H{
			"token":   "placeholder_token",
			"open_id": "placeholder_openid",
		},
	})
}

// RefreshToken 刷新 token
// POST /api/v1/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// TODO: 从请求头或 body 获取旧 token，刷新
	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "ok"})
}
