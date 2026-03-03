require('dotenv').config();
const express = require('express');
const PORT = process.env.PORT || 8000;
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const apiroute = require('./routes/apiroute');
const { router: sseRouter } = require('./routes/sse');
const dbConnect = require('./config/db');

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use('/', apiroute);
app.use('/', sseRouter);


// Connect to MongoDB
dbConnect();



app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
})




