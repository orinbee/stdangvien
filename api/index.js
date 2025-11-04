// server.js (Đã điều chỉnh cho Vercel/Serverless và Cloudinary)

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2; // Import Cloudinary

const app = express();
// Cổng cho Vercel/Serverless sẽ được tự động thiết lập, nhưng ta vẫn giữ để chạy local
const PORT = process.env.PORT || 3000; 

// Cấu hình Cloudinary từ biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true
});

// Cấu hình CORS và Middlewares
app.use(cors());
app.use(express.json());
// Bỏ dòng `app.use(express.static(...))` vì Vercel sẽ xử lý Frontend.

// Multer sử dụng bộ nhớ tạm (memory storage) để Cloudinary có thể đọc trực tiếp
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Middleware kiểm tra Admin (Vẫn dùng Header cho đơn giản) ---
const adminAuth = (req, res, next) => {
  if (req.headers['x-auth-token'] === 'admin_token') {
    next();
  } else {
    res.status(401).json({ message: 'Lỗi: Không có quyền Admin.' });
  }
};

// --- API Đăng nhập (Authentication) ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin') {
    return res.json({ success: true, token: 'admin_token', role: 'admin' });
  }
  res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu.' });
});

// --- API Lấy danh sách video (Lấy từ Cloudinary) ---
app.get('/api/videos', async (req, res) => {
  try {
    // Gọi Cloudinary để lấy danh sách tài nguyên video (type: upload, resource_type: video)
    const result = await cloudinary.search
        .expression('resource_type:video')
        .max_results(50)
        .execute();
    
    // Xử lý kết quả để trả về danh sách dễ dùng
    const videoList = result.resources.map(resource => ({
        name: resource.public_id.split('/').pop() + '.' + resource.format, // Tạo tên file
        url: resource.secure_url // URL HTTPS an toàn
    }));

    res.json(videoList);
  } catch (error) {
    console.error('Lỗi Cloudinary:', error);
    res.status(500).json({ message: 'Không thể tải danh sách video từ Cloudinary.' });
  }
});

// --- API Upload video (Chỉ Admin) ---
app.post('/api/upload', adminAuth, upload.single('videoFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Không tìm thấy file video.' });
  }

  try {
    // Chuyển buffer của file sang Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: "video", // Đặt loại tài nguyên là video
      folder: "video-manager" // Tạo một thư mục trên Cloudinary
    });

    res.json({ 
        success: true, 
        message: 'Video đã được tải lên thành công.', 
        filename: result.public_id,
        url: result.secure_url 
    });
  } catch (error) {
    console.error('Lỗi Upload Cloudinary:', error);
    res.status(500).json({ success: false, message: 'Tải lên Cloudinary thất bại.' });
  }
});

// --- Export app cho Serverless Vercel ---
// Vercel cần file 'api/index.js' để làm Serverless Function
// Chúng ta sẽ tạo file đó và export app
module.exports = app;