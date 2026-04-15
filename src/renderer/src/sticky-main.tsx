import React from 'react'
import ReactDOM from 'react-dom/client'
import Sticky from './Sticky'
import './sticky.css'

ReactDOM.createRoot(document.getElementById('sticky-root') as HTMLElement).render(
  <React.StrictMode>
    <Sticky />
  </React.StrictMode>
)
