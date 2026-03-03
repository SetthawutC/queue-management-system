const submitData = async () => {
    try {
        const userData = {
            customer_name: document.querySelector('input[name=customer_name]').value,
            customer_count: document.querySelector('input[name=customer_count]').value,
            phone: document.querySelector('input[name=phone]').value,
            note: document.querySelector('textarea[name=note]').value
        };

        // ส่งข้อมูลไปให้ Server 
        const response = await axios.post("http://localhost:8000/queue", userData);

        if (response.status === 200 || response.status === 201) {
            const result = response.data;

            // 1. เก็บข้อมูลหลักลง localStorage
            localStorage.setItem('my_queue', result.queue_number); // เลข Global (1, 2, 3)
            localStorage.setItem('my_queue_count', result.customer_count);
            localStorage.setItem('my_queue_id', result._id);

            // 2. จัดการเรื่อง Label (A01, B01)
            let finalLabel = result.label;
            
            // ถ้า Server ไม่ส่ง label มา (Fallback)
            if (!finalLabel) {
                const countNum = Number(result.customer_count) || 0;
                let prefix = (countNum <= 2) ? 'A' : (countNum <= 6 ? 'B' : 'C');
                // ใช้ค่าจากหมวดหมู่ + เลขลำดับที่ส่งกลับมา
                finalLabel = `${prefix}${String(result.category_seq || result.queue_number).padStart(2, '0')}`;
            }
            
            localStorage.setItem('my_queue_label', finalLabel);

            alert(`จองคิวสำเร็จ! คุณได้คิวที่: ${finalLabel}`);
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error:', error);
        alert("จองคิวไม่สำเร็จ กรุณากรอกข้อมูลให้ครบถ้วน");
    }
}

// ตรวจสอบว่ามีคิวหรือไม่ (ใช้จัดการปุ่มในหน้า index)
function checkMyQueue() {
    const myQueueId = localStorage.getItem('my_queue_id');
    const cancelBtn = document.getElementById('cancel-queue-btn'); // แก้ ID ให้ตรงกับหน้า Index
    const reserveLink = document.getElementById('reserve-link');

    if (myQueueId) {
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (reserveLink) reserveLink.classList.add('hidden');
    } else {
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (reserveLink) reserveLink.classList.remove('hidden');
    }
}

// ฟังก์ชันยกเลิกคิว (User Cancel)
async function cancelMyQueue() {
    const id = localStorage.getItem('my_queue_id');
    if (!id) return;
    
    if (confirm('คุณต้องการยกเลิกคิวใช่หรือไม่?')) {
        try {
            // ** สำคัญ **: ต้องส่ง "customerstatus" ให้ตรงกับที่ Server ใช้เช็คใน renderQueueUI
            await axios.put(`http://localhost:8000/queue/${id}`, { 
                customerstatus: "cancelled" 
            });

            alert('ยกเลิกคิวเรียบร้อยแล้ว');
            
            // ล้างค่าในเครื่องลูกค้า
            localStorage.removeItem('my_queue');
            localStorage.removeItem('my_queue_id');
            localStorage.removeItem('my_queue_label');
            localStorage.removeItem('my_queue_count');

            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error:', error);
            alert('เกิดข้อผิดพลาดในการยกเลิกคิว');
        }
    }
}

// เรียกใช้เมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', checkMyQueue);