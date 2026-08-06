import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Statistics({ projectId, adminId, schema }) {
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getStats(adminId, projectId).then(res => {
      if (res.success) {
        const parsed = res.data.map(r => ({
          ...r,
          data_json: r.data_json ? JSON.parse(r.data_json) : {}
        }));
        setResponses(parsed);
      }
      setIsLoading(false);
    });
  }, [adminId, projectId]);

  const exportExcel = () => {
    const questions = schema?.questions || [];
    
    // Header
    const headers = ['填寫者帳號', '填寫狀態', '開始時間', '送出時間'];
    questions.forEach(q => headers.push(q.title));

    // Rows
    const data = responses.map(r => {
      const row = [r.user_code, r.status, r.start_time, r.submit_time];
      questions.forEach(q => {
        let val = r.data_json[q.id];
        if (Array.isArray(val)) {
          val = val.join(', ');
        }
        row.push(val || '');
      });
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "問卷結果");
    XLSX.writeFile(wb, `project_${projectId}_results.xlsx`);
  };

  if (isLoading) return <div>載入資料中...</div>;

  // Simple statistics for single choice questions
  const questions = schema?.questions || [];
  const choiceQuestions = questions.filter(q => q.type === 'radio' || q.type === 'dropdown');

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>資料統計與匯出</h3>
        <button className="btn-primary" onClick={exportExcel}>
          <Download size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> 匯出 Excel
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{responses.length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>總回收份數</div>
        </div>
      </div>

      {choiceQuestions.map((q, idx) => {
        // Aggregate data
        const counts = {};
        q.options.forEach(o => counts[o] = 0);
        
        responses.forEach(r => {
          const val = r.data_json[q.id];
          if (val && counts[val] !== undefined) {
            counts[val]++;
          }
        });

        const chartData = Object.keys(counts).map(key => ({
          name: key,
          count: counts[key]
        }));

        return (
          <div key={q.id} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>{idx + 1}. {q.title}</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--primary-color)">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
