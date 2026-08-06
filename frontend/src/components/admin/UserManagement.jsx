import React, { useState } from 'react';
import { Users, Upload, Trash2, Save } from 'lucide-react';
import { api } from '../../api';

export default function UserManagement({ projectId, adminId, initialUsers = [] }) {
  const [users, setUsers] = useState(initialUsers);
  const [pasteData, setPasteData] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handlePaste = () => {
    if (!pasteData) return;
    
    // Simple TSV parser for pasted Excel data
    const rows = pasteData.trim().split('\n');
    const newUsers = rows.map(row => {
      const cols = row.split('\t');
      return {
        user_code: cols[0]?.trim() || '',
        user_password: cols[1]?.trim() || '',
        user_name: cols[2]?.trim() || ''
      };
    }).filter(u => u.user_code && u.user_password);
    
    setUsers([...users, ...newUsers]);
    setPasteData('');
  };

  const removeUser = (index) => {
    setUsers(users.filter((_, i) => i !== index));
  };

  const saveUsers = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const res = await api.batchImportUsers(adminId, projectId, users);
      if (res.success) {
        setMessage('儲存成功！');
      } else {
        setMessage('儲存失敗：' + res.message);
      }
    } catch (e) {
      setMessage('儲存失敗：' + e.message);
    }
    setIsSaving(false);
  };

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}><Users size={20} style={{ display: 'inline', marginRight: '0.5rem' }}/> 名單管理</h3>
        <button className="btn-primary" onClick={saveUsers} disabled={isSaving}>
          <Save size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> 
          {isSaving ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      {message && <div style={{ padding: '1rem', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px', marginBottom: '1rem' }}>{message}</div>}

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>批次匯入名單</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>請從 Excel 複製資料貼在下方（欄位順序：帳號/密碼/姓名）</p>
        <textarea 
          value={pasteData}
          onChange={e => setPasteData(e.target.value)}
          placeholder="user01&#9;pass123&#9;王小明&#10;user02&#9;pass456&#9;李小華"
          style={{ width: '100%', height: '100px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '1rem', resize: 'vertical' }}
        />
        <button className="btn-secondary" onClick={handlePaste} disabled={!pasteData}>
          <Upload size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> 解析並加入清單
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>目前名單 ({users.length} 人)</h4>
        
        {users.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>尚無資料</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>登入帳號</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>密碼</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>姓名</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '60px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{u.user_code}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{u.user_password}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{u.user_name}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <button onClick={() => removeUser(i)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
