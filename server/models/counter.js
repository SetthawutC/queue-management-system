const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // ชื่อของ counter เช่น "queue_number"
  seq: { type: Number, default: 0 }      // ค่าตัวเลขที่รันไปถึงล่าสุด
});

module.exports = mongoose.model('Counter', counterSchema);