import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { KeyRound, Loader2 } from 'lucide-react';

export default function AdminLogin() {
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setError('請輸入管理金鑰');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await api.adminLogin(adminKey);
      if (res.success) {
        // 為了簡化，直接存在 localStorage (真實場景應有更安全的 session 處理)
        localStorage.setItem('admin', JSON.stringify(res.data));
        navigate('/admin/dashboard');
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('系統發生錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ 
      background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem',
        textAlign: 'center'
      }}>
        
        <div style={{
          background: 'var(--primary-color)',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto',
          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)'
        }}>
          <KeyRound color="white" size={32} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          問卷管理系統
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          請輸入您的管理金鑰以登入
        </p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input
              type="password"
              className="form-control"
              placeholder="輸入管理金鑰"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              disabled={isLoading}
              style={{ textAlign: 'center', letterSpacing: '2px', fontSize: '1.2rem' }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : '登入系統'}
          </button>
        </form>
      </div>
    </div>
  );
}
