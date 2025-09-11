const express = require('express');
const router = express.Router();
const { getIMEIS } = require('../controllers/imeis');

router.get('/', getIMEIS);

module.exports = router;