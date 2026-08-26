const ENDPOINT = String(import.meta.env.VITE_GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzYckl5w-cl7bG3F2hoX36yu9Du6r0JELSgGDbJA9n-2S6gaGUF-trc1iURHbw5jMKCJQ/exec').trim();
const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 12000;
const RETRY_DELAYS = [0, 750];
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const RETRYABLE_ACTIONS = new Set([
  'respondentProject', 'respondentLogin', 'respondentGuestLogin',
  'respondentSurvey', 'respondentSave', 'respondentSubmit',
]);

export class ApiError extends Error {
  constructor(error) {
    super(error?.message || '系統暫時無法處理');
    this.code = error?.code || 'NETWORK';
    this.details = error?.details || null;
    this.status = error?.status || 0;
    this.requestId = error?.requestId || '';
    this.attempt = error?.attempt || 0;
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const createRequestId = () =>
  globalThis.crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

async function request(action, payload = {}) {
  if (!ENDPOINT) throw new ApiError({ code: 'CONFIG', message: '尚未設定 VITE_GAS_API_URL' });
  const requestId = payload.requestId || createRequestId();
  const maxAttempts = RETRYABLE_ACTIONS.has(String(action)) ? MAX_ATTEMPTS : 1;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) await wait(RETRY_DELAYS[attempt - 1]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ action, ...payload, requestId }),
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        signal: controller.signal,
      });
      if (!response.ok) {
        const retryable = RETRYABLE_STATUS.has(response.status);
        lastError = new ApiError({
          code: 'HTTP', status: response.status, requestId, attempt,
          message: retryable ? `服務暫時無法連線，已嘗試 ${attempt} 次（${response.status}）` : `服務回應異常（${response.status}）`,
        });
        if (retryable && attempt < maxAttempts) continue;
        throw lastError;
      }
      let result;
      try { result = await response.json(); }
      catch {
        lastError = new ApiError({ code: 'RESPONSE', message: '服務回應格式錯誤。', requestId, attempt });
        if (attempt < maxAttempts) continue;
        throw lastError;
      }
      if (!result.ok) {
        lastError = new ApiError({ ...result.error, requestId, attempt });
        if (lastError.code === 'SERVICE_BUSY' && attempt < maxAttempts) continue;
        throw lastError;
      }
      return result;
    } catch (error) {
      if (error instanceof ApiError && !['NETWORK', 'TIMEOUT', 'RESPONSE'].includes(error.code)) throw error;
      lastError = error instanceof ApiError ? error : new ApiError({
        code: error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', requestId, attempt,
        message: error?.name === 'AbortError' ? `服務讀取逾時，已嘗試 ${attempt} 次。` : `網路連線失敗，已嘗試 ${attempt} 次。`,
      });
      if (attempt >= maxAttempts) throw lastError;
    } finally { clearTimeout(timer); }
  }
  throw lastError;
}

export const api = new Proxy({}, { get: (_, action) => (payload) => request(action, payload) });
export const adminSession = { get: () => JSON.parse(sessionStorage.getItem('survey.admin') || 'null'), set: (v) => sessionStorage.setItem('survey.admin', JSON.stringify(v)), clear: () => sessionStorage.removeItem('survey.admin') };
export const userSession = { get: (id) => JSON.parse(sessionStorage.getItem(`survey.user.${id}`) || 'null'), set: (id, v) => sessionStorage.setItem(`survey.user.${id}`, JSON.stringify(v)), clear: (id) => sessionStorage.removeItem(`survey.user.${id}`) };
