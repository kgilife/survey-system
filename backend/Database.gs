var MASTER_SHEETS_ = {
  '管理員設定': ['admin_id','admin_name','admin_key_hash','admin_folder_id','status','created_at','last_login_at','email','password','role','email_verified','updated_at'],
  '密碼重設紀錄': ['reset_id','admin_id','token_hash','expires_at','used_at','requested_at'],
  '專案索引': ['project_id','admin_id','project_name','project_status','folder_id','spreadsheet_id','login_url','start_date','end_date','created_at','updated_at'],
  '系統設定': ['key','value','updated_at'],
  '系統操作紀錄': ['log_id','admin_id','project_id','operator_type','operator_id','action','target_type','target_id','description','created_at']
};

var PROJECT_SHEETS_ = {
  '專案設定': ['key','value','updated_at'],
  '使用者欄位設定': ['field_id','field_key','field_label','field_order','field_type','statistical_dimension','active'],
  '問卷使用者設定': ['account','password_hash','profile_json','status','created_at','updated_at'],
  '問項設計': ['question_id','section_id','question_order','type','title','description','required','config_json','validation_json','active','updated_at'],
  '一般選項設定': ['question_id','option_value','option_label','option_order','next_section_id','active','option_config_json'],
  '連結型選項設定': ['question_id','account','option_value','option_label','option_order','active'],
  '使用者回答': ['answer_id','account','question_id','answer_value','answer_display','attachment_ids','status','created_at','updated_at','submitted_at','updated_by'],
  '填寫狀態': ['account','status','first_saved_at','last_saved_at','first_submitted_at','last_submitted_at','last_login_at','revision_count','updated_by'],
  '附件紀錄': ['attachment_id','account','question_id','attachment_type','file_name','drive_file_id','file_size','mime_type','uploaded_at','active'],
  '專案操作紀錄': ['log_id','operator_type','operator_id','action','target_type','target_id','description','created_at'],
  '庫存設定': ['question_id','option_value','initial_stock','remaining_stock','active','updated_at'],
  '庫存異動紀錄': ['transaction_id','account','question_id','option_value','quantity_delta','before_quantity','after_quantity','action','created_at']
};

function now_() { return new Date().toISOString(); }
function withLock_(fn) { var lock = LockService.getScriptLock(); lock.waitLock(30000); try { return fn(); } finally { lock.releaseLock(); } }
function cleanCell_(value) { return value instanceof Date ? value.toISOString() : value; }

function ensureSheets_(ss, definitions) {
  Object.keys(definitions).forEach(function(name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = definitions[name];
    if (!sheet.getLastRow()) sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#dbeafe');
    else {
      var current = sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn())).getValues()[0];
      headers.forEach(function(header, index) { if (!current[index]) sheet.getRange(1, index + 1).setValue(header); });
    }
    sheet.setFrozenRows(1);
  });
}

function rows_(sheet) {
  if (!sheet) return [];
  // Avoid a separate getLastRow() RPC; Spreadsheet calls dominate GAS latency.
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values.shift().map(String);
  return values.filter(function(row) { return row.some(function(v) { return v !== ''; }); }).map(function(row) {
    var item = {}; headers.forEach(function(h, i) { item[h] = cleanCell_(row[i]); }); return item;
  });
}

function append_(sheet, record) {
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function(h) { return record[h] === undefined ? '' : record[h]; })); return record;
}

function replaceAll_(sheet, records) {
  var last = sheet.getLastRow(); if (last > 1) sheet.getRange(2,1,last-1,sheet.getLastColumn()).clearContent();
  if (!records.length) return;
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  sheet.getRange(2,1,records.length,headers.length).setValues(records.map(function(r) { return headers.map(function(h) { return r[h] === undefined ? '' : r[h]; }); }));
}

function updateWhere_(sheet, predicate, changes) {
  var values = sheet.getDataRange().getValues(); if (values.length < 2) return false;
  var headers = values[0].map(String); var changed = false;
  for (var r=1; r<values.length; r++) {
    var item={}; headers.forEach(function(h,i){ item[h]=cleanCell_(values[r][i]); });
    if (predicate(item)) { Object.keys(changes).forEach(function(k){ var c=headers.indexOf(k); if(c>=0) values[r][c]=changes[k]; }); changed=true; }
  }
  if (changed) sheet.getRange(1,1,values.length,headers.length).setValues(values); return changed;
}

function deleteWhere_(sheet, predicate) {
  var data = rows_(sheet), kept = data.filter(function(x){ return !predicate(x); }); var count=data.length-kept.length; replaceAll_(sheet,kept); return count;
}

function master_() { var id=PropertiesService.getScriptProperties().getProperty('MASTER_SPREADSHEET_ID'); if(!id) throw apiError_('NOT_INITIALIZED','系統尚未初始化。'); var ss=SpreadsheetApp.openById(id);ensureSheets_(ss,MASTER_SHEETS_);return ss; }
function projectById_(id) { var p=rows_(master_().getSheetByName('專案索引')).find(function(x){ return String(x.project_id)===String(id); }); if(!p) throw apiError_('NOT_FOUND','找不到此專案。'); return p; }
function projectDb_(project) { var ss=SpreadsheetApp.openById((project.spreadsheet_id || project));ensureSheets_(ss,PROJECT_SHEETS_);return ss; }
function settingMap_(sheet) { var out={}; rows_(sheet).forEach(function(x){ out[x.key]=parseJson_(x.value,x.value); }); return out; }
function parseJson_(value, fallback) { if(typeof value!=='string') return value; try{return JSON.parse(value);}catch(_){return fallback;} }
function putSettings_(sheet, values) { var current=rows_(sheet); Object.keys(values).forEach(function(k){ var found=current.find(function(x){return x.key===k;}); var val=typeof values[k]==='string'?values[k]:JSON.stringify(values[k]); if(found) updateWhere_(sheet,function(x){return x.key===k;},{value:val,updated_at:now_()}); else append_(sheet,{key:k,value:val,updated_at:now_()}); }); }
