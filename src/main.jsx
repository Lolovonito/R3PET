import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter as Router } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

try {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <Router>
                <App />
            </Router>
        </React.StrictMode>,
    )
} catch (error) {
    document.getElementById('root').innerHTML = `
        <div style="padding: 20px; color: red; font-family: sans-serif;">
            <h2>Error de Carga</h2>
            <p>${error.message}</p>
            <pre style="background: #eee; padding: 10px; font-size: 12px;">${error.stack}</pre>
        </div>
    `;
}
