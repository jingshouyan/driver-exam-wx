/**
 * 题目数据标准化
 *
 * 从后端获取的题目已经过 cleanOption 处理：
 *   - 多选题选项已去掉 "A、" 前缀
 *   - 判断题已转为 option1=对, option2=错, answer=A/B
 * 本模块仅作为旧数据（本地缓存）的兼容兜底
 */

/** 答案字母 → 选项索引 */
const ANSWER_MAP = { A: 1, B: 2, C: 3, D: 4 }

function normalize(question) {
  const q = { ...question }

  // 所有选项为空 → 判断题，补全选项并转换 answer
  if (!q.option1 && !q.option2 && !q.option3 && !q.option4) {
    q.option1 = '对'
    q.option2 = '错'
    if (q.answer === '对') q.answer = 'A'
    else if (q.answer === '错') q.answer = 'B'
  }

  // 预计算 答案 + 选项文本（如 "A、对"）
  const idx = ANSWER_MAP[q.answer]
  q.answerText = idx ? (q.answer + '、' + (q['option' + idx] || '')) : q.answer

  return q
}

module.exports = {
  normalize,
}
