import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Users, BarChart2, Share2, Save } from 'lucide-react';
import { api } from '../api';
import FormBuilder from '../components/admin/FormBuilder';
import UserManagement from '../components/admin/UserManagement';
import Statistics from '../components/admin/Statistics';
import ShareSettings from '../components/admin/ShareSettings';

export default function ProjectEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState('form');
  
  // Project State
  const [isLoading, setIsLoading] = useState(true);
  const [projectRecord, setProjectRecord] = useState(null);
  const [schema, setSchema] = useState({ questions: [] });
  const [users, setUsers] = useState([]);
  
  const [isNew, setIsNew] = useState(projectId === 'new');
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (!adminData) {
      navigate('/admin/login');
      return;
    }
    const parsedAdmin = JSON.parse(adminData);
    setAdmin(parsedAdmin);

    if (projectId !== 'new') {
      loadProjectData(parsedAdmin.admin_id, projectId);
    } else {
      setIsLoading(false);
    }
  }, [projectId, navigate]);

  const loadProjectData = async (adminId, pid) => {
    setIsLoading(true);
    try {
      // 取得所有專案來找出這個 projectRecord
      const projRes = await api.getProjects(adminId);
      if (projRes.success) {
        const record = projRes.data.find(p => p.project_id === pid);
        setProjectRecord(record);
      }
      
      // 取得 schema
      const schemaRes = await api.getFormSchema(adminId, pid);
      if (schemaRes.success && schemaRes.data) {
        setSchema(schemaRes.data);
      }

      // 取得 users
      const usersRes = await api.getUsers(adminId, pid);
      if (usersRes.success) {
        setUsers(usersRes.data);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleCreateProject = async () => {
    if (!newProjectName) return;
    setCreating(true);
    try {
      const res = await api.createProject(admin.admin_id, newProjectName);
      if (res.success) {
        // Redirect to new project URL
        navigate(`/admin/project/${res.data.project_id}`, { replace: true });
      } else {
        alert(res.message);
      }
    } catch (e) {
      alert(e.message);
    }
    setCreating(false);
  };

  const handleSaveSchema = async () => {
    try {
      const res = await api.saveFormSchema(admin.admin_id, projectId, schema);
      if (res.success) {
        alert('表單儲存成功！');
      } else {
        alert('儲存失敗: ' + res.message);
      }
    } catch (e) {
      alert('發生錯誤');
    }
  };

  if (isLoading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>載入中...</div>;
  }

  if (isNew) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <button className="btn-secondary" onClick={() => navigate('/admin/dashboard')} style={{ marginBottom: '2rem' }}>
          <ArrowLeft size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> 返回後台
        </button>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>新增專案</h2>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>專案名稱</label>
            <input 
              type="text" 
              className="input-field" 
              value={newProjectName} 
              onChange={e => setNewProjectName(e.target.value)} 
              placeholder="例如：2026 員工滿意度調查"
            />
          </div>
          <button className="btn-primary" onClick={handleCreateProject} disabled={creating || !newProjectName} style={{ width: '100%' }}>
            {creating ? '建立中 (需在 Drive 建立資料夾，請稍候)...' : '建立專案'}
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'form', icon: <Edit3 size={18} />, label: '問卷設計' },
    { id: 'users', icon: <Users size={18} />, label: '名單管理' },
    { id: 'stats', icon: <BarChart2 size={18} />, label: '資料統計' },
    { id: 'share', icon: <Share2 size={18} />, label: '發布與分享' }
  ];

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        background: 'white', 
        padding: '1rem 2rem', 
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <button onClick={() => navigate('/admin/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '1rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{projectRecord?.project_name || '專案編輯'}</h1>
      </header>

      <div style={{ flex: 1, display: 'flex', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Sidebar Tabs */}
        <div style={{ width: '250px', padding: '2rem 1rem', borderRight: '1px solid #eaeaea' }}>
          {tabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-primary)',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon} {tab.label}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '2rem' }}>
          {activeTab === 'form' && (
            <FormBuilder 
              schema={schema} 
              onChange={setSchema} 
              onSave={handleSaveSchema} 
            />
          )}
          {activeTab === 'users' && (
            <UserManagement 
              projectId={projectId} 
              adminId={admin.admin_id} 
              initialUsers={users} 
            />
          )}
          {activeTab === 'stats' && (
            <Statistics 
              projectId={projectId} 
              adminId={admin.admin_id} 
              schema={schema}
            />
          )}
          {activeTab === 'share' && (
            <ShareSettings 
              projectId={projectId} 
              adminId={admin.admin_id} 
              projectRecord={projectRecord}
            />
          )}
        </div>
      </div>
    </div>
  );
}
