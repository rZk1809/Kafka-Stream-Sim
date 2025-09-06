import React from 'react';
import {
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Brightness4,
  Brightness7
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const theme = useTheme();
  const { state, actions } = useAppContext();
  const isDark = state.theme === 'dark';

  const handleToggle = () => {
    actions.setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
      <IconButton
        className={className || ''}
        onClick={handleToggle}
        color="inherit"
        sx={{
          ml: 1,
          transition: 'transform 0.2s ease-in-out',
          '&:hover': {
            transform: 'rotate(180deg)'
          }
        }}
      >
        {isDark ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
