const express = require('express');
const router = express.Router();
const QueueNow = require('../models/queuenow');
const QueueHistory = require('../models/queuehistory');
const Counter = require('../models/counter');
const { sendUpdateToAll } = require('./ServerSentEvent');
const NodeCache = require('node-cache');

// สร้าง Cache Instance
const myCache = new NodeCache({ stdTTL: 15, checkperiod: 20 });

// คีย์สำหรับเก็บ Cache
const CACHE_KEY_QUEUENOW = "queuenow_all";
const CACHE_KEY_HISTORY = "queuehistory_all";

// ฟังก์ชันล้าง Cache เมื่อข้อมูลเปลี่ยน + Log
const clearQueueCache = () => {
    console.log('🧹 Data changed: Clearing relevant caches...');
    myCache.del([CACHE_KEY_QUEUENOW, CACHE_KEY_HISTORY]);
};

// --- ROUTES ---//

//บันทึกคิวใหม่
router.post('/queue', async (req, res) => {
    try {
        const { customer_name, phone, customer_count, note } = req.body;
        function getCategory(count) {
            const n = Number(count) || 0;
            return n <= 2 ? 'A' : (n <= 6 ? 'B' : 'C');
        }
        const category = getCategory(customer_count);
        
        //ดึงเลข Global Queue Number
        const globalCounter = await Counter.findOneAndUpdate(
            { _id: 'global_queue' },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true , setDefaultsOnInsert: true }
        );
        const nextQueueNumber = globalCounter.seq;

        //ดึงเลขลำดับแยกตามหมวด (A, B, หรือ C)
        const categoryCounter = await Counter.findOneAndUpdate(
            { _id: `category_${category}` }, // แยก ID ตามหมวด เช่น category_A
            { $inc: { seq: 1 } },
            { returnDocument: 'after',upsert: true }
        );
        const nextCatSeq = categoryCounter.seq;

        // สร้าง Label
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

        clearQueueCache(); // ล้าง Cache เดิมของคุณ
        res.status(201).json(savedQueue);
        
        console.log(`[Success] ✅ คิวใหม่: ${label} (Global: ${nextQueueNumber}) | Instance: ${process.env.NODE_APP_INSTANCE || 0}`);
        
        sendUpdateToAll(); // พ่นข้อมูลออก SSE ทันที

    } catch (error) {
        console.error('Error:', error.message);
        res.status(400).json({ error: 'เกิดข้อผิดพลาดในการจองคิว' });
    }
});



// Get queue data (With Cache Log)
router.get('/queue', async (req, res) => {
    try {
        const cachedData = myCache.get(CACHE_KEY_QUEUENOW);
        if (cachedData) {
            console.log('Cache Hit: Successfully retrieved [QueueNow] from memory');
            return res.json(cachedData);
        }

        console.log('Cache Miss: Fetching [QueueNow] from MongoDB...');
        const queues = await QueueNow.find();
        myCache.set(CACHE_KEY_QUEUENOW, queues);
        res.json(queues);
    } catch (error) {
        console.error('Error fetching queues:', error.message);
        res.status(500).json({ error: 'Error fetching queues' });
    }
});

// Get queue history
router.get('/queuehistory', async (req, res) => {
    try {
        const cachedHistory = myCache.get(CACHE_KEY_HISTORY);
        if (cachedHistory) {
            console.log('🚀 Cache Hit: Successfully retrieved [QueueHistory] from memory');
            return res.json(cachedHistory);
        }

        console.log('☁️ Cache Miss: Fetching [QueueHistory] from MongoDB...');
        const queues = await QueueHistory.find();
        myCache.set(CACHE_KEY_HISTORY, queues);
        res.json(queues);
    } catch (error) {
        console.error('Error fetching history:', error.message);
        res.status(500).json({ error: 'Error fetching history' });
    }
});

// Get queue data from id
router.get('/queue/:id', async (req, res) => {
    try {
        const cacheKey = `queue_${req.params.id}`;
        const cachedQueue = myCache.get(cacheKey);
        if (cachedQueue) {
            console.log(` Cache Hit: Retrieved Queue ID ${req.params.id} from cache`);
            return res.json(cachedQueue);
        }

        const queue = await QueueNow.findById(req.params.id);
        if (!queue) return res.status(404).json({ error: 'Queue not found' });

        myCache.set(cacheKey, queue, 30);
        res.json(queue);
    } catch (error){
        res.status(500).json({ error: 'Error fetching queue' });
    }
});

// Update queue by id and save to history
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
            console.log(`🗑️ Queue ${req.params.id} removed and cache invalidated`);
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

        console.log(`📝 Status updated for ${updated.label} and cache invalidated`);
        sendUpdateToAll();
        res.json({ message: 'Status updated and recorded to history', data: updated });

    } catch (error) {
        console.error('Error updating queue:', error.message);
        res.status(500).json({ error: 'Error updating queue' });
    }
});

// ลบคิวทั้งหมด
router.delete('/queue', async (req, res) => {
    try {
        await QueueNow.deleteMany({});
        await Counter.deleteMany({});
        
        myCache.flushAll();
        console.log('💥 System Flush: All data deleted and cache cleared');
        
        res.json({ message: 'All queues deleted successfully' });
        sendUpdateToAll();
    } catch (error) {
        console.error('Error deleting queues:', error.message);
        res.status(500).json({ error: 'Error deleting queues' });
    }
});


module.exports = router;