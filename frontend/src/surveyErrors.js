export function validationNotice(entries) {
  if (!entries.length) return "請檢查填寫內容";
  return `有 ${entries.length} 處尚未完成或需要修正，第一處：${entries[0].message}`;
}

export const matrixCellId = (questionId, itemId, promptId) => JSON.stringify([questionId, String(itemId), promptId]);

export function matrixErrors(question, value) {
  if (question.type !== "linked_matrix" || !question.required) return [];
  return (question.options || []).flatMap((item) => (question.config?.prompts || []).flatMap((prompt, index) => {
    const cell = value?.[item.value]?.[prompt.id];
    const missing = Array.isArray(cell) ? cell.length === 0 : !String(cell ?? "").trim();
    if (prompt.required === false || !missing) return [];
    return [{ questionId: question.id, itemId: item.value, promptId: prompt.id,
      cellId: matrixCellId(question.id, item.value, prompt.id),
      message: `「${question.title}」→ ${item.label} → Q${index + 1}：${prompt.label}：尚未填寫` }];
  }));
}

export function serverErrors(details, schema, answers) {
  const sections = [...schema.sections].sort((a, b) => a.order - b.order);
  const ordered = sections.flatMap((section) => schema.questions.filter((q) => q.sectionId === section.id));
  const seen = new Set();
  return [...details].sort((a, b) => ordered.findIndex((q) => q.id === a.questionId) - ordered.findIndex((q) => q.id === b.questionId))
    .flatMap((detail) => {
      if (seen.has(detail.questionId)) return [];
      seen.add(detail.questionId);
      const question = schema.questions.find((q) => q.id === detail.questionId);
      const cells = question ? matrixErrors(question, answers[question.id]) : [];
      return cells.length ? cells : [{ questionId: detail.questionId, message: `「${question?.title || "題目"}」${detail.message}` }];
    });
}

// Scope the lookup to this survey; focus the question, not an input that opens
// the mobile keyboard. Align the heading even when the question is very tall.
export function focusSurveyError(root, questionId, cellId) {
  const cell = cellId && Array.from(root?.querySelectorAll("[data-error-cell]") || [])
    .find((element) => element.dataset.errorCell === cellId);
  const target = cell || Array.from(root?.querySelectorAll("[data-question-id]") || [])
    .find((element) => element.dataset.questionId === questionId);
  if (!target) return false;
  target.focus({ preventScroll: true });
  try {
    target.scrollIntoView({ behavior: "instant", block: "start", inline: "nearest" });
  } catch {
    target.scrollIntoView(true);
  }
  return true;
}
