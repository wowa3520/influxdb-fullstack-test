import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import type { SelectStartButtonProps } from '../types/types';

export default function SelectStartButton({
    start,
    setStart
}: SelectStartButtonProps) {
    return (
        <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth>
                <InputLabel id="imei-select-label">Время</InputLabel>
                <Select
                    labelId="imei-select-label"
                    id="imei-select"
                    value={start}
                    label="Imei"
                    onChange={(e) => setStart(e.target.value)}
                >
                    <MenuItem value={'-6h'}>
                        За 6 часов
                    </MenuItem>
                    <MenuItem value={'-16h'}>
                        За 16 часов
                    </MenuItem>
                    <MenuItem value={'-24h'}>
                        За 1 день
                    </MenuItem>
                    <MenuItem value={'-48h'}>
                        За 2 дня
                    </MenuItem>
                </Select>
            </FormControl>
        </Box>
    );
}
