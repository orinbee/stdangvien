// client/script.js

const API_BASE_URL = '/api'; 

// --- Khai báo DOM Elements ---
const videoListEl = document.getElementById('video-list');
const videoPlayer = document.getElementById('video-player');
const currentVideoTitle = document.getElementById('current-video-title');
const uploadBtn = document.getElementById('upload-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// Modal Elements
const loginModal = document.getElementById('login-modal');
const uploadModal = document.getElementById('upload-modal');
const loginForm = document.getElementById('login-form');
const uploadForm = document.getElementById('upload-form');
const searchInput = document.getElementById('search-input');
const loginMessage = document.getElementById('login-message');
const uploadMessage = document.getElementById('upload-message');

let currentToken = localStorage.getItem('authToken') || null;
let currentRole = localStorage.getItem('authRole') || null;
let allVideos = []; // Lưu trữ danh sách video gốc

// --- 1. Quản lý trạng thái người dùng và giao diện ---
const updateUIForUser = () => {
    if (currentRole === 'admin') {
        uploadBtn.style.display = 'inline-block';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
    } else {
        uploadBtn.style.display = 'none';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
    }
};

// --- 2. Xử lý logic Đăng nhập/Đăng xuất ---
loginBtn.onclick = () => loginModal.style.display = 'block';

logoutBtn.onclick = () => {
    currentToken = null;
    currentRole = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('authRole');
    updateUIForUser();
    alert('Đã đăng xuất.');
};

loginForm.onsubmit = async (e) => {
    e.preventDefault();
    loginMessage.textContent = '';
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.success) {
            currentToken = data.token;
            currentRole = data.role;
            localStorage.setItem('authToken', currentToken);
            localStorage.setItem('authRole', currentRole);
            loginModal.style.display = 'none';
            loginForm.reset();
            updateUIForUser();
            alert('Đăng nhập Admin thành công!');
        } else {
            loginMessage.textContent = data.message || 'Đăng nhập thất bại.';
        }
    } catch (error) {
        loginMessage.textContent = 'Lỗi kết nối Server.';
        console.error('Login error:', error);
    }
};

// --- 3. Xử lý Upload Video (Chỉ Admin) ---
uploadBtn.onclick = () => {
    if (currentRole === 'admin') {
        uploadModal.style.display = 'block';
        uploadMessage.textContent = '';
    } else {
        alert('Bạn cần đăng nhập với quyền Admin để thực hiện chức năng này.');
        loginModal.style.display = 'block';
    }
};

uploadForm.onsubmit = async (e) => {
    e.preventDefault();
    uploadMessage.textContent = 'Đang tải lên...';
    
    const formData = new FormData();
    const videoFile = e.target.elements['video-file'].files[0];
    formData.append('videoFile', videoFile);

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: { 'x-auth-token': currentToken }, // Gửi token xác thực
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            uploadMessage.textContent = data.message;
            uploadForm.reset();
            // Tải lại danh sách video sau khi upload thành công
            await fetchVideoList(); 
        } else {
            uploadMessage.textContent = data.message || 'Tải lên thất bại.';
        }
    } catch (error) {
        uploadMessage.textContent = 'Lỗi kết nối Server khi tải lên.';
        console.error('Upload error:', error);
    }
};

// --- 4. Chức năng chính: Tải và hiển thị danh sách video ---
const renderVideoList = (videos) => {
    videoListEl.innerHTML = '';
    if (videos.length === 0) {
        videoListEl.innerHTML = '<p>Không tìm thấy video nào.</p>';
        return;
    }

    videos.forEach(video => {
        const div = document.createElement('div');
        div.textContent = video.name;
        div.dataset.url = video.url;
        div.onclick = () => playVideo(div, video.name, video.url);
        videoListEl.appendChild(div);
    });
};

const fetchVideoList = async () => {
    videoListEl.innerHTML = '<p>Đang tải video...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/videos`);
        const data = await response.json();
        allVideos = data; // Lưu danh sách gốc
        renderVideoList(allVideos); // Render ban đầu
    } catch (error) {
        videoListEl.innerHTML = '<p style="color: red;">Lỗi tải danh sách video từ Server.</p>';
        console.error('Fetch video list error:', error);
    }
};

// --- 5. Chức năng xem video (Viewer) ---
const playVideo = (selectedDiv, title, url) => {
    // Xóa trạng thái active cũ
    document.querySelectorAll('#video-list div').forEach(div => {
        div.classList.remove('active');
    });

    // Thêm trạng thái active cho video vừa chọn
    selectedDiv.classList.add('active');

    currentVideoTitle.textContent = title;
    // Cần phải set nguồn video với URL đầy đủ từ Server (http://localhost:3000/videos/...)
    videoPlayer.src = url; 
    videoPlayer.load();
    videoPlayer.play();
};

// --- 6. Xử lý Tìm kiếm (Filter) ---
searchInput.oninput = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredVideos = allVideos.filter(video => 
        video.name.toLowerCase().includes(searchTerm)
    );
    renderVideoList(filteredVideos);
};

// --- Khởi tạo ứng dụng ---
const initializeApp = () => {
    updateUIForUser();
    fetchVideoList();
};

initializeApp();

// --- Xử lý đóng Modal khi click ra ngoài hoặc nhấn nút X ---
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.onclick = (e) => {
        e.target.closest('.modal').style.display = 'none';
    };
});

window.onclick = (event) => {
    if (event.target === loginModal) {
        loginModal.style.display = 'none';
    }
    if (event.target === uploadModal) {
        uploadModal.style.display = 'none';
    }
};