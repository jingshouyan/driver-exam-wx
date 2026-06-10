/**
 * 题目数据标准化
 *
 * 从后端获取的题目已经过 cleanOption 处理：
 *   - 多选题选项已去掉 "A、" 前缀
 *   - 判断题已转为 option1=对, option2=错, answer=A/B
 * 本模块仅作为旧数据（本地缓存）的兼容兜底
 */

function normalize(question) {
  // 所有选项为空 → 判断题，补全选项并转换 answer
  if (!question.option1 && !question.option2 && !question.option3 && !question.option4) {
    const newQ = { ...question, option1: '对', option2: '错', option3: '', option4: '' }
    if (newQ.answer === '对') newQ.answer = 'A'
    else if (newQ.answer === '错') newQ.answer = 'B'
    return newQ
  }
  return { ...question }
}

module.exports = {
  normalize,
}
