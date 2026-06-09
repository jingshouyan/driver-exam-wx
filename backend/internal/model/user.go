package model

import (
	"time"
)

type User struct {
	OpenID    string    `gorm:"column:openid;type:varchar(64);primaryKey" json:"openid"`
	Nickname  string    `gorm:"column:nickname;type:varchar(128)" json:"nickname"`
	Avatar    string    `gorm:"column:avatar;type:varchar(256)" json:"avatar"`
	Phone     string    `gorm:"column:phone;type:varchar(20)" json:"phone"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}
