import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import type { SelectImeiButtonProps } from '../types/types';

export default function SelectImeiButton({
    availableImeis,
    selectedImei,
    setSelectedImei
}: SelectImeiButtonProps) {
    return (
        <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth>
                <InputLabel id="imei-select-label">imei</InputLabel>
                <Select
                    labelId="imei-select-label"
                    id="imei-select"
                    value={selectedImei}
                    label="Imei"
                    onChange={(e) => setSelectedImei(e.target.value as string)}
                >
                    {availableImeis.map(({ _value }) => (
                        <MenuItem key={_value} value={_value}>
                            {_value}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}
