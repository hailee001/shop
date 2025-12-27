const BOT_TOKEN = '8290018957:AAGzAOzxnVzw6ppUwieA_rFni2SHVw4Ffqo';
const CHAT_ID = '7829265174';

const PRODUCTS = [
    { id: 1, name: "Netflix Premium - 1 Tháng (Riêng tư)", price: 65000, img: "https://i.ibb.co/0m8pL9Y/netflix.png" },
    { id: 2, name: "Locket Gold - 3 Tháng (iOS)", price: 25000, img: "https://i.ibb.co/vqy6m8S/locket.png" },
    { id: 3, name: "Locket Gold - 1 Năm (iOS)", price: 85000, img: "https://i.ibb.co/vqy6m8S/locket.png" },
    { id: 4, name: "Canva Pro - 1 Tháng", price: 20000, img: "https://i.ibb.co/pW3Y7Zk/canva.png" },
    { id: 5, name: "Canva Pro - 1 Năm", price: 100000, img: "https://i.ibb.co/pW3Y7Zk/canva.png" },
    { id: 6, name: "ChatGPT Plus - 1 Tháng (Dùng chung)", price: 55000, img: "https://i.ibb.co/zXf9pS5/chatgpt.png" },
    { id: 7, name: "ChatGPT Plus - 1 Tháng (Chính chủ)", price: 350000, img: "https://i.ibb.co/zXf9pS5/chatgpt.png" },
    { id: 8, name: "Tool v15 Platinum", price: 150000, img: "https://i.ibb.co/9V9pL9Y/tool.png" }
];

let currentUser = null;
let lastUpdateId = 0;

function handleAuth() {
    const u = document.getElementById('username').value.trim().toLowerCase();
    const p = document.getElementById('password').value;
    if(!u || !p) return alert("Nhập đủ thông tin!");

    let data = JSON.parse(localStorage.getItem(`user_${u}`));
    if(!data) {
        data = { pass: p, balance: 0, totalNap: 0 };
        localStorage.setItem(`user_${u}`, JSON.stringify(data));
    }

    if(data.pass === p) {
        currentUser = u;
        updateUI();
        document.getElementById('auth-overlay').style.display = 'none';
        navigateTo('home');
        initSnow();
    } else alert("Sai mật khẩu!");
}

function updateUI() {
    const data = JSON.parse(localStorage.getItem(`user_${currentUser}`));
    const rank = getRank(data.totalNap || 0);

    document.getElementById('balance-val').innerText = data.balance.toLocaleString() + 'đ';
    document.getElementById('hello-user').innerText = currentUser.toUpperCase();
    document.getElementById('ck-content').innerText = "THAI " + currentUser.toUpperCase();
    
    // Update Rank
    const rankDisp = document.getElementById('user-rank-display');
    rankDisp.innerText = rank.name;
    rankDisp.className = `text-[8px] font-black uppercase ${rank.class}`;
    
    document.getElementById('rank-name-text').innerText = rank.name;
    document.getElementById('rank-name-text').className = rank.class;
    document.getElementById('rank-icon-big').innerHTML = `<i class="fas ${rank.icon} ${rank.class}"></i>`;
}

function buyProduct(id) {
    const p = PRODUCTS.find(x => x.id === id);
    let data = JSON.parse(localStorage.getItem(`user_${currentUser}`));

    if(data.balance < p.price) return alert("Không đủ tiền!");

    data.balance -= p.price;
    localStorage.setItem(`user_${currentUser}`, JSON.stringify(data));
    updateUI();

    const orderId = "MUA" + Date.now();
    const order = { id: orderId, name: p.name, status: 'pending', key: 'Chờ duyệt...', time: new Date().toLocaleString() };
    
    let list = JSON.parse(localStorage.getItem(`orders_${currentUser}`) || '[]');
    list.unshift(order);
    localStorage.setItem(`orders_${currentUser}`, JSON.stringify(list));

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(`🛒 MUA MỚI\n👤 Khách: ${currentUser}\n📦 SP: ${p.name}\n🆔 ID: ${orderId}\n👉 DuyetMua ${currentUser} ${orderId} [KEY]`)}`);
    alert("Đã trừ tiền! Đang chờ duyệt.");
    navigateTo('history');
}

function sendRecharge() {
    const amt = parseInt(document.getElementById('nap-amount').value);
    if(!amt || amt < 10000) return alert("Tối thiểu 10k");

    const id = "NAP" + Date.now();
    const rec = { id, amount: amt, status: 'pending', time: new Date().toLocaleString() };
    
    let h = JSON.parse(localStorage.getItem(`recharge_${currentUser}`) || '[]');
    h.unshift(rec);
    localStorage.setItem(`recharge_${currentUser}`, JSON.stringify(h));

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(`💰 NẠP MỚI\n👤 Khách: ${currentUser}\n💵 Tiền: ${amt}\n🆔 ID: ${id}\n👉 DuyetNap ${currentUser} ${amt} ${id}`)}`);
    alert("Đã gửi yêu cầu!");
    renderRechargeHistory();
}

