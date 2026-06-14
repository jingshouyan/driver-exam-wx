package model

// ExamSet 套题（强化套题）
type ExamSet struct {
	ID       uint   `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Title    string `gorm:"column:title;type:varchar(128)" json:"title"`
	Subject  int    `gorm:"column:subject;type:int" json:"subject"`
	File     string `gorm:"column:file;type:varchar(64)" json:"file"`
	QuestionCount int `gorm:"column:question_count;type:int" json:"question_count"`
}

func (ExamSet) TableName() string {
	return "exam_sets"
}

// ExamSetQuestion 套题题目关联
type ExamSetQuestion struct {
	ID         uint   `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	SetID      uint   `gorm:"column:set_id;index" json:"set_id"`
	SubID      int    `gorm:"column:sub_id" json:"sub_id"`               // 来源题库的题目 ID
	Sort       int    `gorm:"column:sort" json:"sort"`
	Title      string `gorm:"column:title;type:text" json:"title"`        // 题目
	OptA       string `gorm:"column:opt_a;type:text" json:"opt_a"`
	OptB       string `gorm:"column:opt_b;type:text" json:"opt_b"`
	OptC       string `gorm:"column:opt_c;type:text" json:"opt_c"`
	OptD       string `gorm:"column:opt_d;type:text" json:"opt_d"`
	Answer     string `gorm:"column:answer;type:varchar(4)" json:"answer"`
	Explain    string `gorm:"column:explain;type:text" json:"explain"`
	Tip        string `gorm:"column:tip;type:text" json:"tip"`            // 答题技巧
	SubPic     string `gorm:"column:sub_pic;type:varchar(512)" json:"sub_pic"`
}

func (ExamSetQuestion) TableName() string {
	return "exam_set_questions"
}
