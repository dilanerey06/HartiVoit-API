const express = require('express');
const router = express.Router();
const poolPromise = require('../config/conection'); // Importa la promesa de la pool

// Ruta para registrar una venta con varios pedidos
router.post('/registrar', async (req, res) => {
  try {
    const db = await poolPromise; // Espera a que la pool esté lista
    const { nombre_cliente, id_vendedor, pedidos } = req.body;

    if (!pedidos || pedidos.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar al menos un pedido.' });
    }

    // Insertar la venta primero con estado 'iniciado'
    const sqlInsertVenta = 'INSERT INTO Venta (fecha, nombre_cliente, fk_id_vendedor, estado) VALUES (NOW(), ?, ?, \'iniciado\');';
    const [ventaResult] = await db.query(sqlInsertVenta, [nombre_cliente, id_vendedor]);
    const ventaId = ventaResult.insertId;

    // Verificar stock para todos los pedidos antes de registrarlos
    for (const pedido of pedidos) {
      const { id_producto, cantidad } = pedido;
      const [stockResult] = await db.query('SELECT stock FROM Producto WHERE id_producto = ?;', [id_producto]);

      if (stockResult.length === 0 || stockResult[0].stock < cantidad) {
        await db.query('UPDATE Venta SET estado = \'cancelado\' WHERE id_venta = ?;', [ventaId]);
        return res.status(400).json({ message: `Stock insuficiente para el producto ID: ${id_producto}` });
      }
    }

    // Registrar los pedidos y actualizar el stock
    for (const pedido of pedidos) {
      const { id_producto, cantidad } = pedido;
      await db.query('INSERT INTO Pedido (cantidad, fk_id_producto, fk_id_venta) VALUES (?, ?, ?);', [cantidad, id_producto, ventaId]);
      await db.query('UPDATE Producto SET stock = stock - ? WHERE id_producto = ?;', [cantidad, id_producto]);
    }

    // Actualizar el estado de la venta a 'completado'
    await db.query('UPDATE Venta SET estado = \'completado\' WHERE id_venta = ?;', [ventaId]);
    res.status(201).json({ message: 'Venta y pedidos registrados exitosamente', ventaId });

  } catch (err) {
    console.error('Error al registrar la venta:', err);
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
});

// Ruta para obtener una venta específica por ID
router.get('/get-venta/:id', async (req, res) => {
  try {
    const db = await poolPromise; // Espera a que la pool esté lista
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

    const [result] = await db.query(sqlSelectVenta, [ventaId]);

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
  } catch (err) {
    console.error('Error al obtener la venta:', err);
    res.status(500).json({ error: 'Error al obtener la venta' });
  }
});

// Ruta para buscar ventas por vendedor
router.get('/get-ventas/vendedor/:id', async (req, res) => {
  try {
    const db = await poolPromise; // Espera a que la pool esté lista
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

    const [result] = await db.query(sqlSelect, [id_vendedor]);

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
  } catch (err) {
    console.error('Error al obtener las ventas por vendedor:', err);
    res.status(500).json({ error: 'Error al obtener las ventas por vendedor' });
  }
});

// Ruta para obtener todas las ventas
router.get('/get-ventas', async (req, res) => {
  try {
    const db = await poolPromise; // Espera a que la pool esté lista

    const sqlSelectAll = `
      SELECT v.id_venta, v.fecha, v.nombre_cliente, ven.nombre AS vendedor,
             p.nombre AS producto, p.descripcion, ped.cantidad, p.precio, v.estado
      FROM Venta v
      LEFT JOIN Pedido ped ON v.id_venta = ped.fk_id_venta
      LEFT JOIN Producto p ON ped.fk_id_producto = p.id_producto
      LEFT JOIN Vendedor ven ON v.fk_id_vendedor = ven.id_vendedor;
    `;

    const [result] = await db.query(sqlSelectAll);

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
  } catch (err) {
    console.error('Error al obtener todas las ventas:', err);
    res.status(500).json({ error: 'Error al obtener todas las ventas' });
  }
});

// Ruta para obtener las ventas filtradas por estado
router.get('/get-ventas/estado/:estado', async (req, res) => {
  try {
    const db = await poolPromise; // Espera a que la pool esté lista
    const estado = req.params.estado;

    const sqlSelectByEstado = `
      SELECT v.id_venta, v.fecha, v.nombre_cliente, ven.nombre AS vendedor,
             p.nombre AS producto, p.descripcion, ped.cantidad, p.precio, v.estado
      FROM Venta v
      LEFT JOIN Pedido ped ON v.id_venta = ped.fk_id_venta
      LEFT JOIN Producto p ON ped.fk_id_producto = p.id_producto
      LEFT JOIN Vendedor ven ON v.fk_id_vendedor = ven.id_vendedor
      WHERE v.estado = ?;
    `;

    const [result] = await db.query(sqlSelectByEstado, [estado]);

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
      res.status(404).json({ message: 'No se encontraron ventas con el estado especificado' });
    }
  } catch (err) {
    console.error('Error al obtener ventas por estado:', err);
    res.status(500).json({ error: 'Error al obtener ventas por estado' });
  }
});


// Ruta para obtener pedidos en un intervalo de fechas
router.get('/get-ventas/fechas', async (req, res) => {
  try {
    const db = await poolPromise; // Espera a que la pool esté lista
    const { fecha_inicio, fecha_fin } = req.body;

    // Validación de los parámetros de fecha
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ message: 'Debe proporcionar fecha de inicio y fecha de fin.' });
    }

    // Validación de que la fecha final no sea anterior a la fecha inicial
    if (new Date(fecha_fin) < new Date(fecha_inicio)) {
      return res.status(400).json({ message: 'La fecha final no puede ser anterior a la fecha de inicio.' });
    }

    const sqlSelectPedidos = `
      SELECT v.id_venta, v.fecha, v.nombre_cliente, ven.nombre AS vendedor,
             p.nombre AS producto, p.descripcion, ped.cantidad, p.precio
      FROM Venta v
      LEFT JOIN Pedido ped ON v.id_venta = ped.fk_id_venta
      LEFT JOIN Producto p ON ped.fk_id_producto = p.id_producto
      LEFT JOIN Vendedor ven ON v.fk_id_vendedor = ven.id_vendedor
      WHERE v.fecha BETWEEN ? AND ?;
    `;

    const [result] = await db.query(sqlSelectPedidos, [fecha_inicio, fecha_fin]);

    if (result.length > 0) {
      const pedidosMap = {};

      // Agrupar las ventas y sus pedidos
      result.forEach(row => {
        if (!pedidosMap[row.id_venta]) {
          pedidosMap[row.id_venta] = {
            id_venta: row.id_venta,
            fecha: row.fecha,
            nombre_cliente: row.nombre_cliente,
            vendedor: row.vendedor,
            pedidos: []
          };
        }

        if (row.producto) {
          pedidosMap[row.id_venta].pedidos.push({
            producto: row.producto,
            descripcion: row.descripcion,
            cantidad: row.cantidad,
            precio_unitario: row.precio,
            total: row.cantidad * row.precio
          });
        }
      });

      const pedidos = Object.values(pedidosMap);
      res.status(200).json({ pedidos });
    } else {
      res.status(404).json({ message: 'No se encontraron pedidos en el intervalo de fechas especificado' });
    }
  } catch (err) {
    console.error('Error al obtener pedidos en el intervalo de fechas:', err);
    res.status(500).json({ error: 'Error al obtener pedidos en el intervalo de fechas' });
  }
});

module.exports = router;