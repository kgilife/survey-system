import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import SignaturePad from '../components/responder/SignaturePad';
import ImageUpload from '../components/responder/ImageUpload';

export default function SurveyResponder({ isLoginView }) {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Login State
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Survey State
  const [user, setUser] = useState(null);
  const [schema, setSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 檢查是否有登入狀態
    const storedUser = sessionStorage.getItem(`user_${projectId}`);
    if (storedUser && !isLoginView) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      loadSurveyData(parsedUser.user_code);
    } else if (!isLoginView) {
      navigate(`/survey/${projectId}/login`);
    }
  }, [projectId, isLoginView, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    
    try {
      const res = await api.responderLogin(projectId, userCode, password);
      if (res.success) {
        sessionStorage.setItem(`user_${projectId}`, JSON.stringify(res.data));
        navigate(`/survey/${projectId}`);
      } else {
        setLoginError(res.message);
      }
    } catch (err) {
      setLoginError('登入發生錯誤');
    }
    setIsLoading(false);
  };

  const loadSurveyData = async (code) => {
    setIsLoading(true);
    setStartTime(new Date().toISOString());
    try {
      const schemaRes = await api.getFormSchema(null, projectId);
      if (schemaRes.success) {
        setSchema(schemaRes.data);
      }

      const draftRes = await api.getDraft(projectId, code);
      if (draftRes.success && draftRes.data) {
        setFormData(draftRes.data);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleChange = (qId, value) => {
    setFormData(prev => ({ ...prev, [qId]: value }));
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await api.saveDraft(projectId, user.user_code, formData);
      if (res.success) {
        alert('暫存成功！');
      }
    } catch (e) {
      alert('暫存失敗');
    }
    setIsSaving(false);
  };

  const handleSubmit = async () => {
    if (!user || !schema) return;
    
    // 簡單的必填驗證 (只檢查顯示的題目)
    const visibleQuestions = schema.questions.filter(q => isQuestionVisible(q));
    const missing = visibleQuestions.find(q => q.required && !formData[q.id]);
    if (missing) {
      alert(`「${missing.title}」為必填欄位`);
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.submitSurvey(projectId, user.user_code, formData, startTime);
      if (res.success) {
        alert('問卷送出成功！謝謝您的填寫。');
        sessionStorage.removeItem(`user_${projectId}`);
        navigate(`/survey/${projectId}/login`);
      } else {
        alert(res.message);
      }
    } catch (e) {
      alert('送出失敗');
    }
    setIsSaving(false);
  };

  // 條件式跳題邏輯
  const isQuestionVisible = (q) => {
    if (!q.condition || !q.condition.targetId) return true;
    const targetValue = formData[q.condition.targetId];
    return targetValue === q.condition.equals;
  };

  const renderQuestionInput = (q) => {
    const val = formData[q.id] || '';
    switch (q.type) {
      case 'text':
        return <input type="text" className="input-field" value={val} onChange={e => handleChange(q.id, e.target.value)} />;
      case 'textarea':
        return <textarea className="input-field" value={val} onChange={e => handleChange(q.id, e.target.value)} rows={4} />;
      case 'radio':
        return (
          <div>
            {q.options?.map(opt => (
              <label key={opt} style={{ display: 'block', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name={q.id} value={opt} checked={val === opt} onChange={e => handleChange(q.id, e.target.value)} style={{ marginRight: '0.5rem' }} />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        const checkedArr = Array.isArray(val) ? val : [];
        return (
          <div>
            {q.options?.map(opt => (
              <label key={opt} style={{ display: 'block', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  value={opt} 
                  checked={checkedArr.includes(opt)} 
                  onChange={e => {
                    if (e.target.checked) {
                      handleChange(q.id, [...checkedArr, opt]);
                    } else {
                      handleChange(q.id, checkedArr.filter(v => v !== opt));
                    }
                  }} 
                  style={{ marginRight: '0.5rem' }} 
                />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'dropdown':
        return (
          <select className="input-field" value={val} onChange={e => handleChange(q.id, e.target.value)}>
            <option value="">請選擇</option>
            {q.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'signature':
        return <SignaturePad onChange={(data) => handleChange(q.id, data)} />;
      case 'multi_image':
        return <ImageUpload projectId={projectId} value={Array.isArray(val) ? val : []} onChange={(data) => handleChange(q.id, data)} />;
      default:
        return <div>未知的題型: {q.type}</div>;
    }
  };

  if (isLoginView) {
    return (
      <div className="app-container" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)', justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>問卷系統登入</h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>業務員代碼 / 帳號</label>
              <input type="text" required className="input-field" value={userCode} onChange={e => setUserCode(e.target.value)} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>密碼</label>
              <input type="password" required className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {loginError && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{loginError}</div>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isLoading}>
              {isLoading ? '登入中...' : '登入'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading || !schema) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>載入問卷中...</div>;
  }

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>問卷填寫</h1>
          <div style={{ color: 'var(--text-secondary)' }}>填寫人: {user?.user_name || user?.user_code}</div>
        </div>

        {schema.questions.filter(q => isQuestionVisible(q)).map((q, idx) => (
          <div key={q.id} className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
              {idx + 1}. {q.title} {q.required && <span style={{ color: 'red' }}>*</span>}
            </h3>
            {renderQuestionInput(q)}
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button className="btn-secondary" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? '儲存中...' : '儲存暫存'}
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? '送出中...' : '送出問卷'}
          </button>
        </div>
      </div>
    </div>
  );
}
