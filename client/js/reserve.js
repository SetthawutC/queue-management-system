// Reserve queue function
const submitData = async () => {
    submitBtn = document.getElementById('submit-btn');
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    submitBtn.innerText = "กำลังประมวลผล...";
    try {
        const userData = {
            customer_name: document.querySelector('input[name=customer_name]').value,
            customer_count: document.querySelector('input[name=customer_count]').value,
            phone: document.querySelector('input[name=phone]').value,
            note: document.querySelector('textarea[name=note]').value
        };
        const response = await axios.post("http://localhost:8000/queue", userData);
        if (response.status === 200 || response.status === 201) {
            const result = response.data;
            // save data to localStorage
            localStorage.setItem('my_queue', result.queue_number); // เลข Global (1, 2, 3)
            localStorage.setItem('my_queue_count', result.customer_count);
            localStorage.setItem('my_queue_id', result._id);

            //Label
            let finalLabel = result.label;
            
            // if no label, generate one based on count and category_seq or queue_number
            if (!finalLabel) {
                const countNum = Number(result.customer_count) || 0;
                let prefix = (countNum <= 2) ? 'A' : (countNum <= 6 ? 'B' : 'C');
                finalLabel = `${prefix}${String(result.category_seq || result.queue_number).padStart(2, '0')}`;
            }
            localStorage.setItem('my_queue_label', finalLabel);
            alert(`จองคิวสำเร็จ! คุณได้คิวที่: ${finalLabel}`);
            window.location.href = 'index.html';
        }
    } catch (error) {
        submitBtn.disabled = false;
        submitBtn.innerText = "ยืนยันจองคิว";
        console.error('Error:', error);
        alert("จองคิวไม่สำเร็จ กรุณากรอกข้อมูลให้ครบถ้วน");
    }
}

//Check if user has a queue and show/hide buttons 
function checkMyQueue() {
    const myQueueId = localStorage.getItem('my_queue_id');
    const cancelBtn = document.getElementById('cancel-queue-btn');
    const reserveLink = document.getElementById('reserve-link');

    if (myQueueId) {
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (reserveLink) reserveLink.classList.add('hidden');
    } else {
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (reserveLink) reserveLink.classList.remove('hidden');
    }
}

// Cancel my queue function for User
async function cancelMyQueue() {
    const id = localStorage.getItem('my_queue_id');
    if (!id) {
        localStorage.clear();
        return;
    }
    if (confirm('คุณต้องการยกเลิกคิวใช่หรือไม่?')) {
        try {
            await axios.put(`http://localhost:8000/queue/${id}`, { 
                customerstatus: "cancelled" 
            });
            alert('ยกเลิกคิวเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error:', error);
            console.log('คิวอาจจะถูกลบไปก่อนหน้านี้แล้ว กำลังล้างข้อมูลในเครื่อง...');
        } finally {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    }
}
//set button visibility
document.addEventListener('DOMContentLoaded', checkMyQueue);