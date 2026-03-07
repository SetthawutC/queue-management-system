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
    res.setHeader('Cache-Control', 'no-cache, no-transform'); 
    res.setHeader('Connection', 'keep-alive');

    // ส่งข้อมูลครั้งแรกทันทีที่ต่อติด (Initial Connect)
    res.write(':ok\n\n');

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // 2. ส่ง Heartbeat ทุกๆ 20 วินาที เพื่อไม่ให้ Connection ถูกตัด (Idle Timeout)
    const keepAlive = setInterval(() => {
        res.write(':keepalive\n\n');
    }, 20000);
    //เมื่อ client ปิด connection ให้ล้าง Interval และลบ client ออกจาก list       
    req.on('close', () => {
        clearInterval(keepAlive);
        clients = clients.filter(client => client.id !== clientId);
    });
});

const sendUpdateToAll = async () => {
    try {
        //ดึงข้อมูลสดจาก MongoDB ทุกครั้งที่ต้องการ Broadcast
        const queues = await QueueNow.find().sort({ queue_number: 1 });
        //อัปเดตข้อมูลใหม่นี้กลับเข้าไปใน Cache ด้วย

        myCache.set(CACHE_KEY_QUEUENOW, queues);

        const data = JSON.stringify(queues);
        
        // 3. ส่งข้อมูลล่าสุดให้ทุกคนที่เชื่อมต่อ SSE อยู่
        clients.forEach(client => {
            client.res.write(`data: ${data}\n\n`);
        });

        console.log(`[Broadcast] 📡 ข้อมูลคิวล่าสุดส่งออกไปแล้ว`);

    } catch (err) {
        console.error('Error broadcasting queue update', err);
    }
};
module.exports = { router, sendUpdateToAll };