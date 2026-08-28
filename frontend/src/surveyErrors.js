export function validationNotice(entries) {
  if (!entries.length) return "請檢查填寫內容";
  return `有 ${entries.length} 題需要修正，第一題：${entries[0].message}`;
}

// Scope the lookup to this survey; focus the question, not an input that opens
// the mobile keyboard. Align the heading even when the question is very tall.
export function focusSurveyError(root, questionId) {
  const target = Array.from(root?.querySelectorAll("[data-question-id]") || [])
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
