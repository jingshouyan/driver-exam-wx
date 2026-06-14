package seed

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"driver-exam-wx/internal/model"
	"gorm.io/gorm"
)

const imgPrefix = "https://cdn.jiakaojingling.com/static/upload/zhjg/"

type rawSet struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		Vo struct {
			Title    string `json:"title"`
			Subject  string `json:"subject"`
			ContentList string `json:"contentList"`
		} `json:"vo"`
		Questions []rawQuestion `json:"questions"`
	} `json:"data"`
}

type rawQuestion struct {
	SubID   int    `json:"subId"`
	SubTitle string `json:"subTitle"`
	OptA    string `json:"optA"`
	OptB    string `json:"optB"`
	OptC    string `json:"optC"`
	OptD    string `json:"optD"`
	Answer  string `json:"answer"`
	Infos   string `json:"infos"`
	Dtjq    string `json:"dtjq"`
	SubPic  string `json:"subPic"`
}

// 解析 subPic：有些可能有目录前缀，保留原样拼接
func picURL(p string) string {
	if p == "" {
		return ""
	}
	return imgPrefix + p
}

// ImportExamSets 读取 data/c1k1/*.json 写入数据库
func ImportExamSets(db *gorm.DB, dataDir string) error {
	pattern := filepath.Join(dataDir, "c1k1", "*.json")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return fmt.Errorf("glob %s: %w", pattern, err)
	}
	if len(files) == 0 {
		slog.Info("没有套题 JSON 文件", "pattern", pattern)
		return nil
	}

	for _, f := range files {
		if err := importFile(db, f); err != nil {
			slog.Error("导入套题失败", "file", f, "error", err)
		}
	}
	return nil
}

func importFile(db *gorm.DB, path string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	var set rawSet
	if err := json.Unmarshal(raw, &set); err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}
	if set.Code != 200 {
		return fmt.Errorf("api code %d: %s", set.Code, set.Msg)
	}

	vo := set.Data.Vo
	subj := 1 // 默认科目1
	if vo.Subject == "4" {
		subj = 4
	}

	// 检查是否已导入（按文件名去重）
	filename := filepath.Base(path)
	var existing model.ExamSet
	if err := db.Where("file = ?", filename).First(&existing).Error; err == nil {
		slog.Info("套题已存在，跳过", "file", filename, "title", existing.Title)
		return nil
	}

	// 创建套题记录
	examSet := model.ExamSet{
		Title:   vo.Title,
		Subject: subj,
		File:    filename,
	}
	if err := db.Create(&examSet).Error; err != nil {
		return fmt.Errorf("create exam_set: %w", err)
	}

	// 构建 subID → rawQuestion 索引
	qm := make(map[int]rawQuestion, len(set.Data.Questions))
	for _, q := range set.Data.Questions {
		qm[q.SubID] = q
	}

	// 解析 contentList
	idStrs := strings.Split(vo.ContentList, ",")
	questions := make([]model.ExamSetQuestion, 0, len(idStrs))
	for i, idStr := range idStrs {
		var subID int
		fmt.Sscanf(idStr, "%d", &subID)
		rq, ok := qm[subID]
		if !ok {
			slog.Warn("题目未在 questions 数组中找到", "subId", subID, "file", filename)
			continue
		}
		questions = append(questions, model.ExamSetQuestion{
			SetID:   examSet.ID,
			SubID:   subID,
			Sort:    i + 1,
			Title:   rq.SubTitle,
			OptA:    rq.OptA,
			OptB:    rq.OptB,
			OptC:    rq.OptC,
			OptD:    rq.OptD,
			Answer:  strings.ToUpper(rq.Answer),
			Explain: rq.Infos,
			Tip:    rq.Dtjq,
			SubPic: picURL(rq.SubPic),
		})
	}

	// 批量插入
	if len(questions) > 0 {
		if err := db.Create(&questions).Error; err != nil {
			return fmt.Errorf("create questions: %w", err)
		}
	}
	// 更新题目数
	db.Model(&examSet).Update("question_count", len(questions))

	slog.Info("套题导入成功", "file", filename, "title", vo.Title, "questions", len(questions))
	return nil
}
