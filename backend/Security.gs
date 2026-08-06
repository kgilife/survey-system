var SESSION_TTL_SECONDS_ = 6 * 60 * 60;
function sha256_(text) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join(''); }
function randomToken_() { return Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,''); }
function createSession_(kind, identity) { var token=randomToken_(); CacheService.getScriptCache().put('session:'+token,JSON.stringify({kind:kind,identity:identity}),SESSION_TTL_SECONDS_); return token; }
function session_(token, kind) { if(!token) throw apiError_('UNAUTHORIZED','登入已失效，請重新登入。'); var raw=CacheService.getScriptCache().get('session:'+token); if(!raw) throw apiError_('UNAUTHORIZED','登入已失效，請重新登入。'); var s=JSON.parse(raw); if(s.kind!==kind) throw apiError_('FORBIDDEN','您沒有執行此操作的權限。'); return s.identity; }
function destroySession_(token) { if(token) CacheService.getScriptCache().remove('session:'+token); }
function requireAdminProject_(input) { var admin=session_(input.token,'admin'); var project=projectById_(input.projectId); if(String(project.admin_id)!==String(admin.admin_id)) throw apiError_('FORBIDDEN','您沒有此專案的存取權限。'); return {admin:admin,project:project}; }
function requireRespondent_(input) { var user=session_(input.token,'respondent'); if(String(user.project_id)!==String(input.projectId)) throw apiError_('FORBIDDEN','您沒有此專案的存取權限。'); return user; }
function safeText_(v,max) { var s=String(v===undefined?'':v).trim(); if(s.length>(max||5000)) throw apiError_('VALIDATION','輸入內容過長。'); return s; }
function isWritable_(project) { var now=Date.now(); if(['開放填寫'].indexOf(project.project_status)<0) return false; if(project.start_date && now<new Date(project.start_date).getTime()) return false; if(project.end_date && now>new Date(project.end_date).getTime()) return false; return true; }
function loginRateKey_(type, value) { return 'attempt:'+type+':'+sha256_(value).slice(0,24); }
function assertLoginRate_(type,value) { var c=Number(CacheService.getScriptCache().get(loginRateKey_(type,value))||0); if(c>=8) throw apiError_('RATE_LIMIT','嘗試次數過多，請稍後再試。'); }
function failLogin_(type,value) { var key=loginRateKey_(type,value),cache=CacheService.getScriptCache(),c=Number(cache.get(key)||0)+1; cache.put(key,String(c),300); }
function clearLoginRate_(type,value) { CacheService.getScriptCache().remove(loginRateKey_(type,value)); }
