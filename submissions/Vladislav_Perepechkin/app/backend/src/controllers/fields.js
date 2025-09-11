const { queryApi, bucket } = require('../db/influx');

const getFields = async (req, res) => {
    const { imei } = req.query;

    if (!imei) {
        return res.status(400).json({ error: 'imei is required' });
    }

    const fluxQuery = `
        from(bucket: "${bucket}")
            |> range(start: -30d)
            |> filter(fn: (r) => r["_measurement"] == "telemetry")
            |> filter(fn: (r) => r["imei"] == "${imei}")
            |> keep(columns: ["_field"])
            |> group()
            |> distinct(column: "_field")
            |> sort(columns: ["_field"])
    `

    try {
        const rows = await queryApi.collectRows(fluxQuery);
        const fields = rows.map(r => r._value);

        res.json(fields);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getFields };