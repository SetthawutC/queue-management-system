const express = require('express');
const router = express.Router();
const QueueNow = require('../models/queuenow');

// SSE clients storage
let clients = [];

// provide endpoint for clients to subscribe
router.get('/queue-updates', (req, res) => {
    // set required headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
    });
});

// broadcast helper
const sendUpdateToAll = async () => {
    try {
        const queues = await QueueNow.find();
        const data = JSON.stringify(queues);
        clients.forEach(client => {
            client.res.write(`data: ${data}\n\n`);
        });
    } catch (err) {
        console.error('Error broadcasting queue update', err);
    }
};

module.exports = { router, sendUpdateToAll };