require('dotenv').config();
const express = require('express');
const PORT = process.env.PORT || 8000;
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const apiroute = require('./routes/apiroute');
const { router: sseRouter } = require('./routes/ServerSentEvent');
const dbConnect = require('./config/db');

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use('/', apiroute);
app.use('/', sseRouter);


// Connect to MongoDB
dbConnect();




app.listen(PORT, '0.0.0.0', () => {
    console.log(`Network access at http://localhost:${PORT}`);
});




