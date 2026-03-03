const mongoose = require('mongoose');

const dbConnect = () => {   
    mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
    });
}

module.exports = dbConnect;