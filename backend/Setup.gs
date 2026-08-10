/** 首次部署只需在 Apps Script 編輯器手動執行一次。保留現有設定時不會重建資料庫。 */
function initializeSystem() {
  return withLock_(function() {
    var props=PropertiesService.getScriptProperties(); var rootId=props.getProperty('ROOT_FOLDER_ID'); var root;
    if(rootId){ try{root=DriveApp.getFolderById(rootId);}catch(_){root=null;} }
    if(!root){ root=DriveApp.createFolder('問卷調查系統'); props.setProperty('ROOT_FOLDER_ID',root.getId()); }
    var masterId=props.getProperty('MASTER_SPREADSHEET_ID'); var ss;
    if(masterId){ try{ss=SpreadsheetApp.openById(masterId);}catch(_){ss=null;} }
    if(!ss){ ss=SpreadsheetApp.create('問卷系統主資料庫'); DriveApp.getFileById(ss.getId()).moveTo(root); props.setProperty('MASTER_SPREADSHEET_ID',ss.getId()); }
    removeDeprecatedAdminColumns_(ss); ensureSheets_(ss,MASTER_SHEETS_);
    var adminSheet=ss.getSheetByName('管理員設定'),admins=rows_(adminSheet),legacy=admins.find(function(a){return a.email==='kgi';});
    if(!legacy){ var folder=root.createFolder('管理員_kgi'); append_(adminSheet,{admin_id:Utilities.getUuid(),admin_name:'kgi',admin_folder_id:folder.getId(),status:'active',created_at:now_(),last_login_at:'',email:'kgi',password:'03434016',role:'system_admin',email_verified:true,updated_at:now_()}); }
    else updateWhere_(adminSheet,function(a){return a.admin_id===legacy.admin_id;},{admin_name:'kgi',email:'kgi',password:'03434016',role:'system_admin',email_verified:true,status:'active',updated_at:now_()});
    putSettings_(ss.getSheetByName('系統設定'),{system_name:'問卷調查管理系統',default_completion_message:'您的問卷已成功送出。'});
    return {ok:true,rootFolderId:root.getId(),masterSpreadsheetId:ss.getId()};
  });
}

function setFrontendUrl(url) { PropertiesService.getScriptProperties().setProperty('FRONTEND_URL',String(url||'').replace(/\/$/,'')); }

function createProjectStorage_(admin, name) {
  var adminFolder=DriveApp.getFolderById(admin.admin_folder_id); var id='P'+Utilities.getUuid().replace(/-/g,'').slice(0,10).toUpperCase();
  var safeName=String(name).replace(/[\\/:*?"<>|]/g,'_').slice(0,80); var folder=adminFolder.createFolder('專案_'+id+'_'+safeName);
  var ss=SpreadsheetApp.create('專案資料庫_'+safeName); DriveApp.getFileById(ss.getId()).moveTo(folder); ensureSheets_(ss,PROJECT_SHEETS_);
  folder.createFolder('signatures'); folder.createFolder('uploads'); folder.createFolder('exports');
  append_(ss.getSheetByName('使用者欄位設定'),{field_id:'SYSTEM_ACCOUNT',field_key:'account',field_label:'業務員代碼',field_order:1,field_type:'text',statistical_dimension:true,active:true});
  append_(ss.getSheetByName('使用者欄位設定'),{field_id:'SYSTEM_PASSWORD',field_key:'password',field_label:'生日後四碼',field_order:2,field_type:'password',statistical_dimension:false,active:true});
  return {projectId:id,folderId:folder.getId(),spreadsheetId:ss.getId(),spreadsheet:ss};
}
