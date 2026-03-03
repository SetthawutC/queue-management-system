let queues = [];

// 1. ดึงข้อมูลคิวจาก API มาแสดงในตาราง
async function loadQueues() {
  try {
    const response = await axios.get("http://localhost:8000/queue");
    queues = response.data;
    displayQueues();
  } catch (error) {
    console.error("Error loading queues:", error);
  }
}

// 2. แสดงคิวในตาราง
function displayQueues() {
  const queueList = document.getElementById("queue-list");
  const noQueueMsg = document.getElementById("no-queue-msg");

  if (!queues || queues.length === 0) {
    queueList.innerHTML = "";
    noQueueMsg.style.display = "block";
    return;
  }
  
  noQueueMsg.style.display = "none";
  queueList.innerHTML = queues
    .map(
      (queue) => `
          <tr class="hover:bg-gray-50">
            <td class="border p-3 text-gray-800 font-bold text-lg">${queue.queue_number}</td>
            <td class="border p-3 text-gray-800">${queue.customer_name || "-"}</td>
            <td class="border p-3 text-gray-800">${queue.customer_count || "-"}</td>
            <td class="border p-3 text-gray-800">${queue.phone || "-"}</td>
            <td class="border p-3">
              <span class="px-3 py-1 rounded text-white ${getStatusColor(queue.customerstatus)}">
                ${getStatusLabel(queue.customerstatus)}
              </span>
            </td>
            <td class="border p-3 text-center space-x-2">
              <button onclick="completeQueue('${queue._id}')" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">
                เสร็จสิ้น
              </button>
              <button onclick="cancelQueue('${queue._id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">
                ยกเลิก
              </button>
            </td>
          </tr>
        `,
    )
    .join("");
}

// 3. ยกเลิกคิว
async function cancelQueue(id) {
  if (!confirm("คุณแน่ใจว่าต้องการลบคิวนี้?")) return;

  try {
    await axios.put(`http://localhost:8000/queue/${id}`, { customerstatus: "cancelled" });
    alert("ลบคิวสำเร็จ");
    loadQueues();
  } catch (error) {
    console.error("Error deleting queue:", error);
    alert("เกิดข้อผิดพลาดในการลบคิว");
  }
}

// 4. ทำให้คิวเสร็จสิ้น (จุดที่มีปัญหา)
async function completeQueue(id) {
  // ค้นหาคิวแรกที่มีสถานะเป็น waiting เพื่อบังคับลำดับ
  // ใช้ตัวแปร 'q' เพื่อไม่ให้ซ้ำกับ 'id' ที่รับเข้ามา
  const firstWaiting = queues.find((q) => q.customerstatus === "waiting");

  // ตรวจสอบว่ามีคิวที่รอก่อนหน้าหรือไม่ (Logic ป้องกันการกดคิวมั่ว)
  if (firstWaiting && firstWaiting._id.toString() !== id.toString()) {
    alert(
      `กรุณาทำรายการตามลำดับ (คิวที่ต้องทำก่อนคือคิวหมายเลข ${firstWaiting.queue_number})`,
    );
    return;
  }

  try {
    await axios.put(`http://localhost:8000/queue/${id}`, {
      customerstatus: "completed",
    });
    alert("คิวเสร็จสิ้น");
    loadQueues();
  } catch (error) {
    console.error("Error completing queue:", error);
    alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
  }
}

// 5. ดึงสีสถานะ (Tailwind CSS)
function getStatusColor(status) {
  const colors = {
    waiting: "bg-yellow-500",
    completed: "bg-green-500",
    cancelled: "bg-red-500",
  };
  return colors[status] || "bg-gray-500";
}

// 6. ดึงชื่อสถานะ
function getStatusLabel(status) {
  const labels = {
    waiting: "รอรับบริการ",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
  };
  return labels[status] || status;
}

// 7. ล้างคิวทั้งหมด
async function clearQueues() {
  if (confirm("คุณแน่ใจที่จะลบคิวทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้")) {
    try {
      await axios.delete("http://localhost:8000/users"); // อ้างอิงตาม API ของคุณ
      alert("ล้างคิวทั้งหมดเรียบร้อย");
      loadQueues();
    } catch (error) {
      console.error("Error clearing queues:", error);
      alert("เกิดข้อผิดพลาดในการล้างคิว");
    }
  }
}

// --- เริ่มการทำงาน ---
loadQueues();

// อัปเดตข้อมูลอัตโนมัติทุก 1 วินาที (Polling)
setInterval(loadQueues, 1000);