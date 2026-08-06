import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Plus, FolderOpen, LogOut } from 'lucide-react';

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (!adminData) {
      navigate('/admin/login');
      return;
    }
    const parsedAdmin = JSON.parse(adminData);
    setAdmin(parsedAdmin);
    
    // 載入專案列表
    api.getProjects(parsedAdmin.admin_id)
      .then(res => {
        if (res.success) {
          setProjects(res.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  if (!admin) return null;

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh' }}>
      <header style={{ 
        background: 'white', 
        padding: '1rem 2rem', 
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>問卷系統管理後台</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>哈囉, {admin.admin_name}</span>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={16} style={{ marginRight: '0.5rem', display: 'inline' }}/> 登出
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>我的專案</h2>
          <button className="btn-primary" onClick={() => navigate('/admin/project/new')}>
            <Plus size={20} /> 新增專案
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>載入中...</div>
        ) : projects.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <FolderOpen size={48} color="var(--text-secondary)" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>尚無專案</h3>
            <p style={{ color: 'var(--text-secondary)' }}>點擊右上角新增專案開始設計問卷。</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {projects.map(project => (
              <div key={project.project_id} className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={() => navigate(`/admin/project/${project.project_id}`)}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{project.project_name}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>狀態: {project.project_status}</p>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div>開放日期: {project.start_date || '未設定'}</div>
                  <div>截止日期: {project.end_date || '未設定'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
