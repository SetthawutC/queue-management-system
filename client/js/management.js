let queues = [];

// --- 1. ส่วนของ SSE (แทนที่ Polling เดิม) ---
function initManagementSSE() {
    const eventSource = new EventSource("http://localhost:8000/queue-updates");

    eventSource.onmessage = (event) => {
        try {
            queues = JSON.parse(event.data);
            console.log("Real-time Update:", queues);
            displayQueues();
        } catch (err) {
            console.error("Error parsing SSE data:", err);
        }
    };

    eventSource.onerror = () => {
        console.error("SSE Connection failed. Reconnecting...");
        // EventSource จะจัดการ reconnect อัตโนมัติ
    };
}

// --- 2. ดึงข้อมูลครั้งแรก (Initial Load) ---
async function loadQueues() {
    try {
        const response = await axios.get("http://localhost:8000/queue");
        queues = response.data;
        displayQueues();
    } catch (error) {
        console.error("Error loading queues:", error);
    }
}

// --- 3. แสดงคิวในตาราง (รองรับ Label A01, B01) ---
function displayQueues() {
    const queueList = document.getElementById("queue-list");
    const noQueueMsg = document.getElementById("no-queue-msg");

    if (!queues || queues.length === 0) {
        queueList.innerHTML = "";
        if (noQueueMsg) noQueueMsg.style.display = "block";
        return;
    }
    
    if (noQueueMsg) noQueueMsg.style.display = "none";
    
    // เรียงตาม queue_number (Global) เพื่อให้คนจองก่อนอยู่บนสุด
    const sortedQueues = [...queues].sort((a, b) => a.queue_number - b.queue_number);

    queueList.innerHTML = sortedQueues
        .map((queue) => `
            <tr class="hover:bg-gray-50 border-b">
                <td class="p-3 text-blue-600 font-black text-xl">${queue.label || queue.queue_number}</td>
                <td class="p-3 text-gray-800">${queue.customer_name || "-"}</td>
                <td class="p-3 text-gray-800 text-center">${queue.customer_count || "-"}</td>
                <td class="p-3 text-gray-800">${queue.phone || "-"}</td>
                <td class="p-3">
                    <span class="px-3 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(queue.customerstatus)}">
                        ${getStatusLabel(queue.customerstatus)}
                    </span>
                </td>
                <td class="p-3 text-center space-x-2">
                    ${queue.customerstatus === 'waiting' ? `
                        <button onclick="completeQueue('${queue._id}')" class="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded shadow-sm transition">
                            เรียกลูกค้า
                        </button>
                    ` : ''}
                    <button onclick="cancelQueue('${queue._id}')" class="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 rounded transition text-sm">
                        ลบ
                    </button>
                </td>
            </tr>
        `).join("");
}

// --- 4. จัดการสถานะคิว (Complete/Call) ---
async function completeQueue(id) {
    // หาคิวที่รอก่อนหน้าทั้งหมด (Global)
    const myQueue = queues.find(q => q._id === id);
    if (!myQueue) return;

    // Logic บังคับลำดับ: เช็คว่ามีใครเลข Global น้อยกว่าเราแล้วยัง 'waiting' ไหม
    const waitingsBefore = queues.filter(q => 
        q.customerstatus === "waiting" && q.queue_number < myQueue.queue_number
    );

    if (waitingsBefore.length > 0) {
        const firstOne = waitingsBefore[0];
        alert(`กรุณาเรียกตามลำดับ! คิวที่ต้องเรียกก่อนคือ: ${firstOne.label || firstOne.queue_number}`);
        return;
    }

    try {
        // เมื่อกดเรียก ให้เปลี่ยนสถานะ (Server จะส่ง SSE ไปบอกทุกคนเอง)
        await axios.put(`http://localhost:8000/queue/${id}`, { 
            customerstatus: "completed" 
        });
        // ไม่ต้องสั่ง loadQueues() ซ้ำ เพราะ SSE จะดันข้อมูลใหม่มาให้เอง
    } catch (error) {
        console.error("Update error:", error);
    }
}

// --- 5. ยกเลิกคิว ---
async function cancelQueue(id) {
    if (!confirm("ต้องการยกเลิกหรือลบคิวนี้ใช่หรือไม่?")) return;
    try {
        await axios.put(`http://localhost:8000/queue/${id}`, { 
            customerstatus: "cancelled" 
        });
    } catch (error) {
        console.error("Cancel error:", error);
    }
}

// --- Helper Functions ---
function getStatusColor(status) {
    const colors = { waiting: "bg-yellow-500", completed: "bg-green-500", cancelled: "bg-red-500" };
    return colors[status] || "bg-gray-400";
}

function getStatusLabel(status) {
    const labels = { waiting: "รอเรียก", completed: "เสร็จสิ้น/รับบริการ", cancelled: "ยกเลิก" };
    return labels[status] || status;
}

// --- เริ่มการทำงาน ---
document.addEventListener('DOMContentLoaded', () => {
    loadQueues();      // โหลดครั้งแรก
    initManagementSSE(); // เปิดท่อรับข้อมูล Real-time
});