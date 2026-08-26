import json
import os
import sys
import urllib.request
import urllib.parse
from datetime import datetime

# Configure utf-8 stdout/stderr for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

SCRIPT_ID = "16-7V1GnIxOjqtGA6L64u1PZh0m-djjRX8NGiGQD7uz_pLVhSTAROEqyW"
DEPLOYMENT_ID = "AKfycbzYckl5w-cl7bG3F2hoX36yu9Du6r0JELSgGDbJA9n-2S6gaGUF-trc1iURHbw5jMKCJQ"
CLASPRC_PATH = os.path.expanduser(r'~/.clasprc.json')
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__)))

def get_access_token():
    if not os.path.exists(CLASPRC_PATH):
        raise FileNotFoundError(f"找不到 Google 憑證檔: {CLASPRC_PATH}")
    with open(CLASPRC_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    token_info = data.get('tokens', {}).get('default', {})
    refresh_token = token_info.get('refresh_token')
    client_id = token_info.get('client_id')
    client_secret = token_info.get('client_secret')

    token_url = 'https://oauth2.googleapis.com/token'
    params = urllib.parse.urlencode({
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token'
    }).encode('utf-8')

    req = urllib.request.Request(token_url, data=params, method='POST')
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return res['access_token']

def api_request(url, method='GET', data=None, token=''):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    req_data = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get_local_files():
    files_payload = []
    
    # Read appsscript.json
    manifest_path = os.path.join(BACKEND_DIR, 'appsscript.json')
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            files_payload.append({
                "name": "appsscript",
                "type": "JSON",
                "source": f.read()
            })

    # Read .gs files
    for file in sorted(os.listdir(BACKEND_DIR)):
        if file.endswith('.gs'):
            file_name = file[:-3]
            file_path = os.path.join(BACKEND_DIR, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                files_payload.append({
                    "name": file_name,
                    "type": "SERVER_JS",
                    "source": f.read()
                })
    return files_payload

def normalize_source(src):
    return (src or "").replace('\r\n', '\n').strip()

def check_for_changes(local_files, token):
    try:
        content_url = f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/content"
        remote_data = api_request(content_url, method='GET', token=token)
        remote_files = remote_data.get('files', [])

        remote_map = {f['name']: normalize_source(f.get('source', '')) for f in remote_files}
        local_map = {f['name']: normalize_source(f.get('source', '')) for f in local_files}

        if set(remote_map.keys()) != set(local_map.keys()):
            diff = set(remote_map.keys()) ^ set(local_map.keys())
            return True, f"檔案清單有異動: {', '.join(diff)}"

        changed_files = []
        for name in local_map:
            if local_map[name] != remote_map.get(name):
                changed_files.append(name)

        if changed_files:
            return True, f"檔案內容有變更: {', '.join(changed_files)}"

        return False, "無變更"
    except Exception as e:
        # If check fails for any reason, default to deploy
        return True, f"無法比對線上版本 ({e})，強制更新"

def deploy(force=False):
    print("==================================================")
    print("[1/3] 取得 Google 授權 Token...")
    token = get_access_token()
    print(">> 授權成功！")

    print(f"[2/3] 讀取本地 backend 並比對 GAS 雲端版本 (Script ID: {SCRIPT_ID})...")
    local_files = get_local_files()
    
    if not force:
        has_changes, reason = check_for_changes(local_files, token)
        if not has_changes:
            print(">> [檢查結果] 本地 backend 程式碼與 Google 雲端完全一致（無變更）。")
            print(">> [提示] 自動跳過 GAS 新版本部署，節省版本號與發布時間。")
            print("==================================================")
            return
        else:
            print(f">> [檢查結果] 偵測到後端異動：{reason}")
    else:
        print(">> [強制部署模式]")

    # Update content
    update_url = f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/content"
    api_request(update_url, method='PUT', data={"files": local_files}, token=token)
    print(f">> 成功上傳 {len(local_files)} 個後端檔案！")

    print("[3/3] 建立新版本並更新 Web 應用程式部署...")
    # Create new version
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    version_desc = f"Auto deploy at {now_str}"
    version_url = f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/versions"
    version_res = api_request(version_url, method='POST', data={"description": version_desc}, token=token)
    version_num = version_res.get('versionNumber')
    print(f">> 建立版本: v{version_num} ({version_desc})")

    # Update deployment
    deploy_url = f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/deployments/{DEPLOYMENT_ID}"
    dep_payload = {
        "deploymentConfig": {
            "scriptId": SCRIPT_ID,
            "versionNumber": version_num,
            "manifestFileName": "appsscript",
            "description": version_desc
        }
    }
    api_request(deploy_url, method='PUT', data=dep_payload, token=token)
    print(f">> GAS 後端成功部署到 Web App！(版本: v{version_num})")
    print(f">> 網址: https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec")
    print("==================================================")

if __name__ == '__main__':
    force_deploy = '--force' in sys.argv
    try:
        deploy(force=force_deploy)
    except Exception as e:
        print(f">> 部署失敗: {e}", file=sys.stderr)
        sys.exit(1)
