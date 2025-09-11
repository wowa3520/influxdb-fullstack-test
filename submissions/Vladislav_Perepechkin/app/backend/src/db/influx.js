import { InfluxDB } from '@influxdata/influxdb-client';

export const url = process.env.INFLUX_URL
export const token = process.env.INFLUX_TOKEN;
export const org = process.env.INFLUX_ORG;
export const bucket = process.env.INFLUX_BUCKET;

const client = new InfluxDB({
    url,
    token,
});

export const queryApi = client.getQueryApi(org);