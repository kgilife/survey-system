import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ProjectEditor from './pages/ProjectEditor';
import SurveyResponder from './pages/SurveyResponder';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 管理員路由 */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/project/:projectId" element={<ProjectEditor />} />
        
        {/* 使用者填寫路由 */}
        <Route path="/survey/:projectId/login" element={<SurveyResponder isLoginView={true} />} />
        <Route path="/survey/:projectId" element={<SurveyResponder />} />
        
        {/* 預設路由 */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
