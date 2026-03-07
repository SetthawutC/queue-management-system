module.exports = {
  apps: [{
    name: "backup-server",
    script: "./index.js", 
    instances: "max",     // สร้าง instance ตามจำนวน CPU core
    exec_mode: "cluster", // โหมด Cluster จำเป็นสำหรับ load balancing ในเครื่องเดียว
    watch: true,         // ตั้งเป็น true ถ้าต้องการให้ restart เมื่อแก้โค้ด
    max_memory_restart: '1G',
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }]
};