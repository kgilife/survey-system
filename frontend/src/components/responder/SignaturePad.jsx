import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export default function SignaturePad({ onChange }) {
  const sigCanvas = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = (e) => {
    e.preventDefault(); // Prevent form submission
    sigCanvas.current.clear();
    setIsEmpty(true);
    onChange(null);
  };

  const handleEnd = () => {
    if (sigCanvas.current.isEmpty()) {
      setIsEmpty(true);
      onChange(null);
    } else {
      setIsEmpty(false);
      // Get base64 representation of signature
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', background: '#fff' }}>
      <div style={{ border: '1px dashed #aaa', borderRadius: '4px', marginBottom: '0.5rem', background: '#fafafa', position: 'relative' }}>
        <SignatureCanvas 
          ref={sigCanvas}
          canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }}
          onEnd={handleEnd}
        />
        {isEmpty && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ccc', pointerEvents: 'none' }}>
            請在此處簽名
          </div>
        )}
      </div>
      <button className="btn-secondary" onClick={handleClear} style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}>清除重簽</button>
    </div>
  );
}
