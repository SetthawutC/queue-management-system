const express = require('express');
const router = express.Router();
const QueueNow = require('../models/queuenow');
const QueueHistory = require('../models/queuehistory');
const { sendUpdateToAll } = require('./sse');

//post queue data

router.post('/queue', async (req, res) => {
    try {
        const { customer_name, phone, customer_count, note } = req.body;

        // 1. แยกหมวดหมู่ (A, B, C)
        function getCategory(count) {
            const n = Number(count) || 0;
            return n <= 2 ? 'A' : (n <= 6 ? 'B' : 'C');
        }
        const category = getCategory(customer_count);

        // 2. หาคิวล่าสุดของหมวดนี้เพื่อรันเลขต่อ (เน้นที่ category_seq ตรงๆ)
        const lastInCategory = await QueueNow.findOne({ category: category })
                                             .sort({ category_seq: -1 });
        
        // ถ้าไม่มีคิวในหมวดนี้เลย ให้เริ่มที่ 1
        const nextCatSeq = lastInCategory ? Number(lastInCategory.category_seq) + 1 : 1;

        // 3. หา Global Queue Number (เลขรันรวมทั้งร้าน)
        const lastGlobal = await QueueNow.findOne().sort({ queue_number: -1 });
        const nextQueueNumber = lastGlobal ? Number(lastGlobal.queue_number) + 1 : 1;

        // 4. สร้างป้าย Label (เช่น C01)
        const label = `${category}${String(nextCatSeq).padStart(2, '0')}`;

        // 5. บันทึกลง QueueNow
        const newQueue = new QueueNow({
            customer_name, phone, customer_count, note,
            queue_number: nextQueueNumber,
            category, 
            category_seq: nextCatSeq, 
            label,
            customerstatus: 'waiting'
        });
        const savedQueue = await newQueue.save();

        // 6. บันทึกลง QueueHistory โดยใช้ข้อมูลจาก savedQueue
        const historyData = new QueueHistory({
            ...savedQueue.toObject(),
            _id: undefined,
            original_id: savedQueue._id,
            created_at_date: new Date().toLocaleDateString('th-TH'),
            created_at_time: new Date().toLocaleTimeString('th-TH'),
            timestamp: new Date()
        });
        await historyData.save();

        res.status(201).json(savedQueue);
        console.log(`[Success] คิวใหม่: ${label} (ลำดับรวม: ${nextQueueNumber})`);
        // broadcast new queue to any SSE subscribers (e.g., management page)
        sendUpdateToAll();

    } catch (error) {
        console.error('Error:', error.message);
        res.status(400).json({ error: 'เกิดข้อผิดพลาดในการจองคิว' });
    }
});

//Get queue data
router.get('/queue', async (req, res) => {
    try {
        const queues = await QueueNow.find();
        res.json(queues);
    } catch (error) {
        console.error('Error fetching queues:', error.message);
        res.status(500).json({ error: 'Error fetching queues' });
    }
});

router.get('/queuehistory', async (req, res) => {
    try {
        const queues = await QueueHistory.find();
        res.json(queues);
    } catch (error) {
        console.error('Error fetching queues:', error.message);
        res.status(500).json({ error: 'Error fetching queues' });
    }
});


//Get queue data from id
router.get('/queue/:id', async (req, res) => {
    try {
        const queue = await QueueNow.findById(req.params.id);
        if (!queue) {
            return res.status(404).json({ error: 'Queue not found' });
        }
        res.json(queue);
    } catch (error){
        res.status(500).json({ error: 'Error fetching queue' });

    }
});

// Update queue by id (e.g., cancel or complete)
router.put('/queue/:id', async (req, res) => {
    try {
        const updated = await QueueNow.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        if (!updated) return res.status(404).json({ error: 'Queue not found' });
        // If status changed to cancelled or completed, also add to history and remove from current list
        if (req.body.status === 'cancelled' || req.body.customerstatus === 'cancelled' || req.body.status === 'completed' || req.body.customerstatus === 'completed') {
            // create history record
            const historyData = {
                customerstatus: req.body.status || req.body.customerstatus || updated.customerstatus,
                customer_name: updated.customer_name,
                phone: updated.phone,
                note: updated.note,
                customer_count: updated.customer_count,
                queue_number: updated.queue_number,
                category: updated.category,
                category_seq: updated.category_seq,
                label: updated.label
            };
            await QueueHistory.create(historyData);
            // remove from QueueNow
            await QueueNow.findByIdAndDelete(req.params.id);

            // broadcast update so clients drop this entry  
            sendUpdateToAll();

            return res.json({ message: 'Queue moved to history', data: historyData });
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating queue:', error.message);
        res.status(500).json({ error: 'Error updating queue' });
    }
});




module.exports = router;