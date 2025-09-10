import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert as MuiAlert,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  NotificationsActive as AlertIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  VolumeUp as VolumeIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import { Alert } from '../types';

const MarketAlerts: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [openDialog, setOpenDialog] = useState(false);
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    type: 'price_above' as Alert['type'],
    value: 0
  });

  // Convert stockData object to array for easier processing
  const marketDataArray = Object.values(state.stockData);

  // Check alerts against current market data
  useEffect(() => {
    if (marketDataArray.length === 0 || state.alerts.length === 0) {
      return;
    }

    const activeAlerts = state.alerts.filter(alert => alert.isActive && !alert.triggered);

    activeAlerts.forEach(alert => {
      const stockData = state.stockData[alert.symbol];
      if (!stockData) {
        return;
      }

      let shouldTrigger = false;

      switch (alert.type) {
        case 'price_above':
          shouldTrigger = stockData.currentPrice >= alert.value;
          break;
        case 'price_below':
          shouldTrigger = stockData.currentPrice <= alert.value;
          break;
        case 'volume_above':
          shouldTrigger = stockData.totalVolume >= alert.value;
          break;
      }

      if (shouldTrigger) {
        dispatch({
          type: 'UPDATE_ALERT',
          payload: {
            id: alert.id,
            updates: {
              triggered: true,
              triggeredAt: new Date().toISOString(),
              currentValue: alert.type === 'volume_above' ? stockData.totalVolume : stockData.currentPrice
            }
          }
        });

        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Market Alert: ${alert.symbol}`, {
            body: `Alert triggered - Current ${alert.type.includes('price') ? 'price' : 'volume'}: ${alert.type === 'volume_above' ? stockData.totalVolume.toLocaleString() : '$' + stockData.currentPrice.toFixed(2)}`,
            icon: '/favicon.ico'
          });
        }
      }
    });
  }, [marketDataArray, state.alerts, dispatch]);

  const handleCreateAlert = () => {
    if (!newAlert.symbol || !newAlert.value) {
      return;
    }

    const currentStock = state.stockData[newAlert.symbol.toUpperCase()];
    const currentValue = newAlert.type === 'volume_above'
      ? (currentStock?.totalVolume || 0)
      : (currentStock?.currentPrice || 0);

    const alert: Alert = {
      id: Date.now().toString(),
      symbol: newAlert.symbol.toUpperCase(),
      type: newAlert.type,
      value: newAlert.value,
      currentValue,
      isActive: true,
      triggered: false,
      createdAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_ALERT', payload: alert });
    setOpenDialog(false);
    setNewAlert({ symbol: '', type: 'price_above', value: 0 });
  };

  const handleDeleteAlert = (alertId: string) => {
    dispatch({ type: 'REMOVE_ALERT', payload: alertId });
  };

  const handleToggleAlert = (alertId: string) => {
    const alert = state.alerts.find(a => a.id === alertId);
    if (alert) {
      dispatch({
        type: 'UPDATE_ALERT',
        payload: {
          id: alertId,
          updates: { isActive: !alert.isActive }
        }
      });
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'price_above':
        return <TrendingUpIcon color="success" />;
      case 'price_below':
        return <TrendingDownIcon color="error" />;
      case 'volume_above':
        return <VolumeIcon color="info" />;
      default:
        return <AlertIcon />;
    }
  };

  const getAlertColor = (alert: Alert) => {
    if (alert.triggered) {
      return 'success';
    }
    if (!alert.isActive) {
      return 'default';
    }
    return 'primary';
  };

  const activeAlerts = state.alerts.filter(alert => alert.isActive && !alert.triggered);
  const triggeredAlerts = state.alerts.filter(alert => alert.triggered);
  const inactiveAlerts = state.alerts.filter(alert => !alert.isActive);

  const getAlertCondition = (alert: Alert) => {
    switch (alert.type) {
      case 'price_above':
        return `Price above $${alert.value}`;
      case 'price_below':
        return `Price below $${alert.value}`;
      case 'volume_above':
        return `Volume above ${alert.value.toLocaleString()}`;
      default:
        return `${alert.type} ${alert.value}`;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Market Alerts
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Alert
        </Button>
      </Box>

      {/* Alert Statistics */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Alerts
              </Typography>
              <Typography variant="h4" color="primary">
                {activeAlerts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Triggered Today
              </Typography>
              <Typography variant="h4" color="success.main">
                {triggeredAlerts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Alerts
              </Typography>
              <Typography variant="h4">
                {state.alerts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active Alerts
            </Typography>
            <List>
              {activeAlerts.map((alert, index) => (
                <React.Fragment key={alert.id}>
                  <ListItem>
                    <Box display="flex" alignItems="center" mr={2}>
                      {getAlertIcon(alert.type)}
                    </Box>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {alert.symbol}
                          </Typography>
                          <Chip
                            label={getAlertCondition(alert)}
                            color={getAlertColor(alert)}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={`Created: ${new Date(alert.createdAt).toLocaleDateString()}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteAlert(alert.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < activeAlerts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Triggered Alerts
            </Typography>
            <List>
              {triggeredAlerts.map((alert, index) => (
                <React.Fragment key={alert.id}>
                  <ListItem>
                    <Box display="flex" alignItems="center" mr={2}>
                      {getAlertIcon(alert.type)}
                    </Box>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {alert.symbol}
                          </Typography>
                          <Chip
                            label={getAlertCondition(alert)}
                            color="success"
                            size="small"
                          />
                        </Box>
                      }
                      secondary={`Triggered: ${alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : 'N/A'}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteAlert(alert.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < triggeredAlerts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {state.alerts.length === 0 && (
        <MuiAlert severity="info">
          No alerts created yet. Click "Create Alert" to set up your first market alert.
        </MuiAlert>
      )}

      {/* Create Alert Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Market Alert</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Stock Symbol</InputLabel>
              <Select
                value={newAlert.symbol}
                onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value })}
              >
                {Object.keys(state.stockData).map(symbol => (
                  <MenuItem key={symbol} value={symbol}>
                    {symbol}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={newAlert.type}
                onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value as Alert['type'] })}
              >
                <MenuItem value="price_above">Price Above</MenuItem>
                <MenuItem value="price_below">Price Below</MenuItem>
                <MenuItem value="volume_above">Volume Above</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={
                newAlert.type === 'volume_above' ? 'Volume Threshold' :
                'Price Threshold'
              }
              type="number"
              value={newAlert.value}
              onChange={(e) => setNewAlert({ ...newAlert, value: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateAlert} variant="contained">
            Create Alert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MarketAlerts;
