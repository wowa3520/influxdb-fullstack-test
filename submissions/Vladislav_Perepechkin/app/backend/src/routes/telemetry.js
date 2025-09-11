const express = require('express');
const router = express.Router();
const { getTelemetry } = require('../controllers/telemetry');

router.get('/', getTelemetry);

module.exports = router;