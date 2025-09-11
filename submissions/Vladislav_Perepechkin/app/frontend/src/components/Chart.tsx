import type { ChartOptions } from 'chart.js';
import '../lib/chart';
import 'chartjs-adapter-date-fns';
import { Line } from 'react-chartjs-2';
import type { TelemetrySeries } from '../types/types';

const COLORS: Record<string, string> = {
    speed: '#60a5fa',
    main_power_voltage: '#4ade80',
    fls485_level_1: '#facc15',
    fls485_level_2: '#facc15',
    fls485_level_3: '#facc15',
    fls485_level_4: '#facc15',
};

const LABELS: Record<keyof TelemetrySeries, string> = {
    speed: 'Скорость',
    main_power_voltage: 'Напряжение бортовой сети',
    fls485_level_1: 'Датчик уровня топлива',
    fls485_level_2: 'Датчик уровня топлива',
    fls485_level_3: 'Датчик уровня топлива',
    fls485_level_4: 'Датчик уровня топлива'
}

const TelemetryChart = ({ series }: { series: TelemetrySeries }) => {
    const keys = Object.keys(series) as (keyof TelemetrySeries)[];

    return (
        <div className='grid grid-cols-2 gap-10 my-10 w-full p-10'>
            {keys.map(key => {
                const data = series[key];
                if (!data || data.length === 0) return null;

                const chartData = {
                    labels: data.map(d => d.time),
                    datasets: [
                        {
                            label: LABELS[key],
                            data: data.map(d => d.value),
                            borderColor: COLORS[key] || '#fff',
                            backgroundColor: COLORS[key] || '#fff',
                            tension: 0.3,
                            spanGaps: true,
                        },
                    ],
                };

                const options: ChartOptions<'line'> = {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: '#fff' },
                        },
                        title: {
                            display: true,
                            text: LABELS[key],
                            color: '#fff',
                        },
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'minute',
                                tooltipFormat: 'HH:mm',
                                displayFormats: {
                                    minute: 'HH:mm',
                                },
                            },
                            ticks: { color: '#aaa' },
                            grid: { color: '#333' },
                        },
                        y: {
                            ticks: { color: '#aaa' },
                            grid: { color: '#333' },
                        },
                    },
                };

                return (
                    <div key={key} className='bg-neutral-900 p-4 rounded-2xl shadow'>
                        <Line data={chartData} options={options} />
                    </div>
                )
            })}
        </div>
    );
};

export default TelemetryChart;