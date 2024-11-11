const express = require('express');
const router = express.Router();
const poolPromise = require('../config/conection');

router.get('/', async (req, res) => {
  try {
    // Espera a que la pool se resuelva
    const db = await poolPromise;

    const [results] = await db.query('SELECT * FROM Producto');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

module.exports = router;
