package handler

import (
	"crypto/md5"
	"fmt"
	"net/http"

	"driver-exam-wx/internal/service"

	"github.com/gin-gonic/gin"
)

type ImageHandler struct {
	svc *service.ImageService
}

func NewImageHandler(svc *service.ImageService) *ImageHandler {
	return &ImageHandler{svc: svc}
}

// GetByURL 按图片 URL 获取 base64 数据
// GET /api/v1/images/by-url?url=...
func (h *ImageHandler) GetByURL(c *gin.Context) {
	url := c.Query("url")
	if url == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "msg": "缺少 url 参数"})
		return
	}
	md5 := fmt.Sprintf("%x", md5.Sum([]byte(url)))
	data, err := h.svc.GetByMD5(md5)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "msg": "图片不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": data,
	})
}

// GetByMD5 按 URL MD5 获取图片 base64 数据
// GET /api/v1/images/:md5
func (h *ImageHandler) GetByMD5(c *gin.Context) {
	md5 := c.Param("md5")
	if md5 == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "msg": "缺少 md5 参数"})
		return
	}

	data, err := h.svc.GetByMD5(md5)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "msg": "图片不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": data,
	})
}
