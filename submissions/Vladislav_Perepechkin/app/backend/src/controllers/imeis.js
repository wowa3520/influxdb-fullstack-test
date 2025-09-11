const { queryApi, bucket } = require('../db/influx');

const getIMEIS = async (req, res) => {
    const fluxQuery = `
        from(bucket: "${bucket}")
            |> range(start: -30d)
            |> filter(fn: (r) => r["_measurement"] == "telemetry")
            |> keep(columns: ["imei"])
            |> group()
            |> distinct(column: "imei")
            |> sort(columns: ["imei"])
    `;

    try {
        const rows = await queryApi.collectRows(fluxQuery);
        res.json(rows);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getIMEIS };