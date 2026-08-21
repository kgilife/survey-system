var SESSION_TTL_SECONDS_ = 6 * 60 * 60;
function sha256_(text) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join(''); }
function sessionSecret_() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('SESSION_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SESSION_SECRET', secret);
  }
  return secret;
}
function createSession_(kind, identity) {
  var exp = Date.now() + SESSION_TTL_SECONDS_ * 1000;
  var payload = { kind: kind, identity: identity, exp: exp, nonce: Utilities.getUuid() };
  var payloadStr = Utilities.base64Encode(JSON.stringify(payload), Utilities.Charset.UTF_8);
  var secret = sessionSecret_();
  var sig = Utilities.computeHmacSha256Signature(payloadStr, secret).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
  var token = payloadStr + '.' + sig;
  try { CacheService.getScriptCache().put('session:' + token, JSON.stringify(payload), SESSION_TTL_SECONDS_); } catch (_) {}
  return token;
}
function session_(token, kind) {
  if (!token) throw apiError_('UNAUTHORIZED', '登入已失效，請重新登入。');
  var parts = String(token).split('.');
  if (parts.length === 2) {
    var payloadStr = parts[0], sig = parts[1];
    var secret = sessionSecret_();
    var expectedSig = Utilities.computeHmacSha256Signature(payloadStr, secret).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
    if (sig === expectedSig) {
      try {
        var payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(payloadStr, Utilities.Charset.UTF_8)).getDataAsString());
        if (payload && payload.exp && Date.now() <= payload.exp) {
          if (payload.kind !== kind) throw apiError_('FORBIDDEN', '您沒有執行此操作的權限。');
          return payload.identity;
        }
      } catch (err) {
        if (err.code) throw err;
      }
    }
  }
  var raw = null;
  try { raw = CacheService.getScriptCache().get('session:' + token); } catch (_) {}
  if (!raw) throw apiError_('UNAUTHORIZED', '登入已失效，請重新登入。');
  var s = JSON.parse(raw);
  if (s.kind !== kind) throw apiError_('FORBIDDEN', '您沒有執行此操作的權限。');
  return s.identity;
}
function destroySession_(token) {
  if (token) {
    try { CacheService.getScriptCache().remove('session:' + token); } catch (_) {}
  }
}
function requireAdminProject_(input) { var admin=session_(input.token,'admin'); var project=projectById_(input.projectId); if(String(project.admin_id)!==String(admin.admin_id)) throw apiError_('FORBIDDEN','您沒有此專案的存取權限。'); return {admin:admin,project:project}; }
function requireRespondent_(input) { var user=session_(input.token,'respondent'); if(String(user.project_id)!==String(input.projectId)) throw apiError_('FORBIDDEN','您沒有此專案的存取權限。'); return user; }
function safeText_(v,max) { var s=String(v===undefined?'':v).trim(); if(s.length>(max||5000)) throw apiError_('VALIDATION','輸入內容過長。'); return s; }
function isWritable_(project) { var now=Date.now(); if(['開放填寫'].indexOf(project.project_status)<0) return false; if(project.start_date && now<new Date(project.start_date).getTime()) return false; if(project.end_date && now>new Date(project.end_date).getTime()) return false; return true; }
function loginRateKey_(type, value) { return 'attempt:'+type+':'+sha256_(value).slice(0,24); }
function assertLoginRate_(type,value) { var c=Number(CacheService.getScriptCache().get(loginRateKey_(type,value))||0); if(c>=8) throw apiError_('RATE_LIMIT','嘗試次數過多，請稍後再試。'); }
function failLogin_(type,value) { var key=loginRateKey_(type,value),cache=CacheService.getScriptCache(),c=Number(cache.get(key)||0)+1; cache.put(key,String(c),300); }
function clearLoginRate_(type,value) { CacheService.getScriptCache().remove(loginRateKey_(type,value)); }

