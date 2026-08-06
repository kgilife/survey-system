import React from 'react';
import { useParams } from 'react-router-dom';

export default function SurveyResponder({ isLoginView }) {
  const { projectId } = useParams();

  return (
    <div className="app-container" style={{ 
      background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          {isLoginView ? '問卷登入' : '問卷填寫'} (專案: {projectId})
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {isLoginView ? '使用者登入介面開發中...' : '問卷表單與填寫介面開發中...'}
        </p>
      </div>
    </div>
  );
}
