async function fetchQueueData() {
  if (window.stopQueuePolling) return;

  try {
    const response = await axios.get("http://localhost:8000/queue");
    const queues = response.data;

    // --- Helper Functions ---
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

    // --- จัดการข้อมูลคิวปัจจุบัน (Now Serving) ---
    const prefixes = ['A', 'B', 'C'];
    const categoryMap = {};

    prefixes.forEach(p => {
      // หาคิวที่กำลังรอ (waiting) ตัวแรกในแต่ละหมวด
      const found = queues.find(q => {
        if (q.customerstatus !== 'waiting') return false;
        const cat = q.category || getCategory(q.customer_count);
        return cat === p;
      });
      
      // แก้ปัญหา undefined: ถ้ามี label ให้ใช้เลย ถ้าไม่มีให้ format เองจากเลขคิว
      if (found) {
        categoryMap[p] = found.label || formatTicket(p, found.queue_number);
      } else {
        categoryMap[p] = `${p}00`;
      }
    });

    // แสดงผลหน้าจอคอลัมน์ A, B, C
    const currentElem = document.getElementById("current-queue");
    if (currentElem) {
      currentElem.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-6">
          ${prefixes.map(p => `
            <div class="text-center">
              <div class="text-[56px] md:text-[80px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-blue-400">
                ${categoryMap[p]}
              </div>
            </div>
          `).join('')}
        </div>`;
    }

    // --- ส่วนของ "คิวของฉัน" ---
    const myQueueRaw = localStorage.getItem("my_queue");
    const myQueueLabel = localStorage.getItem("my_queue_label");

    if (myQueueRaw) {
      const myQueueNum = parseInt(myQueueRaw);
      let myCount = localStorage.getItem('my_queue_count');
      
      // ค้นหาข้อมูลตัวเองในลิสต์ที่ดึงมา
      const myInfo = queues.find(q => q.queue_number == myQueueNum);
      if (!myCount && myInfo) myCount = myInfo.customer_count;

      const section = document.getElementById("my-queue-section");
      if (section) {
        section.classList.remove("hidden");
        section.style.display = "block";
      }

      // สลับปุ่ม จอง/ยกเลิก
      const reserveLink = document.getElementById('reserve-link');
      const reserveCancelBtn = document.getElementById('reserve-cancel-btn');
      if (reserveLink) reserveLink.classList.add('hidden');
      if (reserveCancelBtn) reserveCancelBtn.classList.remove('hidden');

      // แสดงเลขคิวตัวเอง (A01, B02...)
      const myCat = getCategory(myCount);
      document.getElementById("my-queue-number").textContent = myQueueLabel || formatTicket(myCat, myQueueNum);

      // --- คำนวณคิวที่เหลือ (นับจำนวนคนในหมวดเดียวกันที่รอก่อนหน้าเรา) ---
      const waitingBeforeMe = queues.filter(q => {
          const cat = q.category || getCategory(q.customer_count);
          return q.customerstatus === 'waiting' && 
                 cat === myCat && 
                 q.queue_number < myQueueNum;
      }).length;

      const remainingElem = document.getElementById("remaining-queue");
      const remainingText = document.getElementById("remaining-queue-text");

      // ตรวจสอบว่าถึงคิวหรือยัง (ถ้าสถานะไม่ใช่ waiting หรือไม่มีคนรอก่อนหน้าแล้ว)
      if (myInfo && myInfo.customerstatus !== 'waiting') {
        remainingElem.textContent = "ถึงคิวของคุณแล้ว!";
        remainingElem.className = "text-[50px] md:text-[70px] font-bold text-green-500 text-center";
        if (remainingText) remainingText.classList.add("hidden");
        
        // หยุดดึงข้อมูลชั่วคราว และล้างค่า (ตาม Logic เดิมของคุณ)
        window.stopQueuePolling = true;
        localStorage.removeItem("my_queue");
        localStorage.removeItem("my_queue_id");
        localStorage.removeItem("my_queue_label");

        if (reserveLink) reserveLink.classList.remove('hidden');
        if (reserveCancelBtn) reserveCancelBtn.classList.add('hidden');
      } else {
        remainingElem.textContent = waitingBeforeMe.toString().padStart(2, "0");
        remainingElem.classList.remove("text-green-500");
        if (remainingText) remainingText.classList.remove("hidden");
      }
    } else {
      // กรณีไม่มีคิวในเครื่อง
      const section = document.getElementById("my-queue-section");
      if (section) section.classList.add("hidden");
      const reserveLink = document.getElementById('reserve-link');
      const reserveCancelBtn = document.getElementById('reserve-cancel-btn');
      if (reserveLink) reserveLink.classList.remove('hidden');
      if (reserveCancelBtn) reserveCancelBtn.classList.add('hidden');
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

//setInterval(fetchQueueData, 2000);