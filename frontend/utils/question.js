/**
 * 题目数据标准化
 */

/** 判断题选项文字 */
const TRUE_OPTIONS = ['A、对', 'B、错']

/** 
 * 标准化题目：判断题自动补全 A=对 B=错 选项
 */
function normalize(question) {
  // 没有选项 → 判断题，生成 A/B 选项
  if (!question.option1 && !question.option2 && !question.option3 && !question.option4) {
    return {
      ...question,
      option1: TRUE_OPTIONS[0],
      option2: TRUE_OPTIONS[1],
      option3: '',
      option4: '',
    }
  }
  return { ...question }
}

module.exports = {
  normalize,
}
