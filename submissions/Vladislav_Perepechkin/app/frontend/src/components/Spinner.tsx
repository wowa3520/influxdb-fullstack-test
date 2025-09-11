import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export default function Spinner() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0b0b0b' }}>
            <span className='text-white text-2xl'>Загружаем данные...</span>
            <CircularProgress size="5rem" />
        </Box>
    );
}
