var MASTER_SHEETS_ = {
  '管理員設定': ['admin_id','admin_name','admin_folder_id','status','created_at','last_login_at','email','password','role','email_verified','updated_at'],
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
  '連結型矩陣問項設定': ['question_id','prompt_id','prompt_label','prompt_order','active','prompt_type','prompt_options_json','prompt_required','prompt_config_json'],
  '使用者回答': ['answer_id','account','question_id','answer_value','answer_display','attachment_ids','status','created_at','updated_at','submitted_at','updated_by'],
  '填寫狀態': ['account','status','first_saved_at','last_saved_at','first_submitted_at','last_submitted_at','last_login_at','revision_count','updated_by'],
  '附件紀錄': ['attachment_id','account','question_id','attachment_type','file_name','drive_file_id','file_size','mime_type','uploaded_at','active'],
  '專案操作紀錄': ['log_id','operator_type','operator_id','action','target_type','target_id','description','created_at'],
  '庫存設定': ['question_id','option_value','initial_stock','remaining_stock','active','updated_at'],
  '庫存異動紀錄': ['transaction_id','account','question_id','option_value','quantity_delta','before_quantity','after_quantity','action','created_at'],
  '請求去重紀錄': ['request_id','account','action','response_json','created_at']
};

function now_() { return new Date().toISOString(); }
function withLock_(fn) { var lock = LockService.getScriptLock(); if(!lock.tryLock(30000))throw apiError_('SERVICE_BUSY','目前同時儲存的人較多，系統將自動重試。'); try { return fn(); } finally { lock.releaseLock(); } }

function withIdempotentRequest_(ss,input,account,action,fn) {
  return withLock_(function() {
    var requestId=safeText_(input.requestId||'',100);
    if(!requestId)return fn();
    var sheet=ss.getSheetByName('請求去重紀錄');
    if(!sheet){sheet=ss.insertSheet('請求去重紀錄');sheet.getRange(1,1,1,5).setValues([PROJECT_SHEETS_['請求去重紀錄']]).setFontWeight('bold').setBackground('#dbeafe');sheet.setFrozenRows(1);}
    var existing=rows_(sheet).find(function(r){return r.request_id===requestId;});
    if(existing){
      if(existing.account!==account||existing.action!==action)throw apiError_('BAD_REQUEST','請求識別碼不可重複使用。');
      return parseJson_(existing.response_json,{ok:true});
    }
    var response=fn();
    append_(sheet,{request_id:requestId,account:account,action:action,response_json:JSON.stringify(response),created_at:now_()});
    return response;
  });
}
function cleanCell_(value) { return value instanceof Date ? value.toISOString() : value; }

function cleanCellForColumn_(header, value) {
  var cleaned = cleanCell_(value);
  // Formatting a pre-existing numeric Sheet cell as plain text does not change
  // the value returned by getValues(). Normalize text columns while reading so
  // legacy digit-only accounts/IDs compare the same as form input.
  return cleaned !== '' && isPlainTextColumn_(header) ? String(cleaned) : cleaned;
}

// Google Sheets may interpret digit-only strings as numbers and discard leading zeroes.
// Keep every non-numeric/boolean database field as plain text before writing values.
function isPlainTextColumn_(header) {
  return !{
    question_order:true, option_order:true, prompt_order:true, field_order:true,
    file_size:true, initial_stock:true, remaining_stock:true, quantity_delta:true,
    before_quantity:true, after_quantity:true, revision_count:true,
    active:true, required:true, statistical_dimension:true
  }[String(header)];
}

function formatPlainTextColumns_(sheet, headers, startRow, rowCount) {
  if (rowCount < 1) return;
  headers.forEach(function(header, index) {
    if (isPlainTextColumn_(header)) sheet.getRange(startRow, index + 1, rowCount, 1).setNumberFormat('@');
  });
}

function ensureSheets_(ss, definitions) {
  Object.keys(definitions).forEach(function(name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = definitions[name];
    if (!sheet.getLastRow()) sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#dbeafe');
    else {
      var current = sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn())).getValues()[0];
      headers.forEach(function(header, index) { if (!current[index]) sheet.getRange(1, index + 1).setValue(header); });
    }
    formatPlainTextColumns_(sheet, headers, 2, Math.max(0, sheet.getMaxRows() - 1));
    sheet.setFrozenRows(1);
  });
}

