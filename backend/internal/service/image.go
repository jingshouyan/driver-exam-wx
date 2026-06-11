package service

import (
	"driver-exam-wx/internal/model"

	"gorm.io/gorm"
)

type ImageService struct {
	db *gorm.DB
}

func NewImageService(db *gorm.DB) *ImageService {
	return &ImageService{db: db}
}

// GetByMD5 根据 URL MD5 获取图片 base64 数据
func (s *ImageService) GetByMD5(md5 string) (string, error) {
	var img model.Image
	err := s.db.Where("url_md5 = ?", md5).First(&img).Error
	if err != nil {
		return "", err
	}
	return img.Data, nil
}
