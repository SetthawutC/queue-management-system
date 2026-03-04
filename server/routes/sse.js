const express = require('express');
const router = express.Router();
const QueueNow = require('../models/queuenow');
const NodeCache = require('node-cache');

// ดึง instance ของ cache มาใช้งาน (ถ้าคุณแยกไฟล์ แนะนำให้ส่ง cache instance เข้ามา หรือใช้ตัวแปร global)
// ในที่นี้ผมจะสร้างเพื่อให้ logic มันทำงานสัมพันธ์กับ apiRoute
const myCache = new NodeCache({ stdTTL: 15 }); 
const CACHE_KEY_QUEUENOW = "queuenow_all";

let clients = [];

router.get('/queue-updates', (req, res) => {
    // 1. ตั้งค่า Header สำคัญเพื่อป้องกัน Connection หลุด
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform'); // no-transform ป้องกันพวก proxy บีบอัดข้อมูล
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // สำคัญมากสำหรับผู้ที่ใช้ Nginx

    // ส่งข้อมูลครั้งแรกทันทีที่ต่อติด (Initial Connect)
    res.write(':ok\n\n');

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // 2. ส่ง Heartbeat ทุกๆ 20 วินาที เพื่อไม่ให้ Connection ถูกตัด (Idle Timeout)
    const keepAlive = setInterval(() => {
        res.write(':keepalive\n\n');
    }, 20000);

    req.on('close', () => {
        clearInterval(keepAlive); // ล้าง Interval เมื่อ client ออกไป
        clients = clients.filter(client => client.id !== clientId);
    });
});

const sendUpdateToAll = async () => {
    try {
        let queues;
        
        // 3. ตรวจสอบจาก Cache ก่อนเพื่อให้สัมพันธ์กับ apiRoute
        const cachedData = myCache.get(CACHE_KEY_QUEUENOW);
        if (cachedData) {
            queues = cachedData;
        } else {
            queues = await QueueNow.find();
            // ถ้าดึงใหม่ ก็เก็บลง cache ไว้ด้วย
            myCache.set(CACHE_KEY_QUEUENOW, queues);
        }

        const data = JSON.stringify(queues);
        
        // ส่งข้อมูลให้ทุกคนที่ต่ออยู่
        clients.forEach(client => {
            client.res.write(`data: ${data}\n\n`);
        });

    } catch (err) {
        console.error('Error broadcasting queue update', err);
    }
};

module.exports = { router, sendUpdateToAll };