// ใช้เทสต์ประสิทธิภาพด้วย k6 เพื่อจำลองการส่งคำสั่ง POST ไปยัง API ของเรา
import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
    vus: 5, 
    duration: '30s' 
};

// ฟังก์ชันสำหรับสุ่มตัวเลขโทรศัพท์และข้อมูล
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function () {
    const url = 'http://localhost:8000/queue'; // ปรับ Path ตาม API ของคุณ
    
    // สุ่มข้อมูลเพื่อไม่ให้ซ้ำกันในแต่ละ Request
    const payload = JSON.stringify({
        customer_name: `User-${getRandomInt(1, 1000)}`,
        phone: `08${getRandomInt(10000000, 99999999)}`,
        note: `Random Note ${Math.random().toString(36).substring(7)}`,
        customer_count: getRandomInt(1, 20) // สุ่มจำนวนลูกค้า 1-20 คน
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // ส่งคำสั่ง POST ไปยัง Server
    const res = http.post(url, payload, params);

    // ตรวจสอบสถานะการตอบกลับใน Console ของ k6
    if (res.status !== 201 && res.status !== 200) {
        console.error(`❌ Request Failed! Status: ${res.status} Instance ID: ${res.json().serverID || 'unknown'}`);
    }

    sleep(1); // พัก 1 วินาทีก่อนเริ่มรอบใหม่
}