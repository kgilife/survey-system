import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Trash2, Plus, GripVertical, Settings } from 'lucide-react';

// 題型選項
const QUESTION_TYPES = [
  { value: 'text', label: '簡答題' },
  { value: 'textarea', label: '詳答題' },
  { value: 'radio', label: '單選題' },
  { value: 'checkbox', label: '多選題' },
  { value: 'dropdown', label: '下拉選單' },
  { value: 'signature', label: '簽名題' },
  { value: 'multi_image', label: '多圖片上傳' },
  { value: 'link_options', label: '連結型選項' } // 需要特殊處理的關聯題
];

export default function FormBuilder({ schema, onChange, onSave }) {
  const [questions, setQuestions] = useState(schema?.questions || []);
  const [editingId, setEditingId] = useState(null);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setQuestions(items);
    onChange({ questions: items });
  };

  const addQuestion = (type = 'text') => {
    const newQ = {
      id: 'q_' + Math.random().toString(36).substr(2, 9),
      type: type,
      title: '未命名題目',
      required: false,
      options: ['選項 1'], // for radio, checkbox, dropdown
      condition: null // 條件式跳題 { targetId, equals }
    };
    const newQuestions = [...questions, newQ];
    setQuestions(newQuestions);
    setEditingId(newQ.id);
    onChange({ questions: newQuestions });
  };

  const updateQuestion = (id, updates) => {
    const newQuestions = questions.map(q => q.id === id ? { ...q, ...updates } : q);
    setQuestions(newQuestions);
    onChange({ questions: newQuestions });
  };

  const deleteQuestion = (id) => {
    const newQuestions = questions.filter(q => q.id !== id);
    setQuestions(newQuestions);
    onChange({ questions: newQuestions });
  };

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>問卷結構設計</h3>
        <div>
          <button className="btn-secondary" onClick={() => addQuestion('text')} style={{ marginRight: '0.5rem' }}>
            <Plus size={16} style={{ display: 'inline' }} /> 新增題目
          </button>
          <button className="btn-primary" onClick={onSave}>儲存表單</button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="questions">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {questions.map((q, index) => (
                <Draggable key={q.id} draggableId={q.id} index={index}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.draggableProps} 
                      className={`glass-panel ${editingId === q.id ? 'active-edit' : ''}`}
                      style={{ 
                        ...provided.draggableProps.style,
                        marginBottom: '1rem',
                        padding: '1.5rem',
                        borderLeft: editingId === q.id ? '4px solid var(--primary-color)' : 'none',
                        backgroundColor: 'rgba(255, 255, 255, 0.7)'
                      }}
                      onClick={(e) => {
                        // Prevent click on drag handle or specific inputs from toggling
                        if(e.target.closest('input') || e.target.closest('button')) return;
                        setEditingId(q.id);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div {...provided.dragHandleProps} style={{ padding: '0.5rem', cursor: 'grab', color: '#999' }}>
                          <GripVertical size={20} />
                        </div>
                        <div style={{ flex: 1, marginLeft: '1rem' }}>
                          {editingId === q.id ? (
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                              <input 
                                value={q.title}
                                onChange={e => updateQuestion(q.id, { title: e.target.value })}
                                style={{ flex: 1, fontSize: '1.1rem', padding: '0.5rem', borderBottom: '2px solid var(--primary-color)', borderTop:'none', borderLeft:'none', borderRight:'none', outline:'none', background:'transparent' }}
                                placeholder="題目名稱"
                              />
                              <select 
                                value={q.type} 
                                onChange={e => updateQuestion(q.id, { type: e.target.value })}
                                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                              >
                                {QUESTION_TYPES.map(qt => (
                                  <option key={qt.value} value={qt.value}>{qt.label}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <h4 style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>{q.title} {q.required && <span style={{color:'red'}}>*</span>}</h4>
                          )}

                          {/* Options Editor for Choice Types */}
                          {editingId === q.id && ['radio', 'checkbox', 'dropdown'].includes(q.type) && (
                            <div style={{ paddingLeft: '1rem', marginBottom: '1rem' }}>
                              {q.options?.map((opt, oIdx) => (
                                <div key={oIdx} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <div style={{ width: '16px', height: '16px', borderRadius: q.type === 'radio' ? '50%' : '2px', border: '1px solid #ccc', marginRight: '0.5rem' }}></div>
                                  <input 
                                    value={opt}
                                    onChange={e => {
                                      const newOpts = [...q.options];
                                      newOpts[oIdx] = e.target.value;
                                      updateQuestion(q.id, { options: newOpts });
                                    }}
                                    style={{ border: 'none', borderBottom: '1px dotted #ccc', outline: 'none', background: 'transparent', flex: 1 }}
                                  />
                                  <button onClick={() => {
                                      const newOpts = q.options.filter((_, i) => i !== oIdx);
                                      updateQuestion(q.id, { options: newOpts });
                                    }} style={{ background:'transparent', border:'none', color:'#ff4d4f', cursor:'pointer' }}>
                                    &times;
                                  </button>
                                </div>
                              ))}
                              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: q.type === 'radio' ? '50%' : '2px', border: '1px solid #ccc', marginRight: '0.5rem' }}></div>
                                <span onClick={() => updateQuestion(q.id, { options: [...(q.options||[]), `選項 ${(q.options?.length||0)+1}`] })} style={{ cursor: 'pointer', borderBottom: '1px dotted #ccc' }}>新增選項</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Conditions Setup (Simple) */}
                          {editingId === q.id && (
                            <div style={{ background: '#f5f5f5', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                              <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>跳題邏輯 (選填):</span>
                              顯示條件：當題目 
                              <select 
                                value={q.condition?.targetId || ''} 
                                onChange={e => updateQuestion(q.id, { condition: e.target.value ? { targetId: e.target.value, equals: q.condition?.equals || '' } : null })}
                                style={{ margin: '0 0.5rem' }}
                              >
                                <option value="">無條件顯示</option>
                                {questions.filter(qt => qt.id !== q.id).map(qt => (
                                  <option key={qt.id} value={qt.id}>{qt.title}</option>
                                ))}
                              </select>
                              等於 
                              <input 
                                value={q.condition?.equals || ''} 
                                onChange={e => updateQuestion(q.id, { condition: { ...q.condition, equals: e.target.value }})}
                                placeholder="值"
                                style={{ margin: '0 0.5rem', width: '60px' }}
                              />
                            </div>
                          )}

                          {editingId === q.id && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                              <label style={{ display: 'flex', alignItems: 'center', marginRight: '1rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })} style={{ marginRight: '0.5rem' }}/>
                                必填
                              </label>
                              <button onClick={() => deleteQuestion(q.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <Trash2 size={16} style={{ marginRight: '0.2rem' }} /> 刪除
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
