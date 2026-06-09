package model

import "time"

// SyncRecord 同步记录，记录每次数据同步的状态
type SyncRecord struct {
	ID        uint      `gorm:"column:id;primaryKey;autoIncrement" json:"-"`
	Status    string    `gorm:"column:status;type:varchar(16)" json:"status"` // running / success / failed
	Message   string    `gorm:"column:message;type:text" json:"message"`
	CreatedAt time.Time `gorm:"column:created_at" json:"-"`
}

func (SyncRecord) TableName() string {
	return "sync_records"
}
