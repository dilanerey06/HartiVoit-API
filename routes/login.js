const express = require('express');
const router = express.Router();
const { db } = require('../config/conection');

// Ruta para el login
router.post('/', (req, res) => {
  // Extraer las credenciales del cuerpo de la petición
  const { usuario, pass } = req.body;
  console.log("debug one");
  // Consulta SQL para verificar si el usuario existe en la tabla vendedor
  const sqlSelect = `
    SELECT * FROM Vendedor 
    WHERE usuario = ? AND pass = ? 
    LIMIT 1;
  `;

  // Ejecutar la consulta
  db.query(sqlSelect, [usuario, pass], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.code + ': ' + err.sqlMessage });
      return;
    }

    // Validar si se encontró un registro
    if (result.length > 0) {
      res.status(200).json({ message: 'Login successful', vendedor: result[0] });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });
});

module.exports = router;