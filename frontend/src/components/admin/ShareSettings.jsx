import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink } from 'lucide-react';

export default function ShareSettings({ projectId, adminId, projectRecord }) {
  // 取得當前網址的主機名稱，組合出填寫端的 URL
  // 如果在 GitHub Pages 上，網址會是 https://[username].github.io/[repo]/survey/[projectId]/login
  const baseUrl = window.location.origin + window.location.pathname.replace('/admin/dashboard', '').replace(/\/admin\/project\/.*/, '');
  const surveyUrl = `${baseUrl}/survey/${projectId}/login`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(surveyUrl);
    alert('已複製連結');
  };

  return (
    <div style={{ padding: '1rem 0' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>分享與發布</h3>

      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>讓使用者掃描下方 QR Code 進行填寫</h4>
        
        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'inline-block' }}>
          <QRCodeSVG value={surveyUrl} size={200} />
        </div>

        <div style={{ width: '100%', maxWidth: '500px' }}>
          <p style={{ marginBottom: '0.5rem', textAlign: 'left', fontWeight: 'bold' }}>問卷填寫連結：</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              readOnly 
              value={surveyUrl} 
              style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', background: '#f5f5f5' }}
            />
            <button className="btn-secondary" onClick={copyToClipboard} title="複製連結">
              <Copy size={20} />
            </button>
            <a href={surveyUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} title="開啟連結">
              <ExternalLink size={20} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
