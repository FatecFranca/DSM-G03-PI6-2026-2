// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;
