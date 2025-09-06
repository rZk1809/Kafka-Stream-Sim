import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard,
  TrendingUp,
  AccountBalance,
  NotificationsActive,
  ShowChart,
  History
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state, actions } = useAppContext();

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    actions.setCurrentView(newValue as any);
  };

  const activeAlerts = state.alerts.filter(alert => alert.isActive && !alert.triggered).length;
  const triggeredAlerts = state.alerts.filter(alert => alert.triggered).length;

  const tabs = [
    {
      value: 'dashboard',
      label: 'Dashboard',
      icon: <Dashboard />,
      badge: null
    },
    {
      value: 'trading',
      label: 'Trading',
      icon: <TrendingUp />,
      badge: null
    },
    {
      value: 'portfolio',
      label: 'Portfolio',
      icon: <AccountBalance />,
      badge: state.portfolio.positions.length > 0 ? state.portfolio.positions.length : null
    },
    {
      value: 'alerts',
      label: 'Alerts',
      icon: <NotificationsActive />,
      badge: triggeredAlerts > 0 ? triggeredAlerts : (activeAlerts > 0 ? activeAlerts : null)
    },
    {
      value: 'history',
      label: 'History',
      icon: <ShowChart />,
      badge: null
    }
  ];

  return (
    <Box 
      className={className}
      sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        mb: 3
      }}
    >
      <Tabs
        value={state.currentView}
        onChange={handleTabChange}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons={isMobile ? 'auto' : false}
        allowScrollButtonsMobile
        sx={{
          '& .MuiTab-root': {
            minHeight: 64,
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            '&.Mui-selected': {
              fontWeight: 600
            }
          }
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {tab.badge !== null ? (
                  <Badge 
                    badgeContent={tab.badge} 
                    color={tab.value === 'alerts' && triggeredAlerts > 0 ? 'error' : 'primary'}
                    variant={tab.badge === 0 ? 'dot' : 'standard'}
                  >
                    {tab.icon}
                  </Badge>
                ) : (
                  tab.icon
                )}
                {!isMobile && tab.label}
              </Box>
            }
            sx={{
              minWidth: isMobile ? 'auto' : 120,
              px: isMobile ? 1 : 2
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default Navigation;
