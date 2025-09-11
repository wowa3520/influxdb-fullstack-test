import { useEffect, useState } from 'react';
import Controls from '../../components/Controls';
import MapTrack from '../../components/MapTrack';
import TelemetryChart from '../../components/Chart';
import axios from 'axios';
import type { TelemetryData, IMEI } from '../../types/types';
import Spinner from '../../components/Spinner';
import Footer from '../../components/Footer';

const TelemetryPage = () => {
    const [availableImeis, setAvailableImeis] = useState<IMEI[]>([]);
    const [selectedImei, setSelectedImei] = useState<string>('');
    const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
    const [start, setStart] = useState('-6h');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchImeis = async () => {
            try {
                const res = await axios.get<IMEI[]>('/api/imeis');
                setAvailableImeis(res.data);
            } catch (err) {
                console.error(err);
                setError('Error fetching available IMEIs');
            }
        }

        fetchImeis();
    }, []);

    useEffect(() => {
        if (availableImeis.length > 0 && !selectedImei) {
            setSelectedImei(availableImeis[0]._value);
        }
    }, [availableImeis, selectedImei]);

    useEffect(() => {
        if (!selectedImei) return;

        const fetchTelemetryData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get<TelemetryData>('/api/telemetry', {
                    params: {
                        imei: selectedImei,
                        start,
                        stop: 'now()',
                    },
                });
                setTelemetryData(res.data);
            } catch (err) {
                console.error(err);
                setError('Error fetching telemetry data');
                setTelemetryData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchTelemetryData();
    }, [selectedImei, start]);

    if (loading) {
        return <Spinner />
    }

    return (
        <div className='bg-gray-700 flex flex-col items-center min-h-screen'>
            <Controls
                availableImeis={availableImeis}
                selectedImei={selectedImei}
                setSelectedImei={setSelectedImei}
                start={start}
                setStart={setStart}
            />
            
            {error && <p className='text-red-500 mt-5 text-3xl'>{error}</p>}

            {telemetryData && <MapTrack track={telemetryData.track} />}

            {telemetryData && <TelemetryChart series={telemetryData.series} />}
            <Footer />
        </div>
    );
};

export default TelemetryPage;