package handler

import (
	"net/http"
	"strconv"
	"time"

	"driver-exam-wx/internal/service"

	"github.com/gin-gonic/gin"
)

type QuestionHandler struct {
	svc *service.QuestionService
}

func NewQuestionHandler(svc *service.QuestionService) *QuestionHandler {
	return &QuestionHandler{svc: svc}
}

// GetVersion 获取题目数据最新版本时间
// GET /api/v1/questions/version?subject=1
func (h *QuestionHandler) GetVersion(c *gin.Context) {
	subject, _ := strconv.Atoi(c.DefaultQuery("subject", "1"))
	t, err := h.svc.GetVersion(subject)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "msg": "获取版本失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": t.Format(time.RFC3339),
	})
}

// ListQuestions 获取题目列表
// GET /api/v1/questions?subject=1&page=1&size=100
func (h *QuestionHandler) ListQuestions(c *gin.Context) {
	subject, _ := strconv.Atoi(c.DefaultQuery("subject", "1"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "100"))

	if size <= 0 || size > 2000 {
		size = 100
	}
	if page <= 0 {
		page = 1
	}

	result, err := h.svc.ListQuestions(service.ListQuestionsParams{
		Subject: subject,
		Page:    page,
		Size:    size,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "msg": "获取题目失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "ok",
		"data": gin.H{
			"total":     result.Total,
			"page":      result.Page,
			"size":      result.Size,
			"questions": result.Questions,
		},
	})
}
