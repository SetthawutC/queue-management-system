const mongoose = require('mongoose');

const queueNowSchema = new mongoose.Schema({
    customerstatus: {
        type: String,
        enum: ['waiting', 'completed', 'cancelled'],
        default: 'waiting'
    },
    customer_name: { type: String, required: true },
    phone: { type: String, required: true },
    note: { type: String, default: "" },
    customer_count: { type: Number, required: true }, 
    queue_number: { type: Number, required: true },
    category: { type: String, required: true, enum: ['A','B','C'] },
    category_seq: { type: Number, required: true },
    label: { type: String, required: true }
}, { 
    collection: 'queuenow' 
});

const QueueNow = mongoose.model('QueueNow', queueNowSchema);

module.exports = QueueNow;