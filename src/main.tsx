import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')!
// index.html'deki acilis kabugu: paket inene kadar ekranda duran fuaye. React
// devralmadan once elle kaldiriliyor ki createRoot bos bir kaba baglansin.
root.replaceChildren()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
