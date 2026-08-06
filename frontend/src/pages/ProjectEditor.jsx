import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ProjectEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem' }}>
      <button className="btn-secondary" onClick={() => navigate('/admin/dashboard')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> 返回後台
      </button>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          {projectId === 'new' ? '新增專案' : `編輯專案: ${projectId}`}
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>表單設計器與專案設定開發中...</p>
      </div>
    </div>
  );
}
