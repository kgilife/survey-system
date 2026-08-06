import React, { useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { api } from '../../api'; // Assuming you have apiUploadFile in api.js or handle in parent

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageUpload({ value = [], onChange, projectId }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    setError('');
    
    for (let file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`檔案 ${file.name} 超過 5MB 限制`);
        continue;
      }
      
      setIsUploading(true);
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result.split(',')[1];
        // TODO: Call API to upload. For now, since the GAS upload takes time, we simulate it or pass base64 directly to parent if not too large.
        // If we want to actually upload:
        /*
        try {
          const res = await api.uploadFile(projectId, file.name, file.type, base64Data);
          if (res.success) {
            onChange([...value, res.url]);
          } else {
            setError(res.message);
          }
        } catch (err) {
          setError('上傳失敗');
        }
        */
        // Let's just store the Data URL for simplicity in this implementation, 
        // in a real app you'd upload and store the URL.
        onChange([...value, event.target.result]);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index) => {
    const newValues = value.filter((_, i) => i !== index);
    onChange(newValues);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {value.map((imgUrl, idx) => (
          <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
            <img src={imgUrl} alt="uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button 
              onClick={(e) => { e.preventDefault(); removeImage(idx); }}
              style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      
      {error && <div style={{ color: 'red', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</div>}
      
      <label style={{ 
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
        padding: '0.5rem 1rem', border: '1px dashed var(--primary-color)', 
        borderRadius: '8px', color: 'var(--primary-color)', cursor: 'pointer',
        background: 'var(--primary-light)'
      }}>
        <UploadCloud size={20} />
        {isUploading ? '處理中...' : '選擇圖片 (Max 5MB)'}
        <input 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={handleFileChange} 
          style={{ display: 'none' }}
          disabled={isUploading}
        />
      </label>
    </div>
  );
}
