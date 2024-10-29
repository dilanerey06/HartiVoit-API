const express = require('express');
const router = express.Router();
const { db } = require('../config/conection');

// Ruta para registrar una venta con varios pedidos
router.post('/registrar', (req, res) => {
  const { nombre_cliente, id_vendedor, pedidos } = req.body;

  if (!pedidos || pedidos.length === 0) {
    return res.status(400).json({ message: 'Debe proporcionar al menos un pedido.' });
  }

  // Insertar la venta primero con estado 'iniciado'
  const sqlInsertVenta = 
    'INSERT INTO Venta (fecha, nombre_cliente, fk_id_vendedor, estado) VALUES (NOW(), ?, ?, \'iniciado\');';

  db.query(sqlInsertVenta, [nombre_cliente, id_vendedor], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.code + ': ' + err.sqlMessage });
    }

    const ventaId = result.insertId;

    // Verificar stock para todos los pedidos antes de registrarlos
    const stockCheckPromises = pedidos.map(pedido => {
      const { id_producto, cantidad } = pedido;

      return new Promise((resolve, reject) => {
        const sqlCheckStock = 'SELECT stock FROM Producto WHERE id_producto = ?;';
        db.query(sqlCheckStock, [id_producto], (err, result) => {
          if (err) {
            reject(err);
          } else if (result.length === 0 || result[0].stock < cantidad) {
            reject(new Error('Stock insuficiente para el producto ID: ' + id_producto));
          } else {
            resolve();
          }
        });
      });
    });

    Promise.all(stockCheckPromises)
      .then(() => {
        // Si todos los productos tienen suficiente stock, registrar los pedidos y actualizar el stock
        const pedidosPromises = pedidos.map(pedido => {
          const { id_producto, cantidad } = pedido;

          return new Promise((resolve, reject) => {
            const sqlInsertPedido = 
              'INSERT INTO Pedido (cantidad, fk_id_producto, fk_id_venta) VALUES (?, ?, ?);';
            db.query(sqlInsertPedido, [cantidad, id_producto, ventaId], (err, result) => {
              if (err) {
                reject(err);
              } else {
                const sqlUpdateStock = 'UPDATE Producto SET stock = stock - ? WHERE id_producto = ?;';
                db.query(sqlUpdateStock, [cantidad, id_producto], (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(result);
                  }
                });
              }
            });
          });
        });

        return Promise.all(pedidosPromises);
      })
      .then(() => {
        const sqlUpdateVenta = 'UPDATE Venta SET estado = \'completado\' WHERE id_venta = ?;';
        db.query(sqlUpdateVenta, [ventaId], (err) => {
          if (err) {
            res.status(500).json({ error: err.code + ': ' + err.sqlMessage });
          } else {
            res.status(201).json({ message: 'Venta y pedidos registrados exitosamente', ventaId });
          }
        });
      })
      .catch(err => {
        // Si hay un error de stock, actualizar el estado de la venta a 'cancelado' sin registrar pedidos
        const sqlUpdateVenta = 'UPDATE Venta SET estado = \'cancelado\' WHERE id_venta = ?;';
        db.query(sqlUpdateVenta, [ventaId], () => {
          res.status(200).json({ message: 'Venta registrada pero cancelada por falta de stock', ventaId });
        });
      });
  });
});

// Ruta para obtener una venta específica por ID
router.get('/get-venta/:id', (req, res) => {
  const ventaId = req.params.id;

  const sqlSelectVenta = `
    SELECT v.id_venta, v.fecha, v.nombre_cliente, ven.nombre AS vendedor,
           p.nombre AS producto, p.descripcion, ped.cantidad, p.precio, v.estado
    FROM Venta v
    LEFT JOIN Pedido ped ON v.id_venta = ped.fk_id_venta
    LEFT JOIN Producto p ON ped.fk_id_producto = p.id_producto
    LEFT JOIN Vendedor ven ON v.fk_id_vendedor = ven.id_vendedor
    WHERE v.id_venta = ?;
  `;

  db.query(sqlSelectVenta, [ventaId], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.code + ': ' + err.sqlMessage });
      return;
    }

    if (result.length > 0) {
      const venta = {
        id_venta: result[0].id_venta,
        fecha: result[0].fecha,
        nombre_cliente: result[0].nombre_cliente,
        vendedor: result[0].vendedor,
        estado: result[0].estado,
        pedidos: result.filter(pedido => pedido.producto).map(pedido => ({
          producto: pedido.producto,
          descripcion: pedido.descripcion,
          cantidad: pedido.cantidad,
          precio_unitario: pedido.precio,
          total: pedido.cantidad * pedido.precio
        }))
      };
      res.status(200).json({ venta });
    } else {
      res.status(404).json({ message: 'Venta no encontrada' });
    }
  });
});

