import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import type { TrackPoint } from '../types/types';

const MapTrack = ({ track }: { track: TrackPoint[] }) => {
    if (!track || track.length === 0) {
        return <div className='text-white text-3xl font-medium my-auto'>Данные не найдены :(</div>
    };

    const positions: [number, number][] = track.map(p => [p.lat, p.lon]);

    return (
        <MapContainer center={positions[0]} zoom={13} scrollWheelZoom={false} className='h-[600px] w-full'>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            <Polyline positions={positions} color='blue' />
            {/* Старт */}
            <Marker position={positions[0]} />
            {/* Конец */}
            <Marker position={positions[positions.length - 1]} />
        </MapContainer>
    );
};

export default MapTrack;