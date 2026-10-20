import React from 'react';
import { createRoot } from 'react-dom/client';
import AppShell from './AppShell.jsx';
import './styles.css';

function App() {
  return <AppShell />;
}

createRoot(document.getElementById('root')).render(<App />);
