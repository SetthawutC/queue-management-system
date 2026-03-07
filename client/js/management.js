let queues = [];
let currentSearchTerm = ""; // ตัวแปรเก็บคำค้นหา

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

// --- 3. แสดงคิวในตาราง
function displayQueues() {
  const queueList = document.getElementById("queue-list");
  const noQueueMsg = document.getElementById("no-queue-msg");

  if (!queues || queues.length === 0) {
    queueList.innerHTML = "";
    if (noQueueMsg) noQueueMsg.style.display = "block";
    return;
  }

  if (noQueueMsg) noQueueMsg.style.display = "none";

  // กรองข้อมูลตามคำค้นหา (Search Filter)
  const filteredQueues = queues.filter((queue) => {
    const term = currentSearchTerm.toLowerCase();
    const name = (queue.customer_name || "").toLowerCase();
    const label = (queue.label || queue.queue_number || "").toString().toLowerCase();
    const phone = (queue.phone || "").toString().toLowerCase();
    return name.includes(term) || label.includes(term) || phone.includes(term);
  });

  const sortedQueues = [...filteredQueues].sort(
    (a, b) => a.queue_number - b.queue_number,
  );

  queueList.innerHTML = sortedQueues
    .map(
      (queue) => `
            <tr class="hover:bg-gray-50 border-b">
                <td class="p-3 text-blue-600 font-black text-xl">${queue.label || queue.queue_number}</td>
                <td class="p-3 text-gray-800">${queue.customer_name || "-"}</td>
                <td class="p-3 text-gray-800 text-center">${queue.customer_count || "-"}</td>
                <td class="p-3 text-gray-800">${queue.phone || "-"}</td>
                <td class="p-3 text-center">
                  <span class="inline-flex items-center justify-center px-4 py-1 rounded-full text-sm font-semibold text-white shadow-sm ${getStatusColor(queue.customerstatus)}">
            <span class="h-2 w-2 rounded-full mr-2 bg-white/50"></span> 
            
            <span>${getStatusLabel(queue.customerstatus)}</span>
        </span>
                </td>
                <td class="p-3 text-center space-x-2">
                    ${
                      queue.customerstatus === "waiting"
                        ? `
                        <button onclick="completeQueue('${queue._id}')" class="inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow transition duration-150 w-28">
                            เรียกลูกค้า
                        </button>
                    `
                        : ""
                    }
                    <button onclick="cancelQueue('${queue._id}')" class="inline-flex items-center justify-center bg-red-500 hover:bg-red-600 text-white px-4 py-2  rounded-lg shadow transition duration-150 w-28">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        ลบ
                    </button>
                </td>
            </tr>
        `,
    )
    .join("");
}

// --- 4. จัดการสถานะคิว (Complete/Call) ---
async function completeQueue(id) {
  // หาคิวที่รอก่อนหน้าทั้งหมด (Global)
  const myQueue = queues.find((q) => q._id === id);
  if (!myQueue) return;

  // Helper: ระบุ Catalog จากตัวอักษรแรกของ Label (เช่น A001 -> A)
  const getCatalog = (q) => (q.label ? q.label.charAt(0).toUpperCase() : "OTHER");
  const myCatalog = getCatalog(myQueue);

  // Logic บังคับลำดับ: เช็คว่ามีใครมาก่อนเราแล้วยัง 'waiting' **เฉพาะใน Catalog เดียวกัน** ไหม
  const waitingsBefore = queues.filter(
    (q) =>
      q.customerstatus === "waiting" && 
      q.queue_number < myQueue.queue_number &&
      getCatalog(q) === myCatalog,
  );

  if (waitingsBefore.length > 0) {
    const firstOne = waitingsBefore[0];
    alert(
      `กรุณาเรียกตามลำดับ! คิวที่ต้องเรียกก่อนคือ: ${firstOne.label || firstOne.queue_number}`,
    );
    return;
  }

  try {
    // เมื่อกดเรียก ให้เปลี่ยนสถานะ (Server จะส่ง SSE ไปบอกทุกคนเอง)
    await axios.put(`http://localhost:8000/queue/${id}`, {
      customerstatus: "completed",
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
      customerstatus: "cancelled",
    });
  } catch (error) {
    console.error("Cancel error:", error);
  }
}

async function clearQueues() {
  if (!confirm("ต้องการล้างคิวทั้งหมดใช่หรือไม่?")) return;
  try {
    await axios.delete(`http://localhost:8000/queue`);
    loadQueues(); // โหลดข้อมูลใหม่หลังจากล้างคิว
  } catch (error) {
    console.error("Clear queues error:", error);
  }
}

// --- Helper Functions ---
function getStatusColor(status) {
  const colors = {
    waiting: "bg-yellow-500",
    completed: "bg-green-500",
    cancelled: "bg-red-500",
  };
  return colors[status] || "bg-gray-400";
}

function getStatusLabel(status) {
  const labels = {
    waiting: "รอเรียก",
    completed: "เสร็จสิ้น/รับบริการ",
    cancelled: "ยกเลิก",
  };
  return labels[status] || status;
}

// --- เริ่มการทำงาน ---
document.addEventListener("DOMContentLoaded", () => {
  loadQueues(); // โหลดครั้งแรก
  initManagementSSE(); // เปิดท่อรับข้อมูล Real-time

  // Event Listener สำหรับช่องค้นหา
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchTerm = e.target.value.trim();
      displayQueues(); // อัปเดตตารางทันทีที่พิมพ์
    });
  }
});