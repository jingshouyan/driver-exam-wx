package service

import (
	"context"
	"crypto/sha256"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"driver-exam-wx/config"
	"driver-exam-wx/internal/model"
	"driver-exam-wx/internal/pkg/jisuapi"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SyncService struct {
	db     *gorm.DB
	cfg    *config.JisuAPIConfig
	client *jisuapi.Client
}

func NewSyncService(db *gorm.DB, cfg *config.JisuAPIConfig) *SyncService {
	return &SyncService{
		db:     db,
		cfg:    cfg,
		client: jisuapi.NewClient(cfg.Key),
	}
}

// ShouldSync 检查是否需要执行同步（基于距上次同步的时间间隔）
func (s *SyncService) ShouldSync(minIntervalHours int) (bool, error) {
	if minIntervalHours <= 0 {
		minIntervalHours = 24
	}

	var last model.SyncRecord
	err := s.db.Where("status = ?", "success").Order("created_at DESC").First(&last).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return true, nil // 从未同步过
		}
		return false, err
	}

	elapsed := time.Since(last.CreatedAt)
	if elapsed.Hours() < float64(minIntervalHours) {
		return false, nil
	}
	return true, nil
}

// SyncAll 全量同步极速数据题库到本地
func (s *SyncService) SyncAll() error {
	// 创建同步记录
	record := model.SyncRecord{Status: "running", Message: "开始同步"}
	if err := s.db.Create(&record).Error; err != nil {
		return fmt.Errorf("create sync record: %w", err)
	}

	subjects := []int{1, 4}
	totalUpserted := 0

	for _, subject := range subjects {
		items, err := s.client.QueryAll(context.Background(), subject)
		if err != nil {
			msg := fmt.Sprintf("科目%d 拉取失败: %v", subject, err)
			s.db.Model(&record).Updates(map[string]interface{}{
				"status":  "failed",
				"message": msg,
			})
			return fmt.Errorf(msg)
		}

		slog.Info("拉取题目", "subject", subject, "count", len(items))

		for _, item := range items {
			q := convertToQuestion(item, subject)
			if err := s.upsertQuestion(&q); err != nil {
				msg := fmt.Sprintf("科目%d 写入失败: %v", subject, err)
				s.db.Model(&record).Updates(map[string]interface{}{
					"status":  "failed",
					"message": msg,
				})
				return fmt.Errorf(msg)
			}
			totalUpserted++
		}
	}

	msg := fmt.Sprintf("同步完成，共处理 %d 条题目", totalUpserted)
	slog.Info(msg)
	s.db.Model(&record).Updates(map[string]interface{}{
		"status":  "success",
		"message": msg,
	})
	return nil
}

// SyncWithRetry 带重试的同步
func (s *SyncService) SyncWithRetry(cfg *config.SyncConfig) error {
	var lastErr error
	maxRetries := cfg.MaxRetries
	if maxRetries <= 0 {
		maxRetries = 3
	}
	retryInterval := cfg.RetryInterval
	if retryInterval <= 0 {
		retryInterval = 30
	}

	for i := 0; i <= maxRetries; i++ {
		if i > 0 {
			slog.Info("同步重试", "attempt", i, "max_retries", maxRetries, "wait_sec", retryInterval)
			time.Sleep(time.Duration(retryInterval) * time.Second)
		}

		lastErr = s.SyncAll()
		if lastErr == nil {
			return nil
		}

		slog.Error("同步失败", "error", lastErr)
	}

	return fmt.Errorf("同步失败，已重试 %d 次: %v", maxRetries, lastErr)
}

// upsertQuestion 按 content_hash 插入或更新题目
func (s *SyncService) upsertQuestion(q *model.Question) error {
	hash := q.ContentHash
	if hash == "" {
		hash = computeContentHash(q)
		q.ContentHash = hash
	}

	// 使用 content_hash 作为唯一键，存在则更新，不存在则插入
	err := s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "content_hash"}},
		UpdateAll: true,
	}).Create(q).Error

	if err != nil {
		return fmt.Errorf("upsert question: %w", err)
	}
	return nil
}

// convertToQuestion 将极速数据 API 题目转换为本地 Question 模型
func convertToQuestion(item jisuapi.QuestionItem, subject int) model.Question {
	q := model.Question{
		Subject:  subject,
		Question: item.Question,
		Option1:  cleanOption(item.Option1),
		Option2:  cleanOption(item.Option2),
		Option3:  cleanOption(item.Option3),
		Option4:  cleanOption(item.Option4),
		Answer:   item.Answer,
		Explain:  item.Explain,
		Pic:      item.Pic,
	}

	// 判断题：API 选项为空，则生成 A=对 B=错，answer 转 A/B
	if q.Option1 == "" && q.Option2 == "" && q.Option3 == "" && q.Option4 == "" {
		q.Option1 = "对"
		q.Option2 = "错"
		switch q.Answer {
		case "对":
			q.Answer = "A"
		case "错":
			q.Answer = "B"
		}
	}

	// 计算 content_hash（基于标准化后的数据）
	q.ContentHash = computeContentHash(&q)
	return q
}

// cleanOption 去掉选项前缀 "A、"，如 "A、工作证" → "工作证"
func cleanOption(opt string) string {
	opt = strings.TrimSpace(opt)
	r := []rune(opt)
	if len(r) >= 2 && r[1] == '、' && r[0] >= 'A' && r[0] <= 'D' {
		return string(r[2:])
	}
	return opt
}

// computeContentHash 计算题目内容的 SHA256 哈希（用于去重判断）
func computeContentHash(q *model.Question) string {
	data := fmt.Sprintf("%d|%s|%s|%s|%s|%s|%s",
		q.Subject, q.Question, q.Option1, q.Option2, q.Option3, q.Option4, q.Answer)
	h := sha256.Sum256([]byte(data))
	return fmt.Sprintf("%x", h)
}
