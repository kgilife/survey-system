# 問卷所前端

React + Vite 靜態前端，部署至 GitHub Pages；資料與權限由 Google Apps Script API 處理。

## 本機開發

1. 在 `.env` 設定 `VITE_GAS_API_URL`。
2. 執行 `npm install`。
3. 執行 `npm run dev`。

## 建置與檢查

```bash
npm run lint
npm run build
```

GitHub Actions 會在 `master` 或 `main` 更新時建置 `frontend/dist` 並部署 GitHub Pages。

## 後端部署

後端已由 `backend/.clasp.json` 綁定既有 Apps Script 專案。更新時在 `backend` 執行：

```bash
clasp push
clasp deploy --description "版本說明"
```

首次全新安裝才需要在 Apps Script 編輯器執行 `initializeSystem()`；既有安裝不需重新授權。
