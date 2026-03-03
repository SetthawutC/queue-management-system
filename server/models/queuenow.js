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
    customer_count: { type: Number, required: true }, // เปลี่ยนจาก String เป็น Number ตามที่คุณแก้ในโค้ดล่าสุด
    queue_number: { type: Number, required: true },
    category: { type: String, required: true, enum: ['A','B','C'] },
    category_seq: { type: Number, required: true },
    label: { type: String, required: true }
}, { 
    // เพิ่มบรรทัดนี้เพื่อระบุชื่อ Collection ให้ตรงกับที่มีอยู่เดิม
    collection: 'queuenow' 
});

const QueueNow = mongoose.model('QueueNow', queueNowSchema);

module.exports = QueueNow;