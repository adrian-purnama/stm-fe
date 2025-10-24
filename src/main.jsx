import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { UserContextProvider } from './utils/contexts/UserContext.jsx'
import { NotificationsProvider } from './utils/contexts/NotificationsContext.jsx'
import toast, { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <BrowserRouter>
      <UserContextProvider>
        <NotificationsProvider>
          <Toaster position="top-right" />
          <script dangerouslySetInnerHTML={{ __html: `window.toast = (msg, opts) => window.__TOAST && window.__TOAST(msg, opts);` }} />
          <App />
        </NotificationsProvider>
      </UserContextProvider>
    </BrowserRouter>
  // </StrictMode>,
)
