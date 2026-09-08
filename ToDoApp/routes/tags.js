const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/tags
router.get('/', (req, res) => {
  const tags = db.prepare('SELECT name FROM tags ORDER BY name').all().map((row) => row.name);
  res.json(tags);
});

module.exports = router;
