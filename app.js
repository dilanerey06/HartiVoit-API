const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());
const port = process.env.API_PORT || 30013;


// app.get('/',(req,res) => {
//     res.status(200).send('Hello World!')    
// })

//Routes
const loginRoute = require('./routes/login');
const ventasRoute = require('./routes/ventas');

app.use('/api/login', loginRoute);
app.use('/api/ventas', ventasRoute);

app.listen(port,() => {
    console.log('Listen on port ' + port);
})