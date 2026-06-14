package handler

import (
	"net/http"
	"strconv"

	"driver-exam-wx/internal/service"

	"github.com/gin-gonic/gin"
)

type ExamSetHandler struct {
	svc *service.ExamSetService
}

func NewExamSetHandler(svc *service.ExamSetService) *ExamSetHandler {
	return &ExamSetHandler{svc: svc}
}

// ListExamSets GET /api/v1/exam-sets?subject=1
func (h *ExamSetHandler) ListExamSets(c *gin.Context) {
	subject, _ := strconv.Atoi(c.DefaultQuery("subject", "1"))
	sets, err := h.svc.List(subject)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "msg": "获取套题列表失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": sets})
}

// GetQuestions GET /api/v1/exam-sets/:id/questions
func (h *ExamSetHandler) GetQuestions(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "msg": "参数错误"})
		return
	}
	questions, err := h.svc.GetQuestions(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "msg": "获取题目失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "data": questions})
}
