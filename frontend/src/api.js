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
  // Admin APIs
  adminLogin: (adminKey) => callApi('admin_login', { adminKey }),
  getProjects: (adminId) => callApi('admin_get_projects', { adminId }),
  createProject: (adminId, projectName) => callApi('admin_create_project', { adminId, projectName }),
  
  getFormSchema: (adminId, projectId) => callApi('admin_get_form_schema', { adminId, projectId }),
  saveFormSchema: (adminId, projectId, schemaJson) => callApi('admin_save_form_schema', { adminId, projectId, schemaJson }),
  
  getUsers: (adminId, projectId) => callApi('admin_get_users', { adminId, projectId }),
  batchImportUsers: (adminId, projectId, users) => callApi('admin_batch_import_users', { adminId, projectId, users }),
  
  getStats: (adminId, projectId) => callApi('admin_get_stats', { adminId, projectId }),
  
  // Responder APIs
  responderLogin: (projectId, userCode, userPassword) => callApi('responder_login', { projectId, userCode, userPassword }),
  getDraft: (projectId, userCode) => callApi('responder_get_draft', { projectId, userCode }),
  saveDraft: (projectId, userCode, draftJson) => callApi('responder_save_draft', { projectId, userCode, draftJson }),
  submitSurvey: (projectId, userCode, dataJson, startTime) => callApi('responder_submit_survey', { projectId, userCode, dataJson, startTime }),
  uploadFile: (projectId, filename, mimeType, base64Data) => callApi('upload_file', { projectId, filename, mimeType, base64Data }),
  
  // 測試連線
  ping: () => callApi('ping')
};
