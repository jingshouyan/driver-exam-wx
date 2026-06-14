package service

import (
	"driver-exam-wx/internal/model"
	"gorm.io/gorm"
)

type ExamSetService struct {
	db *gorm.DB
}

func NewExamSetService(db *gorm.DB) *ExamSetService {
	return &ExamSetService{db: db}
}

// List 按科目获取套题列表
func (s *ExamSetService) List(subject int) ([]model.ExamSet, error) {
	var sets []model.ExamSet
	err := s.db.Where("subject = ?", subject).Order("id ASC").Find(&sets).Error
	return sets, err
}

// GetQuestions 获取套题的全部题目
func (s *ExamSetService) GetQuestions(setID uint) ([]model.ExamSetQuestion, error) {
	var questions []model.ExamSetQuestion
	err := s.db.Where("set_id = ?", setID).Order("sort ASC").Find(&questions).Error
	return questions, err
}
