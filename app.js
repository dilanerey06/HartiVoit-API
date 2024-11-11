const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());
// app.use(cors({
//     origin: 'https://localhost:3000', // Ajusta el puerto según el origen
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     credentials: true, // Permite cookies y cabeceras de autenticación
//   }));
const port = process.env.API_PORT || 30013;

//Routes
const loginRoute = require('./routes/login');
const ventasRoute = require('./routes/ventas');
const productosRoute = require('./routes/productos');


app.use('/api/login', loginRoute);
app.use('/api/ventas', ventasRoute);
app.use('/api/productos', productosRoute);


app.listen(port,() => {
    console.log('Listen on port ' + port);
    // console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    
})