import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';

const CORRECT_PIN = '1422';
const PIN_LENGTH = 4;
const STORAGE_KEY = 'loan_app_unlocked';

export function isUnlocked() {
  return sessionStorage.getItem(STORAGE_KEY) === 'true';
}

export function clearUnlock() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function PinLock({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const errorTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, []);

  const handleDigit = (digit) => {
    if (pin.length >= PIN_LENGTH) return;
    setError(false);
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      if (next === CORRECT_PIN) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        onUnlock();
      } else {
        setError(true);
        setShake(true);
        errorTimer.current = setTimeout(() => {
          setPin('');
          setShake(false);
        }, 500);
      }
    }
  };

  const handleBackspace = () => {
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(false);
    setPin('');
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #1e3a5f 0%, #2563eb 50%, #1e40af 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          maxWidth: 360,
          p: 4,
          borderRadius: 3,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <LockOutlinedIcon fontSize="large" />
        </Box>

        <Typography variant="h5" fontWeight={600} gutterBottom>
          Enter PIN
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your 4-digit lock to continue
        </Typography>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 1.5,
            mb: 1,
            animation: shake ? 'pinShake 0.4s ease' : 'none',
            '@keyframes pinShake': {
              '0%, 100%': { transform: 'translateX(0)' },
              '20%, 60%': { transform: 'translateX(-8px)' },
              '40%, 80%': { transform: 'translateX(8px)' },
            },
          }}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: pin.length > i
                  ? (error ? 'error.main' : 'primary.main')
                  : 'grey.300',
                border: error && pin.length === PIN_LENGTH
                  ? '2px solid'
                  : 'none',
                borderColor: 'error.main',
                transition: 'background-color 0.15s',
              }}
            />
          ))}
        </Box>

        <Typography
          variant="caption"
          color="error"
          sx={{ visibility: error ? 'visible' : 'hidden', display: 'block', mb: 2, minHeight: 20 }}
        >
          Incorrect PIN. Try again.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.5,
          }}
        >
          {digits.map((d, idx) => {
            if (d === '') {
              return (
                <Button
                  key={`empty-${idx}`}
                  onClick={handleClear}
                  sx={{ height: 56, fontSize: '0.85rem', color: 'text.secondary' }}
                >
                  Clear
                </Button>
              );
            }
            if (d === 'back') {
              return (
                <Button
                  key="back"
                  onClick={handleBackspace}
                  sx={{ height: 56, minWidth: 0 }}
                  aria-label="Backspace"
                >
                  <BackspaceOutlinedIcon />
                </Button>
              );
            }
            return (
              <Button
                key={d}
                variant="outlined"
                onClick={() => handleDigit(d)}
                sx={{
                  height: 56,
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  borderColor: 'grey.300',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50',
                  },
                }}
              >
                {d}
              </Button>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
}

export default PinLock;
