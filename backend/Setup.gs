/**
 * Setup.gs
 * 此腳本用於系統首次初始化。
 * 會在使用者的 Google Drive 指定資料夾內建立主資料庫與目錄。
 */

const SYSTEM_ROOT_FOLDER_ID = '17uP5-zEjLHbqYzzdYjWMXOWzig_GhsIC';

function initializeSystem() {
  try {
    const rootFolder = DriveApp.getFolderById(SYSTEM_ROOT_FOLDER_ID);
    
    // 檢查是否已存在「系統管理資料」資料夾
    let adminFolderIter = rootFolder.getFoldersByName('系統管理資料');
    let adminFolder;
    if (adminFolderIter.hasNext()) {
      adminFolder = adminFolderIter.next();
      Logger.log('「系統管理資料」資料夾已存在');
    } else {
      adminFolder = rootFolder.createFolder('系統管理資料');
      Logger.log('已建立「系統管理資料」資料夾');
    }
    
    // 檢查是否已存在主資料庫
    let dbFileIter = adminFolder.getFilesByName('問卷系統主資料庫');
    let dbFileId = null;
    if (dbFileIter.hasNext()) {
      dbFileId = dbFileIter.next().getId();
      Logger.log('「問卷系統主資料庫」已存在，ID: ' + dbFileId);
    } else {
      // 建立新的 Google Sheet
      const ss = SpreadsheetApp.create('問卷系統主資料庫');
      dbFileId = ss.getId();
      
      // 將新建的試算表移動到「系統管理資料」資料夾
      const file = DriveApp.getFileById(dbFileId);
      file.moveTo(adminFolder);
      
      // 初始化工作表
      initMasterDatabaseSheets(ss);
      Logger.log('已建立並初始化「問卷系統主資料庫」，ID: ' + dbFileId);
    }
    
    // 設定 PropertiesService 以供後續 API 使用
    PropertiesService.getScriptProperties().setProperty('MASTER_DB_ID', dbFileId);
    PropertiesService.getScriptProperties().setProperty('ROOT_FOLDER_ID', SYSTEM_ROOT_FOLDER_ID);
    
    Logger.log('系統初始化成功！請前往專案屬性確認 MASTER_DB_ID 已設定。');
    
  } catch (error) {
    Logger.log('初始化失敗: ' + error.toString());
  }
}

function initMasterDatabaseSheets(ss) {
  // 建立「管理員設定」
  let adminSheet = ss.insertSheet('管理員設定');
  adminSheet.appendRow(['admin_id', 'admin_name', 'admin_key_hash', 'admin_folder_id', 'status', 'created_at', 'last_login_at']);
  // 寫入第一位預設管理員 (金鑰 03434016 的 hash，為了簡化直接存明文或簡單 hash，但在需求書中要求 hash)
  // 此處先用 SHA-256 hash 模擬
  const defaultAdminId = Utilities.getUuid();
  const defaultKey = '03434016';
  const defaultKeyHash = hashString(defaultKey);
  
  // 為預設管理員在系統根目錄下建立獨立資料夾
  const rootFolder = DriveApp.getFolderById(SYSTEM_ROOT_FOLDER_ID);
  const adminDriveFolder = rootFolder.createFolder('管理員_預設');
  
  adminSheet.appendRow([defaultAdminId, '預設管理員', defaultKeyHash, adminDriveFolder.getId(), 'active', new Date().toISOString(), '']);
  
  // 建立「專案索引」
  let projectSheet = ss.insertSheet('專案索引');
  projectSheet.appendRow(['project_id', 'admin_id', 'project_name', 'project_status', 'folder_id', 'spreadsheet_id', 'login_url', 'start_date', 'end_date', 'created_at', 'updated_at']);
  
  // 建立「系統設定」
  let configSheet = ss.insertSheet('系統設定');
  configSheet.appendRow(['config_key', 'config_value', 'description']);
  configSheet.appendRow(['VERSION', '1.0.0', '系統版本']);
  
  // 建立「系統操作紀錄」
  let logSheet = ss.insertSheet('系統操作紀錄');
  logSheet.appendRow(['log_id', 'admin_id', 'project_id', 'operator_type', 'operator_id', 'action', 'target_type', 'target_id', 'description', 'created_at']);
  
  // 刪除預設的「工作表1」
  const defaultSheet = ss.getSheetByName('工作表1') || ss.getSheetByName('Sheet1');
  if (defaultSheet) {
    ss.deleteSheet(defaultSheet);
  }
}

function hashString(input) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) {
      hashVal += 256;
    }
    if (hashVal.toString(16).length == 1) {
      txtHash += '0';
    }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}
