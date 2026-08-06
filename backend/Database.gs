/**
 * Database.gs
 * 提供與 Google Sheet 及 Google Drive 互動的通用操作函式
 */

function getMasterDbId() {
  return PropertiesService.getScriptProperties().getProperty('MASTER_DB_ID');
}

function getMasterDb() {
  const id = getMasterDbId();
  if (!id) throw new Error("MASTER_DB_ID 未設定");
  return SpreadsheetApp.openById(id);
}

/**
 * 讀取工作表並回傳以欄位名稱為 key 的物件陣列
 */
function getSheetData(sheetName, spreadsheet = getMasterDb()) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * 將新紀錄寫入工作表
 */
function appendRowData(sheetName, recordObj, spreadsheet = getMasterDb()) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error("找不到工作表: " + sheetName);
  
  const headers = sheet.getDataRange().getValues()[0];
  const rowData = headers.map(header => recordObj[header] !== undefined ? recordObj[header] : "");
  
  sheet.appendRow(rowData);
}

/**
 * 更新符合條件的第一筆紀錄
 */
function updateRowData(sheetName, matchObj, updateObj, spreadsheet = getMasterDb()) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error("找不到工作表: " + sheetName);
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  
  const headers = data[0];
  const matchKeys = Object.keys(matchObj);
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let isMatch = true;
    
    for (let k of matchKeys) {
      const colIndex = headers.indexOf(k);
      if (colIndex === -1 || row[colIndex] !== matchObj[k]) {
        isMatch = false;
        break;
      }
    }
    
    if (isMatch) {
      const updateKeys = Object.keys(updateObj);
      for (let k of updateKeys) {
        const colIndex = headers.indexOf(k);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(updateObj[k]);
        }
      }
      return true; // 成功更新
    }
  }
  return false; // 找不到符合的紀錄
}

/**
 * 刪除符合條件的紀錄 (因可能有多筆，可自行決定要不要都刪)
 */
function deleteRowData(sheetName, matchObj, spreadsheet = getMasterDb()) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error("找不到工作表: " + sheetName);
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 0;
  
  const headers = data[0];
  const matchKeys = Object.keys(matchObj);
  let deletedCount = 0;
  
  // 由下往上刪除以避免索引問題
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    let isMatch = true;
    
    for (let k of matchKeys) {
      const colIndex = headers.indexOf(k);
      if (colIndex === -1 || row[colIndex] !== matchObj[k]) {
        isMatch = false;
        break;
      }
    }
    
    if (isMatch) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  
  return deletedCount;
}

/**
 * 記錄操作日誌
 */
function logAction(admin_id, project_id, operator_type, operator_id, action, target_type, target_id, description) {
  const logObj = {
    log_id: Utilities.getUuid(),
    admin_id: admin_id,
    project_id: project_id || '',
    operator_type: operator_type,
    operator_id: operator_id,
    action: action,
    target_type: target_type,
    target_id: target_id,
    description: description,
    created_at: new Date().toISOString()
  };
  appendRowData('系統操作紀錄', logObj);
}

/**
 * 為新專案建立獨立的資料夾與資料庫
 */
function createProjectDatabase(projectName, adminFolderId) {
  const adminFolder = DriveApp.getFolderById(adminFolderId);
  const projectFolder = adminFolder.createFolder(projectName + '_' + Utilities.getUuid().split('-')[0]);
  
  const ss = SpreadsheetApp.create(projectName + '_資料庫');
  const dbFileId = ss.getId();
  const file = DriveApp.getFileById(dbFileId);
  file.moveTo(projectFolder);
  
  // 建立必要工作表
  let schemaSheet = ss.insertSheet('FormSchema');
  schemaSheet.appendRow(['schema_json', 'updated_at']); // 儲存整個問卷結構 JSON
  
  let usersSheet = ss.insertSheet('Users');
  usersSheet.appendRow(['user_code', 'user_password', 'user_name', 'status']);
  
  let responsesSheet = ss.insertSheet('Responses');
  responsesSheet.appendRow(['response_id', 'user_code', 'status', 'start_time', 'submit_time', 'data_json']);
  
  let draftsSheet = ss.insertSheet('Drafts');
  draftsSheet.appendRow(['user_code', 'draft_json', 'updated_at']);
  
  let logsSheet = ss.insertSheet('Logs');
  logsSheet.appendRow(['log_id', 'user_code', 'action', 'created_at']);
  
  // 刪除預設工作表
  const defaultSheet = ss.getSheetByName('工作表1') || ss.getSheetByName('Sheet1');
  if (defaultSheet) {
    ss.deleteSheet(defaultSheet);
  }
  
  return {
    folderId: projectFolder.getId(),
    spreadsheetId: dbFileId
  };
}

