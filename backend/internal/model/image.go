package model

import (
	"time"

	"gorm.io/gorm"
)

// Image 图片缓存，key 为图片 URL 的 MD5
type Image struct {
	ID        uint           `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	URLMD5    string         `gorm:"column:url_md5;type:varchar(32);uniqueIndex" json:"url_md5"`
	URL       string         `gorm:"column:url;type:varchar(512)" json:"url"`
	Data      string         `gorm:"column:data;type:longtext" json:"-"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"-"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"-"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (Image) TableName() string {
	return "images"
}