// Ruta para buscar ventas por vendedor
router.get('/get-ventas/vendedor/:id', (req, res) => {
  const id_vendedor = req.params.id;

  const sqlSelect = `
    SELECT v.id_venta, v.fecha, v.nombre_cliente, ven.nombre AS vendedor,
           p.nombre AS producto, p.descripcion, ped.cantidad, p.precio, v.estado
    FROM Venta v
    LEFT JOIN Pedido ped ON v.id_venta = ped.fk_id_venta
    LEFT JOIN Producto p ON ped.fk_id_producto = p.id_producto
    LEFT JOIN Vendedor ven ON v.fk_id_vendedor = ven.id_vendedor
    WHERE v.fk_id_vendedor = ?;
  `;

  db.query(sqlSelect, [id_vendedor], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.code + ': ' + err.sqlMessage });
      return;
    }

    if (result.length > 0) {
      const ventasMap = {};

      // Agrupar las ventas y sus pedidos
      result.forEach(row => {
        if (!ventasMap[row.id_venta]) {
          ventasMap[row.id_venta] = {
            id_venta: row.id_venta,
            fecha: row.fecha,
            nombre_cliente: row.nombre_cliente,
            vendedor: row.vendedor,
            estado: row.estado,
            pedidos: []
          };
        }

        if (row.producto) {
          ventasMap[row.id_venta].pedidos.push({
            producto: row.producto,
            descripcion: row.descripcion,
            cantidad: row.cantidad,
            precio_unitario: row.precio,
            total: row.cantidad * row.precio
          });
        }
      });

      const ventas = Object.values(ventasMap);
      res.status(200).json({ ventas });
    } else {
      res.status(404).json({ message: 'No se encontraron ventas para el vendedor especificado' });
    }
  });
});

// Ruta para obtener todas las ventas
router.get('/get-ventas', (req, res) => {
  const sqlSelectAll = `
    SELECT v.id_venta, v.fecha, v.nombre_cliente, ven.nombre AS vendedor,
           p.nombre AS producto, p.descripcion, ped.cantidad, p.precio, v.estado
    FROM Venta v
    LEFT JOIN Pedido ped ON v.id_venta = ped.fk_id_venta
    LEFT JOIN Producto p ON ped.fk_id_producto = p.id_producto
    LEFT JOIN Vendedor ven ON v.fk_id_vendedor = ven.id_vendedor;
  `;

  db.query(sqlSelectAll, (err, result) => {
    if (err) {
      res.status(500).json({ error: err.code + ': ' + err.sqlMessage });
      return;
    }

    if (result.length > 0) {
      const ventasMap = {};

      // Agrupar las ventas y sus pedidos
      result.forEach(row => {
        if (!ventasMap[row.id_venta]) {
          ventasMap[row.id_venta] = {
            id_venta: row.id_venta,
            fecha: row.fecha,
            nombre_cliente: row.nombre_cliente,
            vendedor: row.vendedor,
            estado: row.estado,
            pedidos: []
          };
        }

        if (row.producto) {
          ventasMap[row.id_venta].pedidos.push({
            producto: row.producto,
            descripcion: row.descripcion,
            cantidad: row.cantidad,
            precio_unitario: row.precio,
            total: row.cantidad * row.precio
          });
        }
      });

      const ventas = Object.values(ventasMap);
      res.status(200).json({ ventas });
    } else {
      res.status(404).json({ message: 'No se encontraron ventas' });
    }
  });
});

// Ruta para obtener las ventas filtradas por estado
router.get('/get-ventas/estado/:estado', (req, res) => {
  const estado = req.params.estado;

  const sqlSelectByEstado = `
    SELECT v.id_venta, v.fecha, v.nombre_cliente, ven.nombre AS vendedor,
            p.nombre AS producto, p.descripcion, ped.cantidad, p.precio, v.estado
    FROM Venta v
    INNER JOIN Pedido ped ON v.id_venta = ped.fk_id_venta
    INNER JOIN Producto p ON ped.fk_id_producto = p.id_producto
    INNER JOIN Vendedor ven ON v.fk_id_vendedor = ven.id_vendedor
    WHERE v.estado = ?;
  `;

  db.query(sqlSelectByEstado, [estado], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.code + ': ' + err.sqlMessage });
      return;
    }

    if (result.length > 0) {
      const ventasMap = {};

      result.forEach(row => {
        if (!ventasMap[row.id_venta]) {
          ventasMap[row.id_venta] = {
            id_venta: row.id_venta,
            fecha: row.fecha,
            nombre_cliente: row.nombre_cliente,
            vendedor: row.vendedor,
            estado: row.estado,
            pedidos: []
          };
        }

        ventasMap[row.id_venta].pedidos.push({
          producto: row.producto,
          descripcion: row.descripcion,
          cantidad: row.cantidad,
          precio_unitario: row.precio,
          total: row.cantidad * row.precio
        });
      });

      const ventas = Object.values(ventasMap);
      res.status(200).json({ ventas });
    } else {
      res.status(404).json({ message: 'No se encontraron ventas con el estado especificado' });
    }
  });
});


module.exports = router;