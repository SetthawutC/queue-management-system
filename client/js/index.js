// --- 1. Helper Functions ---
function getCategory(count) {
    const n = Number(count) || 0;
    if (n <= 2) return 'A';
    if (n <= 6) return 'B';
    return 'C';
}

function formatTicket(prefix, data) {
    if (data == null || data === undefined) return `${prefix}--`;
    if (typeof data === 'string' && data.startsWith(prefix)) return data;
    return `${prefix}${String(data).padStart(2, '0')}`;
}

// --- 2. Logic การวาด UI (จัดการสถานะ Real-time) ---
function renderQueueUI(queues) {
    if (!queues || !Array.isArray(queues)) return;

    // --- ส่วน Now Serving (ซ้าย) ---
    const prefixes = ['A', 'B', 'C'];
    const categoryMap = {};
    prefixes.forEach(p => {
    // 1. ลองหาคิวที่สถานะเป็น 'waiting' ก่อน (เพื่อดูว่ามีคิวถัดไปไหม)
    let found = queues.find(q => 
        q.customerstatus === 'waiting' && 
        (q.category === p || getCategory(q.customer_count) === p)
    );

    // 2. ถ้าไม่มีคิวรอแล้ว ให้ไปหา "คิวล่าสุดที่เพิ่งเรียกเสร็จ" (completed) มาโชว์คาไว้
    if (!found) {
        const finishedQueues = queues.filter(q => 
            q.customerstatus === 'completed' && 
            (q.category === p || getCategory(q.customer_count) === p)
        );
        
        if (finishedQueues.length > 0) {
            // เรียงตาม queue_number จากมากไปน้อย เพื่อเอาคนที่เพิ่งเรียกไปล่าสุด
            finishedQueues.sort((a, b) => b.queue_number - a.queue_number);
            found = finishedQueues[0];
        }
    }
    
    categoryMap[p] = found ? (found.label || found.category_seq) : null;
});

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

    // --- ส่วนของ "คิวของฉัน / สถานะคิวรอ" (ขวา) ---
    const myQueueRaw = localStorage.getItem("my_queue");
    const myQueueLabel = localStorage.getItem("my_queue_label");
    const section = document.getElementById("my-queue-section");
    const reserveLink = document.getElementById('reserve-link');
    const reserveCancelBtn = document.getElementById('reserve-cancel-btn');
    const remainingElem = document.getElementById("remaining-queue");
    const remainingText = document.getElementById("remaining-queue-text");
    const myTicketInfo = document.getElementById("my-ticket-info"); 

    // แสดง Section ขวาเสมอเพื่อให้คนทั่วไปดูคิวรอได้
    if (section) section.classList.remove("hidden");

    if (myQueueRaw) {
        // --- กรณี: จองแล้ว ---
        const myQueueNum = parseInt(myQueueRaw);
        const myInfo = queues.find(q => q.queue_number === myQueueNum);
        
        // นับคิวที่รอก่อนหน้าเรา (Global)
        const waitingBeforeMe = queues.filter(q => 
            q.customerstatus === 'waiting' && q.queue_number < myQueueNum
        ).length;

        if (reserveLink) reserveLink.classList.add('hidden');
        if (reserveCancelBtn) reserveCancelBtn.classList.remove('hidden');
        if (myTicketInfo) myTicketInfo.classList.remove('hidden'); 

        document.getElementById("my-queue-number").textContent = myQueueLabel || "---";

        // Logic: ตรวจสอบว่า Admin เปลี่ยนสถานะเป็นอย่างอื่น (เช่น completed) แล้วหรือยัง
        // ถ้าไม่พบ queues หรือ status ไม่ใช่ waiting แสดงว่าถึงคิวแล้ว
        if (!myInfo || (myInfo && myInfo.customerstatus !== 'waiting')) {
            // 1. เปลี่ยนข้อความเมื่อถึงคิว
            remainingElem.textContent = "ถึงคิวของคุณแล้ว!";
            // 2. ปรับสีและขนาดให้เด่นชัด (สีเขียวเข้ม)
            //    use both class and inline style as a fallback in case Tailwind rules were purged
            remainingElem.className = "text-[56px] md:text-[80px] font-black text-center leading-tight tracking-tight opacity-100 drop-shadow-md";
            remainingElem.style.color = '#16a34a'; // explicit fallback
            if (remainingText) remainingText.classList.add("hidden");
            
            // ซ่อนบัตรคิวเดิมเพื่อเน้นข้อความแจ้งเตือน
            if (myTicketInfo) myTicketInfo.classList.add('hidden'); 
        } else {
            // ยังไม่ถึงคิว: แสดงจำนวนคนรอก่อนหน้า
            remainingElem.textContent = waitingBeforeMe.toString().padStart(2, "0");
            remainingElem.className = "text-[120px] md:text-[150px] font-black text-slate-900 opacity-100 drop-shadow-md";
            if (remainingText) {
                remainingText.classList.remove("hidden");
                remainingText.textContent = "คิวก่อนหน้าคุณ";
            }
            if (myTicketInfo) myTicketInfo.classList.remove('hidden');
        }
    } else {
        // --- กรณี: ยังไม่ได้จอง (แสดงคิวรอรวมของร้าน)
        const totalWaiting = queues.filter(q => q.customerstatus === 'waiting').length;

        if (reserveLink) reserveLink.classList.remove('hidden');
        if (reserveCancelBtn) reserveCancelBtn.classList.add('hidden');
        if (myTicketInfo) myTicketInfo.classList.add('hidden');

        remainingElem.textContent = totalWaiting.toString().padStart(2, "0");
        remainingElem.className = "text-[120px] md:text-[150px]  text-slate-900 opacity-100 drop-shadow-md";
        
        if (remainingText) {
            remainingText.classList.remove("hidden");
            remainingText.textContent = "คิวรอทั้งหมดในขณะนี้";
        }
    }
}

// --- 3. ส่วนของ SSE (รับข้อมูลจาก Admin แบบ Real-time) ---
function initQueueSSE() {
    const eventSource = new EventSource("http://localhost:8000/queue-updates");
    eventSource.onmessage = (event) => {
        try {
            const queues = JSON.parse(event.data);
            renderQueueUI(queues);
        } catch (err) { console.error("SSE Error:", err); }
    };
    eventSource.onerror = () => {
        console.log("SSE Connection lost, retrying...");
    };
}

// --- 4. Initial Load (ดึงข้อมูลครั้งแรกที่เข้าเว็บ) ---
async function initialFetch() {
    try {
        const response = await axios.get("http://localhost:8000/queue");
        renderQueueUI(response.data);
    } catch (error) { console.error("Initial fetch failed:", error); }
}

document.addEventListener('DOMContentLoaded', () => {
    initialFetch();
    initQueueSSE();
});

// ฟังก์ชันยกเลิกคิว (User Cancel)
async function cancelMyQueue() {
    const id = localStorage.getItem('my_queue_id');
    if (!id) return;
    
    if (confirm('คุณต้องการยกเลิกการจองคิวนี้ใช่หรือไม่?')) {
        try {
            await axios.put(`http://localhost:8000/queue/${id}`, { 
                customerstatus: "cancelled" 
            });
            localStorage.clear();
            window.location.reload();
        } catch (error) {
            alert('ไม่สามารถยกเลิกคิวได้ในขณะนี้');
        }
    }
}