function removeDeprecatedAdminColumns_(ss) {
  var sheet=ss.getSheetByName('管理員設定'); if(!sheet||!sheet.getLastColumn())return;
  var headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
  ['admin_key_hash'].forEach(function(name){var index=headers.indexOf(name);if(index>=0){sheet.deleteColumn(index+1);headers.splice(index,1);}});
}

function rows_(sheet) {
  if (!sheet) return [];
  // Avoid a separate getLastRow() RPC; Spreadsheet calls dominate GAS latency.
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values.shift().map(String);
  return values.filter(function(row) { return row.some(function(v) { return v !== ''; }); }).map(function(row) {
    var item = {}; headers.forEach(function(h, i) { item[h] = cleanCellForColumn_(h, row[i]); }); return item;
  });
}

function append_(sheet, record) {
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  formatPlainTextColumns_(sheet,headers,sheet.getLastRow()+1,1);
  sheet.appendRow(headers.map(function(h) { return record[h] === undefined ? '' : record[h]; })); return record;
}

function replaceAll_(sheet, records) {
  var last = sheet.getLastRow(); if (last > 1) sheet.getRange(2,1,last-1,sheet.getLastColumn()).clearContent();
  if (!records.length) return;
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  formatPlainTextColumns_(sheet,headers,2,records.length);
  sheet.getRange(2,1,records.length,headers.length).setValues(records.map(function(r) { return headers.map(function(h) { return r[h] === undefined ? '' : r[h]; }); }));
}

function updateWhere_(sheet, predicate, changes) {
  var values = sheet.getDataRange().getValues(); if (values.length < 2) return false;
  var headers = values[0].map(String),matched=[];
  for (var r=1; r<values.length; r++) {
    var item={}; headers.forEach(function(h,i){ item[h]=cleanCellForColumn_(h,values[r][i]); });
    if (predicate(item)) matched.push(r+1);
  }
  if (!matched.length) return false;
  Object.keys(changes).forEach(function(k){
    var c=headers.indexOf(k); if(c<0)return;
    var targets=sheet.getRangeList(matched.map(function(row){return columnName_(c+1)+row;}));
    if(isPlainTextColumn_(k))targets.setNumberFormat('@');
    targets.setValue(changes[k]);
  });
  return true;
}

function columnName_(column){var name='';while(column>0){var remainder=(column-1)%26;name=String.fromCharCode(65+remainder)+name;column=Math.floor((column-1)/26);}return name;}

function deleteWhere_(sheet, predicate) {
  var data = rows_(sheet), kept = data.filter(function(x){ return !predicate(x); }); var count=data.length-kept.length; replaceAll_(sheet,kept); return count;
}

function master_() { var id=PropertiesService.getScriptProperties().getProperty('MASTER_SPREADSHEET_ID'); if(!id) throw apiError_('NOT_INITIALIZED','系統尚未初始化。'); return SpreadsheetApp.openById(id); }
function projectById_(id) { var p=rows_(master_().getSheetByName('專案索引')).find(function(x){ return String(x.project_id)===String(id); }); if(!p) throw apiError_('NOT_FOUND','找不到此專案。'); return p; }
function projectDb_(project) { return SpreadsheetApp.openById((project.spreadsheet_id || project)); }
function settingMap_(sheet) { var out={}; rows_(sheet).forEach(function(x){ out[x.key]=parseJson_(x.value,x.value); }); return out; }
function parseJson_(value, fallback) { if(typeof value!=='string') return value; try{return JSON.parse(value);}catch(_){return fallback;} }
function putSettings_(sheet, values) { var current=rows_(sheet); Object.keys(values).forEach(function(k){ var found=current.find(function(x){return x.key===k;}); var val=typeof values[k]==='string'?values[k]:JSON.stringify(values[k]); if(found) updateWhere_(sheet,function(x){return x.key===k;},{value:val,updated_at:now_()}); else append_(sheet,{key:k,value:val,updated_at:now_()}); }); }
