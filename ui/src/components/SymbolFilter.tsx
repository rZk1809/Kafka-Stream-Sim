import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Stack,
  Button
} from '@mui/material';
import { 
  SelectAll as SelectAllIcon,
  Clear as ClearIcon 
} from '@mui/icons-material';
import { SymbolFilterProps, SYMBOL_COLORS } from '@/types';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const SymbolFilter: React.FC<SymbolFilterProps> = ({
  availableSymbols,
  selectedSymbols,
  onSelectionChange
}) => {
  const handleChange = (event: SelectChangeEvent<typeof selectedSymbols>) => {
    const value = event.target.value;
    onSelectionChange(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSelectAll = () => {
    onSelectionChange([...availableSymbols]);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        {/* Symbol Selection */}
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel id="symbol-filter-label">Stock Symbols</InputLabel>
          <Select
            labelId="symbol-filter-label"
            id="symbol-filter"
            multiple
            value={selectedSymbols}
            onChange={handleChange}
            input={<OutlinedInput label="Stock Symbols" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((symbol) => {
                  const symbolColors = SYMBOL_COLORS[symbol] || SYMBOL_COLORS.AAPL;
                  return (
                    <Chip
                      key={symbol}
                      label={symbol}
                      size="small"
                      sx={{
                        backgroundColor: symbolColors.background,
                        color: symbolColors.primary,
                        fontWeight: 600,
                        '& .MuiChip-deleteIcon': {
                          color: symbolColors.primary
                        }
                      }}
                    />
                  );
                })}
              </Box>
            )}
            MenuProps={MenuProps}
          >
            {availableSymbols.map((symbol) => {
              const symbolColors = SYMBOL_COLORS[symbol] || SYMBOL_COLORS.AAPL;
              const isSelected = selectedSymbols.includes(symbol);
              
              return (
                <MenuItem 
                  key={symbol} 
                  value={symbol}
                  sx={{
                    backgroundColor: isSelected ? symbolColors.background : 'transparent',
                    '&:hover': {
                      backgroundColor: symbolColors.background
                    },
                    '&.Mui-selected': {
                      backgroundColor: symbolColors.background,
                      '&:hover': {
                        backgroundColor: symbolColors.background
                      }
                    }
                  }}
                >
                  <Chip
                    label={symbol}
                    size="small"
                    variant={isSelected ? "filled" : "outlined"}
                    sx={{
                      backgroundColor: isSelected ? symbolColors.primary : 'transparent',
                      color: isSelected ? '#ffffff' : symbolColors.primary,
                      borderColor: symbolColors.primary,
                      fontWeight: 600,
                      minWidth: '60px'
                    }}
                  />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {/* Quick Actions */}
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SelectAllIcon />}
            onClick={handleSelectAll}
            disabled={selectedSymbols.length === availableSymbols.length}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Select All
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleClearAll}
            disabled={selectedSymbols.length === 0}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Clear All
          </Button>
        </Stack>

        {/* Selection Summary */}
        <Box sx={{ ml: 'auto' }}>
          <Typography variant="body2" color="text.secondary">
            {selectedSymbols.length} of {availableSymbols.length} symbols selected
          </Typography>
        </Box>
      </Stack>

      {/* Selected Symbols Display */}
      {selectedSymbols.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Monitoring:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {selectedSymbols.map((symbol) => {
              const symbolColors = SYMBOL_COLORS[symbol] || SYMBOL_COLORS.AAPL;
              return (
                <Chip
                  key={symbol}
                  label={symbol}
                  size="small"
                  onDelete={() => {
                    const newSelection = selectedSymbols.filter(s => s !== symbol);
                    onSelectionChange(newSelection);
                  }}
                  sx={{
                    backgroundColor: symbolColors.background,
                    color: symbolColors.primary,
                    fontWeight: 600,
                    '& .MuiChip-deleteIcon': {
                      color: symbolColors.primary,
                      '&:hover': {
                        color: symbolColors.primary
                      }
                    }
                  }}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {/* No Selection Warning */}
      {selectedSymbols.length === 0 && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'warning.dark', borderRadius: 1 }}>
          <Typography variant="body2" color="warning.contrastText">
            No symbols selected. Please select at least one symbol to view data.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SymbolFilter;
