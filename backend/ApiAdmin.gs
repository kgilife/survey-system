// ==========================================
// 管理員 API
// ==========================================

function apiAdminCreateProject(params) {
  const { adminId, projectName } = params;
  if (!adminId || !projectName) return { success: false, message: '參數不齊全' };

  const admins = getSheetData('管理員設定');
  const admin = admins.find(a => a.admin_id === adminId);
  if (!admin) return { success: false, message: '找不到管理員' };

  try {
    // 建立獨立資料庫與資料夾
    const dbInfo = createProjectDatabase(projectName, admin.admin_folder_id);
    const projectId = Utilities.getUuid();
    
    // 取得網址 (假設 GAS WebApp URL, 實際上前端由 GitHub Pages 託管, 可以產生帶 query string 的 login url)
    const loginUrl = "?project=" + projectId;

    const projectRecord = {
      project_id: projectId,
      admin_id: adminId,
      project_name: projectName,
      project_status: 'draft',
      folder_id: dbInfo.folderId,
      spreadsheet_id: dbInfo.spreadsheetId,
      login_url: loginUrl,
      start_date: '',
      end_date: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    appendRowData('專案索引', projectRecord);
    logAction(adminId, projectId, '管理員', adminId, '建立專案', '專案', projectId, '建立新專案: ' + projectName);
    
    return { success: true, message: '專案建立成功', data: projectRecord };
  } catch (err) {
    return { success: false, message: '建立失敗: ' + err.toString() };
  }
}

function apiAdminDeleteProject(params) {
  const { adminId, projectId } = params;
  if (!adminId || !projectId) return { success: false, message: '參數不齊全' };

  // TODO: 安全起見, 可以檢查該專案是否屬於此 admin
  deleteRowData('專案索引', { project_id: projectId, admin_id: adminId });
  logAction(adminId, projectId, '管理員', adminId, '刪除專案', '專案', projectId, '刪除專案');
  
  return { success: true, message: '專案刪除成功' };
}

function apiAdminUpdateProjectStatus(params) {
  const { adminId, projectId, status } = params;
  if (!adminId || !projectId || !status) return { success: false, message: '參數不齊全' };

  updateRowData('專案索引', { project_id: projectId, admin_id: adminId }, { project_status: status, updated_at: new Date().toISOString() });
  return { success: true, message: '狀態更新成功' };
}

// ---- 表單設計 API ----

function getProjectSpreadsheet(projectId) {
  const projects = getSheetData('專案索引');
  const project = projects.find(p => p.project_id === projectId);
  if (!project) throw new Error('找不到專案');
  return SpreadsheetApp.openById(project.spreadsheet_id);
}

function getProjectFolderId(projectId) {
  const projects = getSheetData('專案索引');
  const project = projects.find(p => p.project_id === projectId);
  if (!project) throw new Error('找不到專案');
  return project.folder_id;
}

function apiAdminSaveFormSchema(params) {
  const { adminId, projectId, schemaJson } = params;
  try {
    const ss = getProjectSpreadsheet(projectId);
    const schemaSheet = ss.getSheetByName('FormSchema');
    // 清空舊資料
    schemaSheet.getRange(2, 1, schemaSheet.getMaxRows(), 2).clearContent();
    schemaSheet.appendRow([JSON.stringify(schemaJson), new Date().toISOString()]);
    return { success: true, message: '表單儲存成功' };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

function apiAdminGetFormSchema(params) {
  const { projectId } = params; // 可以是前台或後台呼叫
  try {
    const ss = getProjectSpreadsheet(projectId);
    const sheet = ss.getSheetByName('FormSchema');
    const data = sheet.getDataRange().getValues();
    if (data.length > 1) {
      return { success: true, data: JSON.parse(data[1][0]) }; // schema_json 在 A2
    }
    return { success: true, data: null };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

// ---- 名單管理 API ----

function apiAdminBatchImportUsers(params) {
  const { adminId, projectId, users } = params; // users is array of {user_code, user_password, user_name}
  try {
    const ss = getProjectSpreadsheet(projectId);
    const usersSheet = ss.getSheetByName('Users');
    
    // 為了簡單起見，直接 append
    users.forEach(u => {
      usersSheet.appendRow([u.user_code, u.user_password, u.user_name || '', 'active']);
    });
    return { success: true, message: '匯入成功' };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

function apiAdminGetUsers(params) {
  const { adminId, projectId } = params;
  try {
    const ss = getProjectSpreadsheet(projectId);
    const data = getSheetData('Users', ss);
    return { success: true, data: data };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

function apiAdminGetStats(params) {
  const { adminId, projectId } = params;
  try {
    const ss = getProjectSpreadsheet(projectId);
    const responses = getSheetData('Responses', ss);
    return { success: true, data: responses };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}
