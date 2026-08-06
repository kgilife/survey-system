/**
 * Code.gs
 * Google Apps Script Web App 的主要進入點
 * 處理 GET 與 POST 請求
 */

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  // 設定 CORS headers 回應 (雖然 GAS 預設對 ContentService JSON 會有自己的機制，但在回應時我們標準化輸出格式)
  let responseData = {
    success: false,
    message: "Unknown error",
    data: null
  };

  try {
    let params;
    if (method === 'GET') {
      params = e.parameter;
    } else {
      // POST 可能是 JSON payload
      if (e.postData && e.postData.contents) {
        params = JSON.parse(e.postData.contents);
      } else {
        params = e.parameter;
      }
    }

    const action = params.action;
    
    switch (action) {
      case 'admin_login':
        responseData = apiAdminLogin(params);
        break;
      case 'admin_get_projects':
        responseData = apiAdminGetProjects(params);
        break;
      case 'ping':
        responseData = { success: true, message: 'pong', data: new Date().toISOString() };
        break;
      default:
        responseData = { success: false, message: 'Action not found: ' + action, data: null };
    }
  } catch (error) {
    responseData = { success: false, message: error.toString(), data: null };
  }

  // 將結果轉為 JSON 字串回傳
  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// API 邏輯實作
// ==========================================

function apiAdminLogin(params) {
  const adminKey = params.adminKey;
  if (!adminKey) {
    return { success: false, message: '管理金鑰錯誤，請重新輸入。', data: null };
  }
  
  const keyHash = hashString(adminKey);
  const admins = getSheetData('管理員設定');
  
  const admin = admins.find(a => a.admin_key_hash === keyHash && a.status === 'active');
  
  if (admin) {
    // 更新最後登入時間
    updateRowData('管理員設定', { admin_id: admin.admin_id }, { last_login_at: new Date().toISOString() });
    
    // 記錄登入操作
    logAction(admin.admin_id, '', '管理員', admin.admin_id, '登入', '系統', '', '管理員登入成功');
    
    return {
      success: true,
      message: '登入成功',
      data: {
        admin_id: admin.admin_id,
        admin_name: admin.admin_name
      }
    };
  } else {
    // 依據需求書：登入錯誤時統一顯示「管理金鑰錯誤，請重新輸入。」
    return { success: false, message: '管理金鑰錯誤，請重新輸入。', data: null };
  }
}

function apiAdminGetProjects(params) {
  const adminId = params.adminId;
  if (!adminId) {
    return { success: false, message: '未授權的請求', data: null };
  }
  
  const projects = getSheetData('專案索引');
  const myProjects = projects.filter(p => p.admin_id === adminId);
  
  return {
    success: true,
    message: '取得專案列表成功',
    data: myProjects
  };
}
