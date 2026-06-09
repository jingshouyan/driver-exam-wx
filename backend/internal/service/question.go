package service

import (
	"driver-exam-wx/internal/model"

	"gorm.io/gorm"
)

type QuestionService struct {
	db *gorm.DB
}

func NewQuestionService(db *gorm.DB) *QuestionService {
	return &QuestionService{db: db}
}

type ListQuestionsParams struct {
	Subject int
	Page    int
	Size    int
}

type ListQuestionsResult struct {
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	Size     int               `json:"size"`
	Questions []model.Question `json:"list"`
}

func (s *QuestionService) ListQuestions(params ListQuestionsParams) (*ListQuestionsResult, error) {
	query := s.db.Model(&model.Question{})
	if params.Subject > 0 {
		query = query.Where("subject = ?", params.Subject)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var questions []model.Question
	offset := (params.Page - 1) * params.Size
	if err := query.Order("id ASC").Offset(offset).Limit(params.Size).Find(&questions).Error; err != nil {
		return nil, err
	}

	return &ListQuestionsResult{
		Total:     total,
		Page:      params.Page,
		Size:      params.Size,
		Questions: questions,
	}, nil
}
