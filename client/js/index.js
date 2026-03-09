function getCategory(count) {
  const n = Number(count) || 0;
  if (n <= 2) return "A";
  if (n <= 6) return "B";
  return "C";
}

function formatTicket(prefix, data) {
  if (data == null || data === undefined) return `${prefix}--`;
  if (typeof data === "string" && data.startsWith(prefix)) return data;
  return `${prefix}${String(data).padStart(2, "0")}`;
}

// Render UI ทั้งหมด
function renderQueueUI(queues) {
  if (!queues || !Array.isArray(queues)) return;

  //Now serving left side
  const prefixes = ["A", "B", "C"];
  const categoryMap = {};

  prefixes.forEach((p) => {
   
    let found = queues.find(
      (q) =>
        q.customerstatus === "calling" &&
        (q.category === p || getCategory(q.customer_count) === p),
    );

   
    if (!found) {
      const finishedQueues = queues.filter(
        (q) =>
          q.customerstatus === "completed" &&
          (q.category === p || getCategory(q.customer_count) === p),
      );

      if (finishedQueues.length > 0) {
        finishedQueues.sort((a, b) => b.queue_number - a.queue_number);
        found = finishedQueues[0];
      }
    }

    categoryMap[p] = found ? found.label || found.category_seq : null;
  });
  const currentElem = document.getElementById("current-queue");
  if (currentElem) {
    currentElem.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-6">
            ${prefixes
              .map(
                (p) => `
                <div class="text-center">
                    <div class="text-[100px] md:text-[120px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-blue-400">
                        ${formatTicket(p, categoryMap[p])}
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>`;
  }

  // My queue
  const myQueueRaw = localStorage.getItem("my_queue");
  const myQueueLabel = localStorage.getItem("my_queue_label");
  const section = document.getElementById("my-queue-section");
  const reserveLink = document.getElementById("reserve-link");
  const reserveCancelBtn = document.getElementById("reserve-cancel-btn");
  const remainingElem = document.getElementById("remaining-queue");
  const remainingText = document.getElementById("remaining-queue-text");
  const myTicketInfo = document.getElementById("my-ticket-info");
  const button = document.getElementById("reserve-area");

  if (myQueueRaw) {
    if (button) button.classList.add("hidden");
    if (section) section.classList.remove("hidden");
    const myQueueNum = parseInt(myQueueRaw);
   
    const myInfo = queues.find((q) => q.queue_number === myQueueNum);
    console.log("myQueueNum:", myQueueNum, "myInfo:", myInfo);

 
    if (!myInfo || myInfo.customerstatus !== "waiting") {
      const notificationSound = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
      );
      notificationSound
        .play()
        .catch((error) => console.log("Audio play failed:", error));

      //  แสดงข้อความบนหน้าจอ
      remainingElem.textContent = "ถึงคิวของคุณแล้ว!";
      remainingElem.className =
        "text-[54px] md:text-[72px] leading-tight font-black text-center text-green-600 drop-shadow-sm px-4";

      // แสดง Alert แจ้งเตือน 
      setTimeout(() => {
        alert("🔔 ถึงคิวของคุณแล้ว!");
      }, 500);

      if (remainingText) remainingText.classList.add("hidden");

      // --- เก็บ localStorage ไว้เพื่อให้แสดงบัตรคิว ---
      localStorage.removeItem("my_queue");
      localStorage.removeItem("my_queue_label");
      
      button.classList.remove("hidden");

      // แสดง my-ticket-info เพื่อให้เห็นบัตรคิวตัวเอง
      if (myTicketInfo) {
        myTicketInfo.classList.remove("hidden");
        document.getElementById("my-queue-number").textContent =
          myQueueLabel || "---";
      }

      if (reserveCancelBtn) reserveCancelBtn.classList.add("hidden");
      if (reserveLink) reserveLink.classList.remove("hidden");
    } else {
      const waitingBeforeMe = queues.filter(
        (q) => q.customerstatus === "waiting" && q.queue_number < myQueueNum,
      ).length;

      // show cancel button while waiting
      if (reserveCancelBtn) reserveCancelBtn.classList.remove("hidden");
      if (reserveLink) reserveLink.classList.add("hidden");

      if (waitingBeforeMe === 0) {

        // CASE ใกล้ถึงคิวแล้ว 
        remainingElem.textContent = "ใกล้ถึงคิวของคุณแล้ว";
        remainingElem.className =
          "text-[45px] font-black text-center leading-tight text-orange-500 animate-pulse px-4";

        if (remainingText) {
          remainingText.classList.remove("hidden");
          remainingText.textContent = "กรุณาเตรียมตัวหน้าเคาน์เตอร์";
        }
      } else {
        // CASE ยังมีคนรออีกหลายคิว 
        remainingElem.textContent = waitingBeforeMe.toString().padStart(2, "0");
        remainingElem.className =
          "text-[100px] md:text-[100px] font-black text-slate-900 opacity-100 drop-shadow-md";

        if (remainingText) {
          remainingText.classList.remove("hidden");
          remainingText.textContent = "คิวก่อนหน้าคุณ";
        }
      }
      // แสดงเลขบัตรคิวตัวเองกำกับไว้ด้านล่างเสมอถ้ายังไม่ถึงคิว
      if (myTicketInfo) {
        myTicketInfo.classList.remove("hidden");
        document.getElementById("my-queue-number").textContent =
          myQueueLabel || "---";
      }
    }
  } else {
    //กรณี ยังไม่ได้จอง 
    const totalWaiting = queues.filter(
      (q) => q.customerstatus === "waiting",
    ).length;

    // only offer reservation when there are people waiting
    if (reserveLink) {
      if (totalWaiting > 0) reserveLink.classList.remove("hidden");
      else reserveLink.classList.add("hidden");
    }
    if (reserveCancelBtn) reserveCancelBtn.classList.add("hidden");
    if (myTicketInfo) myTicketInfo.classList.add("hidden");

    remainingElem.textContent = totalWaiting.toString().padStart(2, "0");
    remainingElem.className =
      "text-[120px] md:text-[150px]  text-slate-900 opacity-100 drop-shadow-md";

    if (remainingText) {
      remainingText.classList.remove("hidden");
      remainingText.textContent = "คิวรอทั้งหมดในขณะนี้";
    }
  }
}

//ส่วนของ SSE 
let queueEventSource = null;
function initQueueSSE() {
  //Check and close existing connection
  if (queueEventSource) {
    queueEventSource.close();
  }
  //Create new EventSource connection
  queueEventSource = new EventSource("http://localhost:8000/queue-updates");
  
  //Success Message
  queueEventSource.onopen = () => {
    console.log("SSE Connected");
  };
  //Message Received
  queueEventSource.onmessage = (event) => {
    try {
        queues= JSON.parse(event.data);
        console.log("Real-time Updated");
        renderQueueUI(queues); 

    } catch (err) {
      console.error("SSE Parse Error:", err);
    }
  };

  //Failed Connection or Lost Connection 
  queueEventSource.onerror = (err) => {
    console.warn("SSE Connection lost. Attempting to reconnect...", err);
    queueEventSource.close(); 
    
    //delay before reconnecting
    setTimeout(() => {
      initQueueSSE(); 
    }, 3000); 
  };
}

//Initial Load - get current queue data once when page loads
async function initialFetch() {
  try {
    const response = await axios.get("http://localhost:8000/queue");
    renderQueueUI(response.data);
  } catch (error) {
    console.error("Initial fetch failed:", error);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  initialFetch();
  initQueueSSE();
});

//User cancel queue function
async function cancelMyQueue() {
  const id = localStorage.getItem("my_queue_id");
  if (!id) return;
  if (confirm("คุณต้องการยกเลิกการจองคิวนี้ใช่หรือไม่?")) {
    try {
      await axios.put(`http://localhost:8000/queue/${id}`, {
        customerstatus: "cancelled",
      });
      localStorage.clear();
      window.location.reload();
    } catch (error) {
      alert("ไม่สามารถยกเลิกคิวได้");
    }
  }
}
