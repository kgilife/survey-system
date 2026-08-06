// ==========================================
// 填寫端 (Responder) API
// ==========================================

function apiResponderLogin(params) {
  const { projectId, userCode, userPassword } = params;
  if (!projectId || !userCode || !userPassword) return { success: false, message: '參數不齊全' };

  try {
    const ss = getProjectSpreadsheet(projectId);
    const users = getSheetData('Users', ss);
    
    const user = users.find(u => u.user_code === userCode && u.user_password === userPassword);
    if (!user) return { success: false, message: '帳號或密碼錯誤' };
    if (user.status !== 'active') return { success: false, message: '此帳號已停用' };

    return { 
      success: true, 
      message: '登入成功', 
      data: {
        user_code: user.user_code,
        user_name: user.user_name
      }
    };
  } catch (err) {
    return { success: false, message: '登入失敗: ' + err.toString() };
  }
}

function apiResponderSaveDraft(params) {
  const { projectId, userCode, draftJson } = params;
  if (!projectId || !userCode) return { success: false, message: '參數不齊全' };

  try {
    const ss = getProjectSpreadsheet(projectId);
    const draftsSheet = ss.getSheetByName('Drafts');
    
    // 檢查是否已有暫存
    const drafts = getSheetData('Drafts', ss);
    const existing = drafts.find(d => d.user_code === userCode);
    
    const updatedTime = new Date().toISOString();
    
    if (existing) {
      updateRowData('Drafts', { user_code: userCode }, { draft_json: JSON.stringify(draftJson), updated_at: updatedTime }, ss);
    } else {
      draftsSheet.appendRow([userCode, JSON.stringify(draftJson), updatedTime]);
    }
    
    return { success: true, message: '暫存成功', data: { updated_at: updatedTime } };
  } catch (err) {
    return { success: false, message: '暫存失敗: ' + err.toString() };
  }
}

function apiResponderGetDraft(params) {
  const { projectId, userCode } = params;
  try {
    const ss = getProjectSpreadsheet(projectId);
    const drafts = getSheetData('Drafts', ss);
    const existing = drafts.find(d => d.user_code === userCode);
    
    if (existing) {
      return { success: true, data: JSON.parse(existing.draft_json) };
    }
    return { success: true, data: null };
  } catch (err) {
    return { success: false, message: '取得暫存失敗: ' + err.toString() };
  }
}

function apiResponderSubmitSurvey(params) {
  const { projectId, userCode, dataJson, startTime } = params;
  if (!projectId || !userCode) return { success: false, message: '參數不齊全' };

  try {
    const ss = getProjectSpreadsheet(projectId);
    const responsesSheet = ss.getSheetByName('Responses');
    
    const submitTime = new Date().toISOString();
    const responseId = Utilities.getUuid();
    
    responsesSheet.appendRow([responseId, userCode, 'submitted', startTime || '', submitTime, JSON.stringify(dataJson)]);
    
    // 送出後刪除暫存
    deleteRowData('Drafts', { user_code: userCode }, ss);
    
    return { success: true, message: '問卷送出成功' };
  } catch (err) {
    return { success: false, message: '送出失敗: ' + err.toString() };
  }
}

// 檔案上傳 (共用)
// params: { projectId, filename, mimeType, base64Data }
function apiUploadFile(params) {
  const { projectId, filename, mimeType, base64Data } = params;
  if (!projectId || !base64Data) return { success: false, message: '參數不齊全' };

  try {
    const folderId = getProjectFolderId(projectId);
    const folder = DriveApp.getFolderById(folderId);
    
    // 檢查是否有 Uploads 資料夾
    let uploadsFolder;
    const folders = folder.getFoldersByName('Uploads');
    if (folders.hasNext()) {
      uploadsFolder = folders.next();
    } else {
      uploadsFolder = folder.createFolder('Uploads');
    }
    
    // Decode base64
    const data = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(data, mimeType, filename);
    
    const file = uploadsFolder.createFile(blob);
    // 設定共用權限為知道連結的人可檢視 (如果是圖片預覽需要)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return { success: true, url: file.getDownloadUrl(), fileId: file.getId() };
  } catch (err) {
    return { success: false, message: '上傳失敗: ' + err.toString() };
  }
}
