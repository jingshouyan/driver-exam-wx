package service

import (
	"driver-exam-wx/config"

	"gorm.io/gorm"
)

type SyncService struct {
	db  *gorm.DB
	cfg *config.JisuAPIConfig
}

func NewSyncService(db *gorm.DB, cfg *config.JisuAPIConfig) *SyncService {
	return &SyncService{db: db, cfg: cfg}
}

// SyncAll 全量同步极速数据题库到本地
func (s *SyncService) SyncAll() error {
	// TODO: 实现全量同步逻辑
	// 1. 分页从极速数据 API 拉取题目
	// 2. 计算 content_hash
	// 3. 对比 hash，更新或插入
	return nil
}
