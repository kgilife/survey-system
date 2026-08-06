const GAS_API_URL = import.meta.env.VITE_GAS_API_URL || '';

/**
 * 封裝對 GAS API 的呼叫
 */
async function callApi(action, payload = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, message: '網路連線錯誤，請稍後再試', data: null };
  }
}

export const api = {
  // 管理員登入
  adminLogin: (adminKey) => callApi('admin_login', { adminKey }),
  
  // 取得管理員專案列表
  getProjects: (adminId) => callApi('admin_get_projects', { adminId }),
  
  // 測試連線
  ping: () => callApi('ping')
};
