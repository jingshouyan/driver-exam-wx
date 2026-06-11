package model

import (
	"time"

	"gorm.io/gorm"
)

type Question struct {
	ID          uint           `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	ContentHash string         `gorm:"column:content_hash;type:varchar(64);uniqueIndex" json:"-"`
	Subject     int            `gorm:"column:subject;type:tinyint" json:"subject"`
	Type        string         `gorm:"column:type;type:varchar(16)" json:"type"`
	Chapter     int            `gorm:"column:chapter;type:tinyint" json:"chapter"`
	Question    string         `gorm:"column:question;type:text" json:"question"`
	Option1     string         `gorm:"column:option1;type:text" json:"option1"`
	Option2     string         `gorm:"column:option2;type:text" json:"option2"`
	Option3     string         `gorm:"column:option3;type:text" json:"option3"`
	Option4     string         `gorm:"column:option4;type:text" json:"option4"`
	Answer      string         `gorm:"column:answer;type:varchar(16)" json:"answer"`
	Explain     string         `gorm:"column:explain;type:text" json:"explain"`
	Pic         string         `gorm:"column:pic;type:longtext" json:"pic"`
	Sort        string         `gorm:"column:sort;type:varchar(16)" json:"sort"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"-"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"-"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (Question) TableName() string {
	return "questions"
}