// DUYỆT TELEGRAM
async function checkTele() {
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}`);
        const data = await res.json();
        if(data.result) {
            data.result.forEach(up => {
                lastUpdateId = up.update_id;
                const txt = up.message?.text;
                if(txt && up.message.chat.id.toString() === CHAT_ID) {
                    if(txt.startsWith('DuyetNap ')) {
                        const [_, user, amt, id] = txt.split(' ');
                        let uData = JSON.parse(localStorage.getItem(`user_${user}`));
                        let uH = JSON.parse(localStorage.getItem(`recharge_${user}`));
                        let idx = uH.findIndex(x => x.id === id && x.status === 'pending');
                        if(uData && idx !== -1) {
                            uData.balance += parseInt(amt);
                            uData.totalNap += parseInt(amt);
                            uH[idx].status = 'success';
                            localStorage.setItem(`user_${user}`, JSON.stringify(uData));
                            localStorage.setItem(`recharge_${user}`, JSON.stringify(uH));
                            if(user === currentUser) { launchFireworks(); updateUI(); renderRechargeHistory(); }
                        }
                    }
                    if(txt.startsWith('DuyetMua ')) {
                        const parts = txt.split(' ');
                        const [user, id] = [parts[1], parts[2]];
                        const key = parts.slice(3).join(' ');
                        let uO = JSON.parse(localStorage.getItem(`orders_${user}`));
                        let idx = uO.findIndex(x => x.id === id && x.status === 'pending');
                        if(idx !== -1) {
                            uO[idx].status = 'success'; uO[idx].key = key;
                            localStorage.setItem(`orders_${user}`, JSON.stringify(uO));
                            if(user === currentUser) { launchFireworks(); renderOrderHistory(); }
                        }
                    }
                }
            });
        }
    } catch(e) {}
}
setInterval(checkTele, 3000);

function toggleLeaderboard() {
    const box = document.getElementById('leaderboard-box');
    box.classList.toggle('hidden');
    if(!box.classList.contains('hidden')) {
        const list = document.getElementById('leaderboard-list');
        const tops = getTopUsers();
        list.innerHTML = tops.map((u, i) => {
            const r = getRank(u.total);
            return `<div class="flex justify-between p-4 bg-slate-900 rounded-2xl border border-slate-700">
                <span class="font-black text-indigo-500">#${i+1} ${u.name.toUpperCase()}</span>
                <span class="${r.class} text-[10px] font-bold"><i class="fas ${r.icon} mr-1"></i>${r.name} (${u.total.toLocaleString()}đ)</span>
            </div>`;
        }).join('');
    }
}

function launchFireworks() {
    for(let i=0; i<15; i++) {
        setTimeout(() => {
            const f = document.createElement('div');
            f.className = 'firework';
            f.style.left = Math.random() * 100 + 'vw'; f.style.top = Math.random() * 100 + 'vh';
            f.style.color = `hsl(${Math.random()*360}, 100%, 50%)`;
            document.body.appendChild(f);
            setTimeout(() => f.remove(), 1000);
        }, i * 150);
    }
}

function navigateTo(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('page-active'));
    document.getElementById(`page-${id}`).classList.add('page-active');
    if(id === 'home') renderProducts();
    if(id === 'recharge') renderRechargeHistory();
    if(id === 'history') renderOrderHistory();
}

function renderProducts() {
    document.getElementById('product-list').innerHTML = PRODUCTS.map(p => `
        <div class="bg-slate-800 p-4 rounded-[30px] border border-slate-700 shadow-lg group">
            <img src="${p.img}" class="w-full h-24 object-contain mb-4 group-hover:scale-110 transition-all">
            <h3 class="text-[9px] font-black uppercase mb-2 h-8 line-clamp-2">${p.name}</h3>
            <div class="flex justify-between items-center">
                <span class="text-indigo-400 font-black">${p.price.toLocaleString()}đ</span>
                <button onclick="buyProduct(${p.id})" class="bg-indigo-600 w-8 h-8 rounded-xl"><i class="fas fa-shopping-cart text-[10px]"></i></button>
            </div>
        </div>
    `).join('');
}

function renderRechargeHistory() {
    const h = JSON.parse(localStorage.getItem(`recharge_${currentUser}`) || '[]');
    document.getElementById('recharge-history').innerHTML = h.map(x => `
        <div class="flex justify-between p-3 bg-slate-900 rounded-xl text-[9px] font-bold border border-slate-700">
            <span>+${x.amount.toLocaleString()}đ</span>
            <span class="${x.status==='pending'?'text-amber-500':'text-emerald-500'} uppercase">${x.status==='pending'?'Chờ':'Xong'}</span>
        </div>
    `).join('');
}

function renderOrderHistory() {
    const o = JSON.parse(localStorage.getItem(`orders_${currentUser}`) || '[]');
    document.getElementById('order-history-list').innerHTML = o.map(x => `
        <div class="p-5 bg-slate-800 rounded-3xl border border-slate-700 flex justify-between items-center">
            <div class="text-[10px] font-black uppercase">${x.name}</div>
            <code class="text-[10px] text-indigo-400 font-black bg-slate-900 px-3 py-1 rounded-lg">${x.key}</code>
        </div>
    `).join('');
}

function initSnow() {
    for(let i=0; i<20; i++) {
        const s = document.createElement('div'); s.className = 'snowflake'; s.innerHTML = '❄';
        s.style.left = Math.random() * 100 + 'vw'; s.style.animationDuration = (Math.random()*3+3)+'s';
        document.body.appendChild(s);
    }
    // --- QUẢN LÝ TÀI KHOẢN ---
function toggleAuth(isLogin) {
    document.getElementById('login-form').style.display = isLogin ? 'block' : 'none';
    document.getElementById('register-form').style.display = !isLogin ? 'block' : 'none';
}

function handleRegister() {
    const user = document.getElementById('reg-username').value;
    const pass = document.getElementById('reg-password').value;
    const rePass = document.getElementById('reg-re-password').value;

    if (!user || !pass) return alert("Vui lòng nhập đủ thông tin!");
    if (pass !== rePass) return alert("Mật khẩu không khớp!");

    let users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[user]) return alert("Tên tài khoản đã tồn tại!");

    users[user] = {
        password: pass,
        balance: 0,
        totalNap: 0,
        history: [] // Lưu lịch sử nạp/mua
    };
    localStorage.setItem('users', JSON.stringify(users));
    alert("Đăng ký thành công! Hãy đăng nhập.");
    toggleAuth(true);
}

// Cập nhật hàm Login để hiển thị Dashboard
function handleLogin() {
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    let users = JSON.parse(localStorage.getItem('users')) || {};

    if (users[user] && users[user].password === pass) {
        currentUser = user;
        sessionStorage.setItem('loggedInUser', user);
        updateDashboard();
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('user-dashboard').style.display = 'block';
        document.getElementById('store-container').style.display = 'block';
    } else {
        alert("Sai tài khoản hoặc mật khẩu!");
    }
}

function handleLogout() {
    sessionStorage.clear();
    location.reload();
}

// --- QUẢN LÝ LỊCH SỬ VÀ HIỂN THỊ ---
function updateDashboard() {
    let users = JSON.parse(localStorage.getItem('users'));
    let data = users[currentUser];
    document.getElementById('display-name').innerText = currentUser;
    document.getElementById('display-balance').innerText = data.balance.toLocaleString() + 'đ';
    document.getElementById('display-rank').innerText = calculateRank(data.totalNap);
}

function showHistory() {
    const historyDiv = document.getElementById('history-section');
    const list = document.getElementById('history-list');
    historyDiv.style.display = historyDiv.style.display === 'none' ? 'block' : 'none';

    let users = JSON.parse(localStorage.getItem('users'));
    let history = users[currentUser].history || [];
    
    list.innerHTML = history.length === 0 ? "<p>Chưa có giao dịch nào.</p>" : 
        history.map(item => `<div class="history-item">[${item.time}] ${item.type}: ${item.content}</div>`).join('');
}

// Hàm ghi lại lịch sử (Gọi hàm này mỗi khi DuyetNap hoặc DuyetMua thành công)
function addHistory(user, type, content) {
    let users = JSON.parse(localStorage.getItem('users'));
    let time = new Date().toLocaleString('vi-VN');
    users[user].history.unshift({ time, type, content });
    localStorage.setItem('users', JSON.stringify(users));
}
// --- CẤU HÌNH VÒNG QUAY ---
const SPIN_COST = 10000;
const WIN_RATE = 0.02; // 2% tỉ lệ thắng
const WIN_PRIZE = 50000; // Giải thưởng khi thắng (ví dụ 50k)

// --- KHO KEY TỰ ĐỘNG (Ví dụ cho Tool v15) ---
const AUTO_KEYS = {
    8: ["KEY-V15-AX12", "KEY-V15-BY99", "KEY-V15-CZ55"] // Sản phẩm ID 8
};

// --- 1. CẬP NHẬT BẢO MẬT (Mã hóa mật khẩu đơn giản) ---
function hashPass(pass) {
    return btoa(pass).split('').reverse().join(''); // Mã hóa cơ bản để không nhìn thấy pass thuần
}

// Sửa lại hàm handleRegister
function handleRegister() {
    const u = document.getElementById('reg-username').value.trim().toLowerCase();
    const p = document.getElementById('reg-password').value;
    const rp = document.getElementById('reg-repassword').value;

    if(!u || !p) return alert("Vui lòng điền đầy đủ!");
    if(p !== rp) return alert("Mật khẩu không khớp!");
    if(localStorage.getItem(`user_${u}`)) return alert("Tài khoản đã tồn tại!");

    // Lưu mật khẩu đã mã hóa
    const userData = { pass: hashPass(p), balance: 0, totalNap: 0 };
    localStorage.setItem(`user_${u}`, JSON.stringify(userData));
    alert("Đăng ký thành công!");
    toggleAuthMode(true);
}

// --- 2. CẬP NHẬT MUA HÀNG TỰ ĐỘNG (Auto Delivery) ---
function buyProduct(id) {
    const p = PRODUCTS.find(x => x.id === id);
    let data = JSON.parse(localStorage.getItem(`user_${currentUser}`));
    
    if (data.balance < p.price) return alert("Không đủ tiền!");
    
    data.balance -= p.price;
    localStorage.setItem(`user_${currentUser}`, JSON.stringify(data));
    
    let keyTraVe = "Chờ duyệt...";
    let status = "pending";

    // Nếu là sản phẩm có key sẵn (như Tool ID 8)
    if (AUTO_KEYS[id] && AUTO_KEYS[id].length > 0) {
        keyTraVe = AUTO_KEYS[id].shift(); // Lấy key đầu tiên ra
        status = "success";
        launchFireworks(); // Nổ pháo hoa ăn mừng
    }

    const order = { 
        id: "MUA" + Date.now(), 
        name: p.name, 
        status: status, 
        key: keyTraVe, 
        time: new Date().toLocaleString() 
    };

    let list = JSON.parse(localStorage.getItem(`orders_${currentUser}`) || '[]');
    list.unshift(order);
    localStorage.setItem(`orders_${currentUser}`, JSON.stringify(list));
    
    updateUI();
    alert(status === "success" ? "Mua thành công! Nhận key ngay." : "Đã trừ tiền! Chờ duyệt.");
    navigateTo('history');
}

// --- 3. VÒNG QUAY MAY MẮN (Góc màn hình) ---
function playLuckySpin() {
    let data = JSON.parse(localStorage.getItem(`user_${currentUser}`));
    if (data.balance < SPIN_COST) return alert("Cần tối thiểu 10k để quay!");

    data.balance -= SPIN_COST;
    let win = Math.random() < WIN_RATE;
    let resultMsg = "";

    if (win) {
        data.balance += WIN_PRIZE;
        resultMsg = `CHÚC MỪNG! Bạn đã trúng ${WIN_PRIZE.toLocaleString()}đ`;
        launchFireworks();
    } else {
        resultMsg = "Rất tiếc, chúc bạn may mắn lần sau!";
    }

    localStorage.setItem(`user_${currentUser}`, JSON.stringify(data));
    
    // Ghi lịch sử quay
    let spinHis = JSON.parse(localStorage.getItem(`spin_${currentUser}`) || '[]');
    spinHis.unshift({ time: new Date().toLocaleTimeString(), res: resultMsg, cost: SPIN_COST });
    localStorage.setItem(`spin_${currentUser}`, JSON.stringify(spinHis.slice(0, 5))); // Lưu 5 trận gần nhất

    updateUI();
    alert(resultMsg);
    renderSpinHistory();
}

function renderSpinHistory() {
    const h = JSON.parse(localStorage.getItem(`spin_${currentUser}`) || '[]');
    const list = document.getElementById('spin-history-list');
    if(list) {
        list.innerHTML = h.map(x => `<div class="text-[9px] border-b border-white/10 py-1">${x.time}: ${x.res}</div>`).join('');
    }
}
const fakeUsers = ["hong***", "tuan***", "linh***", "admin***", "vjp***", "hai***"];
const fakeItems = ["Netflix 1 Tháng", "Locket Gold", "ChatGPT Plus", "Tool v15 Platinum"];

function showFakeOrder() {
    const user = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];
    const item = fakeItems[Math.floor(Math.random() * fakeItems.length)];
    
    const toast = document.createElement('div');
    toast.className = "fixed top-20 left-5 bg-slate-800 border-l-4 border-indigo-500 p-3 rounded shadow-2xl z-[100] animate-bounce-slow text-[10px]";
    toast.innerHTML = `🛒 <span class="text-indigo-400 font-bold">${user}</span> vừa mua <b>${item}</b>`;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Cứ mỗi 30-60 giây hiện 1 lần
setInterval(showFakeOrder, Math.random() * (60000 - 30000) + 30000);
// --- HỆ THỐNG ÂM THANH ---
const SOUNDS = {
    click: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
    success: new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'),
    spin: new Audio('https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3'),
    win: new Audio('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3')
};

// Hàm phát âm thanh
function playSound(type) {
    if (SOUNDS[type]) {
        SOUNDS[type].currentTime = 0;
        SOUNDS[type].play().catch(e => console.log("Chờ tương tác người dùng để phát nhạc"));
    }
}

// Tự động gắn âm thanh click cho tất cả button
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') playSound('click');
});

// --- LOGIC THÔNG BÁO CHẠY NGANG (MARQUEE) ---
const fakeNames = ["nguyen***", "tran***", "le***", "pham***", "hoang***", "dang***"];
const fakeActions = ["vừa nạp 50,000đ", "vừa mua Netflix Premium", "vừa nạp 200,000đ", "vừa trúng 50k từ Vòng Quay"];

function updateMarquee() {
    const marqueeContainer = document.getElementById('marquee-content');
    let content = "";
    for(let i=0; i<10; i++) {
        const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
        const action = fakeActions[Math.floor(Math.random() * fakeActions.length)];
        content += `<span class="mx-10 italic text-amber-300 font-black"><i class="fas fa-bolt mr-1"></i> ${name} ${action}</span>`;
    }
    marqueeContainer.innerHTML = content + content; // Nhân đôi để chạy mượt
}
updateMarquee();
setInterval(updateMarquee, 60000); // Cập nhật nội dung mỗi phút

// --- CẬP NHẬT CÁC HÀM CŨ ĐỂ CÓ ÂM THANH ---
// Ví dụ trong hàm nạp tiền thành công (khi nhận lệnh từ Telegram)
function onNapSuccess() {
    playSound('success');
    launchFireworks();
}

// Ví dụ trong hàm quay thưởng
const originalPlaySpin = window.playLuckySpin;
window.playLuckySpin = function() {
    playSound('spin');
    // Đợi 1 chút cho cảm giác đang quay rồi mới hiện kết quả
    setTimeout(() => {
        if (typeof originalPlaySpin === 'function') originalPlaySpin();
        // Nếu thắng thì phát âm thanh 'win' (bạn thêm logic check thắng vào hàm gốc)
    }, 1000);
};
}