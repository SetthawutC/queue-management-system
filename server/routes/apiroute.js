const express = require('express');
const router = express.Router();
const QueueNow = require('../models/queuenow');
const QueueHistory = require('../models/queuehistory');
const { sendUpdateToAll } = require('./sse');

//post queue data

router.post('/queue', async (req, res) => {
    try {
        const { customer_name, phone, customer_count, note } = req.body;

        // 1. ฟังก์ชันแยกหมวดหมู่
        function getCategory(count) {
            const n = Number(count) || 0;
            if (n <= 2) return 'A';
            if (n <= 6) return 'B';
            return 'C';
        }
        const category = getCategory(customer_count);

        // 2. หาค่าลำดับล่าสุดของหมวดหมู่นี้ (category_seq) 
        // ปรับปรุง: ใช้ .findOne() และ sort จะเร็วกว่าการดึงมาทั้งหมด (.find)
        const lastInCategory = await QueueNow.findOne({ category: category })
                                             .sort({ category_seq: -1 });
        
        // ถ้าไม่มีคิวในหมวดนี้เลย ให้เริ่มที่ 1 (ซึ่งจะกลายเป็น A01, B01, C01)
        const nextCatSeq = lastInCategory ? lastInCategory.category_seq + 1 : 1;

        // 3. หาคิว Global (เลขรันรวม) เพื่อใช้เรียงลำดับภาพรวม
        const lastGlobal = await QueueNow.findOne().sort({ queue_number: -1 });
        const nextQueueNumber = lastGlobal ? lastGlobal.queue_number + 1 : 1;

        // 4. สร้างป้าย Label (เช่น A01, B05)
        const label = `${category}${String(nextCatSeq).padStart(2, '0')}`;

        // 5. บันทึกข้อมูลลง Database
        const newQueue = new QueueNow({
            customer_name,
            phone,
            customer_count,
            note,
            queue_number: nextQueueNumber, // เลขรันรวม (1, 2, 3...)
            category,                      // หมวด (A, B, C)
            category_seq: nextCatSeq,      // ลำดับในหมวด (1, 2, 3...)
            label,                         // ป้าย (A01, B01...)
            customerstatus: 'waiting'      // กำหนดค่าเริ่มต้นเป็น waiting
        });

        const savedQueue = await newQueue.save();
        
        // 6. ส่งข้อมูลกลับไปให้ Frontend
        res.status(201).json(savedQueue);
        console.log(`[Success] จองคิวสำเร็จ: ${savedQueue.label} (Global: ${savedQueue.queue_number})`);

    } catch (error) {
        console.error('Error creating queue:', error.message);
        res.status(400).json({ error: 'Error creating queue' });
    }
});

//Keep queue history 
router.post('/queuehistory', async (req, res) => {
    try {
        const newQueueHistory = new QueueHistory(req.body);
        const savedQueueHistory = await newQueueHistory.save();

        res.status(201).json(savedQueueHistory);
        console.log("results:", savedQueueHistory);
    } catch (error) {
        console.error('Error creating queue history',error.message);
        res.status(400).json({ error: 'Error creating queue history' });
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