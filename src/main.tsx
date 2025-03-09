import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/theme.css'
import './styles/animations.css'
import './styles/fix.css'
import './styles/enhanced.css'
import './styles/direct-enhance.css'

// 添加动态样式脚本
const script = document.createElement('script');
script.src = './styles/inline-styles.js';
script.async = true;
document.head.appendChild(script);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)