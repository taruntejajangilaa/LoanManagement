import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import PinLock, { isUnlocked } from './components/PinLock';
import './index.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function Root() {
  const [unlocked, setUnlocked] = useState(() => isUnlocked());

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {unlocked ? (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      ) : (
        <PinLock onUnlock={() => setUnlocked(true)} />
      )}
    </ThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
