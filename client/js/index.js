// --- 1. Helper Functions ---
function getCategory(count) {
    const n = Number(count) || 0;
    if (n <= 2) return 'A';
    if (n <= 6) return 'B';
    return 'C';
}

function formatTicket(prefix, num) {
    if (num == null || num === undefined || num === 0) return `${prefix}--`;
    return `${prefix}${String(num).padStart(2, '0')}`;
}

// --- 2. Logic การวาด UI (แยกออกมาให้เรียกซ้ำได้) ---
function renderQueueUI(queues) {
    if (!queues || !Array.isArray(queues)) return;

    // หาคิวแรกที่กำลังรอในแต่ละหมวด (A, B, C)
    const prefixes = ['A', 'B', 'C'];
    const categoryMap = {};
    prefixes.forEach(p => {
        const found = queues.find(q => q.customerstatus === 'waiting' && getCategory(q.customer_count) === p);
        categoryMap[p] = found ? found.queue_number : null;
    });

    // อัปเดตหน้าจอแสดงคิวปัจจุบัน (Axx Bxx Cxx)
    const currentElem = document.getElementById("current-queue");
    if (currentElem) {
        currentElem.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-6">
            ${prefixes.map(p => `
                <div class="text-center">
                    <div class="text-[56px] md:text-[80px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-blue-400">
                        ${formatTicket(p, categoryMap[p])}
                    </div>
                </div>
            `).join('')}
        </div>`;
    }

    // --- ส่วนของ "คิวของฉัน" ---
    const myQueueRaw = localStorage.getItem("my_queue");
    const section = document.getElementById("my-queue-section");
    const reserveLink = document.getElementById('reserve-link');
    const reserveCancelBtn = document.getElementById('reserve-cancel-btn');

    if (myQueueRaw) {
        const myQueueNum = parseInt(myQueueRaw);
        
        // ตรวจสอบว่าหมายเลขคิวเป็นตัวเลขที่ถูกต้อง
        if (isNaN(myQueueNum)) {
            console.error("Invalid queue number from localStorage:", myQueueRaw);
            if (section) section.classList.add("hidden");
            if (reserveLink) reserveLink.classList.remove('hidden');
            if (reserveCancelBtn) reserveCancelBtn.classList.add('hidden');
        } else {
            const myInfo = queues.find(q => q.queue_number === myQueueNum);
            
            // ค้นหาจำนวนคิวที่รอก่อนหน้าเรา (เฉพาะคนที่ status เป็น waiting และเลขคิวน้อยกว่าเรา)
            const waitingBeforeMe = queues.filter(q => 
                q.customerstatus === 'waiting' && q.queue_number < myQueueNum
            ).length;

            if (section) section.classList.remove("hidden");
            if (reserveLink) reserveLink.classList.add('hidden');
            if (reserveCancelBtn) reserveCancelBtn.classList.remove('hidden');

            // แสดงเลขคิวตัวเอง
            let myCount = localStorage.getItem('my_queue_count');
            const prefix = getCategory(myCount);
                document.getElementById("my-queue-number").textContent = formatTicket(prefix, myQueueNum);

            const remainingElem = document.getElementById("remaining-queue");
            const remainingText = document.getElementById("remaining-queue-text");

            // ตรวจสอบสถานะตัวเอง: ถ้าไม่ใช่ waiting แปลว่าถูกเรียกแล้ว
            if (myInfo && myInfo.customerstatus !== 'waiting') {
                remainingElem.textContent = "ถึงคิวของคุณแล้ว!";
                remainingElem.className = "text-[40px] md:text-[60px] font-bold text-green-500 text-center";
                if (remainingText) remainingText.classList.add("hidden");
                
                // หมายเหตุ: ไม่แนะนำให้ลบ localStorage ทันที ให้ลูกค้ากด "รับทราบ" หรือพนักงานกดจบงานก่อน
            } else {
                remainingElem.textContent = waitingBeforeMe.toString().padStart(2, "0");
                remainingElem.classList.remove("text-green-500");
                if (remainingText) remainingText.classList.remove("hidden");
            }
        }
    } else {
        if (section) section.classList.add("hidden");
        if (reserveLink) reserveLink.classList.remove('hidden');
        if (reserveCancelBtn) reserveCancelBtn.classList.add('hidden');
    }
}

// --- 3. ส่วนของ SSE (ตัวรับข้อมูล Real-time) ---
function initQueueSSE() {
    const eventSource = new EventSource("http://localhost:8000/queue-updates");

    eventSource.onmessage = (event) => {
        try {
            const queues = JSON.parse(event.data);
            console.log("Update received via SSE");
            renderQueueUI(queues);
        } catch (err) {
            console.error("Error parsing SSE data:", err);
        }
    };

    eventSource.onerror = (err) => {
        console.error("SSE connection failed. Attempting to reconnect...");
        // EventSource จะพยายาม reconnect ให้อัตโนมัติอยู่แล้วครับ
    };
}

// --- 4. เรียกข้อมูลครั้งแรกตอนโหลดหน้า (Initial Load) ---
async function initialFetch() {
    try {
        const response = await axios.get("http://localhost:8000/queue");
        renderQueueUI(response.data);
    } catch (error) {
        console.error("Initial fetch failed:", error);
    }
}

// เมื่อ DOM พร้อมทำงาน
document.addEventListener('DOMContentLoaded', () => {
    initialFetch(); // ดึงข้อมูลทันที 1 ครั้ง
    initQueueSSE(); // เปิดท่อรับข้อมูล Real-time ยาวๆ
});