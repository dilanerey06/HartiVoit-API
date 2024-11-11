const express = require('express');
const router = express.Router();
const poolPromise = require('../config/conection'); // Importa la promesa que devuelve la pool

// Ruta para el login
router.post('/', async (req, res) => {
  try {
    // Espera a que la pool esté lista
    const db = await poolPromise;

    const { usuario, pass } = req.body;

    const sqlSelect = `
      SELECT * FROM Vendedor 
      WHERE usuario = ? AND pass = ? 
      LIMIT 1;
    `;

    const [result] = await db.query(sqlSelect, [usuario, pass]);

    if (result.length > 0) {
      res.status(200).json({ message: 'Login successful', vendedor: result[0] });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Error en la consulta de login:', err);
    res.status(500).json({ error: 'Error en la consulta de login' });
  }
});

module.exports = router;