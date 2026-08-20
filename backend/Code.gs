/** 問卷調查系統 Web App 入口。所有動作只接受明確白名單。 */
function doGet(e) { return routeRequest_(e, 'GET'); }
function doPost(e) { return routeRequest_(e, 'POST'); }

function routeRequest_(e, method) {
  try {
    var input = parseRequest_(e, method);
    var action = String(input.action || '');
    if (method === 'GET' && action === 'ping') return json_({ ok: true, data: { pong: true, time: now_() } });
    var handler = API_ROUTES_[action];
    if (!handler) throw apiError_('NOT_FOUND', '找不到指定功能。');
    return json_(handler(input));
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ ok: false, error: normalizeError_(error) });
  }
}

var API_ROUTES_ = {
  register: register_, forgotPassword: forgotPassword_, resetPassword: resetPassword_,
  adminProfile: adminProfile_, adminUpdateProfile: adminUpdateProfile_,
  adminLogin: adminLogin_, adminLogout: adminLogout_, adminProjects: adminProjects_,
  adminCreateProject: adminCreateProject_, adminUpdateProject: adminUpdateProject_,
  adminCloneProject: adminCloneProject_, adminArchiveProject: adminArchiveProject_,
  adminDeleteProject: adminDeleteProject_, adminProject: adminProject_,
  adminSaveSchema: adminSaveSchema_, adminSaveUserFields: adminSaveUserFields_,
  adminImportUsers: adminImportUsers_, adminSaveLinkedOptions: adminSaveLinkedOptions_,
  adminUsers: adminUsers_, adminResponses: adminResponses_, adminUpdateResponse: adminUpdateResponse_,
  adminStats: adminStats_, adminLogs: adminLogs_, adminAttachments: adminAttachments_,
  adminAdvancedAnalytics: adminAdvancedAnalytics_,
  adminDeleteAttachment: adminDeleteAttachment_, adminDownloadAllAttachments: adminDownloadAllAttachments_, adminExport: adminExport_, adminSetFrontendUrl: adminSetFrontendUrl_,
  adminUpload: adminUpload_,
  adminQuestionImageUpload: adminQuestionImageUpload_,
  adminInventory: adminInventory_, adminAdjustInventory: adminAdjustInventory_,
  adminMigrateSystem: adminMigrateSystem_,
  respondentProject: respondentProject_, respondentLogin: respondentLogin_, respondentGuestLogin: respondentGuestLogin_, respondentLogout: respondentLogout_,
  respondentSurvey: respondentSurvey_, respondentSave: respondentSave_, respondentSubmit: respondentSubmit_,
  respondentUpload: respondentUpload_, respondentDeleteAttachment: respondentDeleteAttachment_,
  attachmentDownload: attachmentDownload_
};

function parseRequest_(e, method) {
  if (method === 'POST') {
    var raw = e && e.postData && e.postData.contents;
    if (!raw) throw apiError_('BAD_REQUEST', '請求內容不可空白。');
    try { return JSON.parse(raw); } catch (_) { throw apiError_('BAD_REQUEST', 'JSON 格式錯誤。'); }
  }
  return e && e.parameter ? e.parameter : {};
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function apiError_(code, message, details) { var e = new Error(message); e.code = code; e.details = details || null; return e; }
function normalizeError_(e) { return { code: e.code || 'INTERNAL', message: e.code ? e.message : '系統暫時無法處理，請稍後再試。', details: e.details || null }; }
