import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const localMeta = document.querySelector('meta[name="build-time"]');
const localTime = localMeta ? localMeta.content : '';

async function checkUpdate() {
  try {
    const res = await fetch(location.href, { cache: 'no-store' });
    const text = await res.text();
    const match = text.match(/<meta name="build-time" content="([^"]+)"/);
    if (match) {
      const serverTime = match[1];
      if (localTime && localTime !== serverTime) {
        console.log('New version detected. Reloading...');
        location.reload(true);
      }
    }
  } catch (e) {}
}
checkUpdate();
window.addEventListener('focus', checkUpdate);

if (localTime) {
  const v = document.createElement('div');
  v.style.position = 'fixed';
  v.style.bottom = '4px';
  v.style.right = '4px';
  v.style.fontSize = '10px';
  v.style.color = 'rgba(0,0,0,0.3)';
  v.style.pointerEvents = 'none';
  v.style.zIndex = '9999';
  v.innerText = 'v' + new Date(localTime).toLocaleString('zh-TW');
  document.body.appendChild(v);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
