const mongoose = require('mongoose');
const QueueHistorySchema = new mongoose.Schema({
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
    collection: 'queuehistory',
    timestamps: true
});

const QueueHistory = mongoose.model('QueueHistory', QueueHistorySchema);

module.exports = QueueHistory;
