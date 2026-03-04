const express = require('express');
const router = express.Router();
const QueueNow = require('../models/queuenow');
const QueueHistory = require('../models/queuehistory');
const { sendUpdateToAll } = require('./sse');
const NodeCache = require('node-cache');

// สร้าง Cache Instance (TTL 15 วินาที สำหรับข้อมูลคิวที่เปลี่ยนบ่อย)
const myCache = new NodeCache({ stdTTL: 15, checkperiod: 20 });

// คีย์สำหรับเก็บ Cache
const CACHE_KEY_QUEUENOW = "queuenow_all";
const CACHE_KEY_HISTORY = "queuehistory_all";

// ฟังก์ชันล้าง Cache เมื่อข้อมูลเปลี่ยน
const clearQueueCache = () => {
    myCache.del([CACHE_KEY_QUEUENOW, CACHE_KEY_HISTORY]);
};

// --- ROUTES ---

router.post('/queue', async (req, res) => {
    try {
        const { customer_name, phone, customer_count, note } = req.body;
        
        function getCategory(count) {
            const n = Number(count) || 0;
            return n <= 2 ? 'A' : (n <= 6 ? 'B' : 'C');
        }
        const category = getCategory(customer_count);

        const lastInCategory = await QueueNow.findOne({ category: category }).sort({ category_seq: -1 });
        const nextCatSeq = lastInCategory ? Number(lastInCategory.category_seq) + 1 : 1;

        const lastGlobal = await QueueNow.findOne().sort({ queue_number: -1 });
        const nextQueueNumber = lastGlobal ? Number(lastGlobal.queue_number) + 1 : 1;

        const label = `${category}${String(nextCatSeq).padStart(2, '0')}`;

        const newQueue = new QueueNow({
            customer_name, phone, customer_count, note,
            queue_number: nextQueueNumber,
            category, 
            category_seq: nextCatSeq, 
            label,
            customerstatus: 'waiting'
        });
        const savedQueue = await newQueue.save();

        // ล้าง Cache เพราะมีคิวใหม่
        clearQueueCache();

        res.status(201).json(savedQueue);
        console.log(`[Success] คิวใหม่: ${label} (ลำดับรวม: ${nextQueueNumber})`);
        sendUpdateToAll();

    } catch (error) {
        console.error('Error:', error.message);
        res.status(400).json({ error: 'เกิดข้อผิดพลาดในการจองคิว' });
    }
});

// Get queue data (With Cache)
router.get('/queue', async (req, res) => {
    try {
        const cachedData = myCache.get(CACHE_KEY_QUEUENOW);
        if (cachedData) return res.json(cachedData);

        const queues = await QueueNow.find();
        myCache.set(CACHE_KEY_QUEUENOW, queues); // บันทึกลง Cache
        res.json(queues);
    } catch (error) {
        console.error('Error fetching queues:', error.message);
        res.status(500).json({ error: 'Error fetching queues' });
    }
});

// Get queue history (With Cache)
router.get('/queuehistory', async (req, res) => {
    try {
        const cachedHistory = myCache.get(CACHE_KEY_HISTORY);
        if (cachedHistory) return res.json(cachedHistory);

        const queues = await QueueHistory.find();
        myCache.set(CACHE_KEY_HISTORY, queues);
        res.json(queues);
    } catch (error) {
        console.error('Error fetching history:', error.message);
        res.status(500).json({ error: 'Error fetching history' });
    }
});

// Get queue data from id (Cache แยกตาม ID)
router.get('/queue/:id', async (req, res) => {
    try {
        const cacheKey = `queue_${req.params.id}`;
        const cachedQueue = myCache.get(cacheKey);
        if (cachedQueue) return res.json(cachedQueue);

        const queue = await QueueNow.findById(req.params.id);
        if (!queue) return res.status(404).json({ error: 'Queue not found' });

        myCache.set(cacheKey, queue, 30); // Cache เฉพาะตัว 30 วินาที
        res.json(queue);
    } catch (error){
        res.status(500).json({ error: 'Error fetching queue' });
    }
});

// Update queue by id
router.put('/queue/:id', async (req, res) => {
    try {
        const currentQueue = await QueueNow.findById(req.params.id);
        if (!currentQueue) return res.status(404).json({ error: 'Queue not found' });

        const newStatus = req.body.status || req.body.customerstatus;

        // ล้าง Cache รายตัวและ Cache รวม
        myCache.del(`queue_${req.params.id}`);
        clearQueueCache();

        if (currentQueue.customerstatus !== 'waiting' && 
           (newStatus === 'cancelled' || newStatus === 'completed')) {
            
            await QueueNow.findByIdAndDelete(req.params.id);
            sendUpdateToAll();
            return res.json({ message: 'Queue removed from current list' });
        }

        const updated = await QueueNow.findByIdAndUpdate(
            req.params.id, 
            { $set: { customerstatus: newStatus } },
            { returnDocument: 'after' }
        );

        await QueueHistory.create({
            ...updated.toObject(),
            _id: undefined,
            original_id: updated._id,
            timestamp: new Date()
        });

        sendUpdateToAll();
        res.json({ message: 'Status updated and recorded to history', data: updated });

    } catch (error) {
        console.error('Error updating queue:', error.message);
        res.status(500).json({ error: 'Error updating queue' });
    }
});

// ลบคิวทั้งหมด
router.delete('/queues', async (req, res) => {
    try {
        await QueueNow.deleteMany({});
        await QueueHistory.deleteMany({});
        
        // ล้าง Cache ทั้งหมดในระบบ
        myCache.flushAll();
        
        res.json({ message: 'All queues deleted successfully' });
        sendUpdateToAll();
    } catch (error) {
        console.error('Error deleting queues:', error.message);
        res.status(500).json({ error: 'Error deleting queues' });
    }
});

module.exports = router;