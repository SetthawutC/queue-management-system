const express = require('express');
const router = express.Router();
const QueueNow = require('../models/queuenow');

const NodeCache = require('node-cache');

// Cache Instance
const myCache = new NodeCache({ stdTTL: 15 }); 
const CACHE_KEY_QUEUENOW = "queuenow_all";

let clients = [];

router.get('/queue-updates', (req, res) => {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform'); 
    res.setHeader('Connection', 'keep-alive');

    // Initial Connect
    res.write(':ok\n\n');

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // keep connection alive by sending a comment every 20 seconds
    const keepAlive = setInterval(() => {
        res.write(':keepalive\n\n');
    }, 20000);
    // when client disconnects   
    req.on('close', () => {
        clearInterval(keepAlive);
        clients = clients.filter(client => client.id !== clientId);
    });
});

const sendUpdateToAll = async () => {
    try {
        const queues = await QueueNow.find().sort({ queue_number: 1 });
        
        //Update cache with latest data
        myCache.set(CACHE_KEY_QUEUENOW, queues);
        const data = JSON.stringify(queues);
        
        // Send data to all connected clients
        clients.forEach(client => {
            client.res.write(`data: ${data}\n\n`);
        });
        console.log(`Broadcast : ข้อมูลคิวล่าสุดส่งออกไปแล้ว`);

    } catch (err) {
        console.error('Error broadcasting queue update', err);
    }
};
module.exports = { router, sendUpdateToAll };