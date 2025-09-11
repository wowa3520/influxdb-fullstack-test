const { queryApi, bucket } = require('../db/influx');

const getTelemetry = async (req, res) => {
    const { imei, start, stop } = req.query;

    if (!imei || !start || !stop) {
        return res.status(400).json({ error: 'imei, start and stop is required' });
    }

    const parseHours = (str) => parseInt(str.replace('h', ''), 10);

    const hours = parseHours(start);

    let aggregateWindowDuration = '';

    if (hours >= -6) {
        aggregateWindowDuration = '30s';
    } else if (hours >= -16) {
        aggregateWindowDuration = '3m';
    } else if (hours >= -24) {
        aggregateWindowDuration = '10m';
    } else {
        aggregateWindowDuration = '20m';
    }

    const fluxQuery = `
        import "strings"
        from(bucket: "${bucket}")
            |> range(start: ${start}, stop: ${stop})
            |> filter(fn: (r) => r["_measurement"] == "telemetry" and r["imei"] == "${imei}")
            |> filter(fn: (r) => r["_field"] == "speed"
                            or r["_field"] == "latitude" 
                            or r["_field"] == "longitude" 
                            or r["_field"] == "main_power_voltage" 
                            or r["_field"] == "event_time"
                            or strings.hasPrefix(v: r["_field"], prefix: "fls485_level"))
            |> aggregateWindow(every: ${aggregateWindowDuration}, fn: mean, createEmpty: false)
            |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> sort(columns: ["_time"])
            |> map(fn: (r) => ({
                r with
                main_power_voltage: if exists r.main_power_voltage 
                    then float(v: r.main_power_voltage) / 1000.0 
                    else  float(v: 0.0)
            }))
    `

    try {
        const result = {
            series: {
                speed: [],
                main_power_voltage: []
                // баки разных уровней добавятся в объект позже
            },
            track: []
        };

        const rows = await queryApi.collectRows(fluxQuery);

        rows.forEach(row => {
            const time = row._time;
            const eventTime = row.event_time && !isNaN(row.event_time)
                ? parseInt(row.event_time)
                : Math.floor(new Date(row._time).getTime() / 1000);

            // скорость
            if (row.speed !== undefined) {
                result.series.speed.push({
                    time,
                    value: parseInt(row.speed)
                });
            }

            // баки
            Object.keys(row).forEach(key => {
                if (key.startsWith("fls485_level")) {
                    if (!result.series[key]) {
                        result.series[key] = [];
                    }
                    result.series[key].push({
                        time,
                        value: parseInt(row[key])
                    });
                }
            });

            // напряжение
            if (row.main_power_voltage !== undefined) {
                result.series.main_power_voltage.push({
                    time,
                    value: Math.round(row.main_power_voltage * 100) / 100
                });
            }

            // gps
            if (row.latitude && row.longitude) {
                result.track.push({
                    time,
                    lat: parseFloat(row.latitude),
                    lon: parseFloat(row.longitude),
                    event_time: eventTime
                });
            }
        });

        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getTelemetry };