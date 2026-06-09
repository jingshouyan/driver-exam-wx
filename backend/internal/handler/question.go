package handler

import (
	"net/http"
	"strconv"

	"driver-exam-wx/internal/service"

	"github.com/gin-gonic/gin"
)

type QuestionHandler struct {
	svc *service.QuestionService
}

func NewQuestionHandler(svc *service.QuestionService) *QuestionHandler {
	return &QuestionHandler{svc: svc}
}

// ListQuestions 获取题目列表
// GET /api/v1/questions?subject=1&page=1&size=100
func (h *QuestionHandler) ListQuestions(c *gin.Context) {
	subject, _ := strconv.Atoi(c.DefaultQuery("subject", "1"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "100"))

	if size <= 0 || size > 100 {
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
