const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')

app.use(cors())
app.use(bodyParser.json())

//จำลองข้อมูล
let bookings = [
  {"id": 1, "customerstatus": "completed", "customer_name": "สมชาย ใจดี", "phone": "0812345678", "note": "ขอโต๊ะริมหน้าต่าง", "customer_count": "4", "queue_number": 1},
  {"id": 2, "customerstatus": "cancelled", "customer_name": "มานะ มุ่งมั่น", "phone": "0823456789", "note": "", "customer_count": "2", "queue_number": 2},
  {"id": 3, "customerstatus": "waiting", "customer_name": "ปิติ ยินดี", "phone": "0834567890", "note": "มีเด็กเล็ก", "customer_count": "3", "queue_number": 3},
  {"id": 4, "customerstatus": "waiting", "customer_name": "วีระ กล้าหาญ", "phone": "0845678901", "note": "", "customer_count": "5", "queue_number": 4},
  {"id": 5, "customerstatus": "waiting", "customer_name": "ดวงพร สดใส", "phone": "0856789012", "note": "ฉลองวันเกิด", "customer_count": "6", "queue_number": 5},
  {"id": 6, "customerstatus": "waiting", "customer_name": "ชูใจ ร่าเริง", "phone": "0867890123", "note": "", "customer_count": "2", "queue_number": 6},
  {"id": 7, "customerstatus": "waiting", "customer_name": "อนันดา เอื้อเฟื้อ", "phone": "0878901234", "note": "แพ้อาหารทะเล", "customer_count": "4", "queue_number": 7},
  {"id": 8, "customerstatus": "waiting", "customer_name": "จันจิรา ยิ้มหวาน", "phone": "0889012345", "note": "", "customer_count": "1", "queue_number": 8},
  {"id": 9, "customerstatus": "waiting", "customer_name": "กมล คนเก่ง", "phone": "0890123456", "note": "ขอเก้าอี้เสริม", "customer_count": "3", "queue_number": 9},
  {"id": 10, "customerstatus": "waiting", "customer_name": "นภา ท้องฟ้า", "phone": "0801234567", "note": "", "customer_count": "2", "queue_number": 10}
]
let lastId = bookings.length > 0 ? Math.max(...bookings.map(b => b.id)) : 0

//หน้าแรก
app.get('/', (req, res) => {
  res.send('<h1>Server is running!</h1>')
})


//API
app.get('/users', async (req, res) => {
  try {
    res.json(bookings)
  } catch (error) {
    console.error('Error fetching users:', error.message)
    res.status(500).json({ error: 'Error fetching users' })
  }
})


//ข้อมูลของ id
app.get('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const user = bookings.find(u => u.id === id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(user)
  } catch (error) {
    console.error('Error fetching user:', error.message)
    res.status(500).json({ error: 'Error fetching user' })
  }
})


//เพิ่มข้อมูลคิว
app.post('/users', async (req, res) => {
  try{ 
    let user = req.body
    
    const newUser = {
      id: ++lastId,
      customerstatus: 'waiting',
      ...user
    }
    bookings.push(newUser)
    
    console.log("results:", newUser)
    res.json({
      message: 'User added successfully',
      data  : newUser
    }  ) 
  } catch (error) {
    console.error('Error adding user:', error.message)
    res.status(500).json({ error: 'Error adding user' })
  }
})


//ล้างข้อมูล
app.delete('/users', async (req, res) => {
  try {
    bookings = []
    res.json({ message: 'All users deleted successfully' })
  } catch (error) {
    console.error('Error deleting all users:', error.message)
    res.status(500).json({ error: 'Error deleting all users' })
  }
  })


//แก้ข้อมูล status
app.put('/users/:id', async (req, res) => {
    const id = parseInt(req.params.id)
    try {
        const user = bookings.find(u => u.id === id)
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }
        if (req.body.status) {
            user.customerstatus = req.body.status
        }
        res.json({ message: 'User updated successfully', data: user })
    } catch (error) {
        console.error('Error updating user:', error.message)
        res.status(500).json({ error: 'Error updating user' })
    }
})




app.listen(8000, async () => {
  console.log('Server started on port http://localhost:8000')
})
