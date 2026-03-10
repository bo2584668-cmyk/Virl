// إعدادات PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// الأصوات المتاحة
const sounds = {
    click: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
    success: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
    trash: "https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3",
    error: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
    popup: "https://assets.mixkit.co/active_storage/sfx/2580/2580-preview.mp3",
    engine: "https://assets.mixkit.co/active_storage/sfx/876/876-preview.mp3",
    rocket: "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3",
    magic: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
    cheer: "https://assets.mixkit.co/active_storage/sfx/1434/1434-preview.mp3"
};

let db;
let currentPass = localStorage.getItem('rivlPass') || '';
let currentSecQuestion = localStorage.getItem('rivlSecQuestion') || 'ما هو طولك؟';
let currentSecAnswer = localStorage.getItem('rivlSecAnswer') || 'معرفش';
let pendingFile = null;
let editingBookId = null;
let userName = localStorage.getItem('rivlUserName') || '';
let currentBookId = null;
let readingStartTime = null;

// إعدادات الصوت
let selectedLoginSound = localStorage.getItem('rivlLoginSound') || 'engine';
let isMuted = localStorage.getItem('rivlMuted') === 'true';

// تهيئة المتغيرات عند تحميل الصفحة
const init = () => {
    const theme = localStorage.getItem('rivlTheme') || 'dark';
    const lang = localStorage.getItem('rivlLang') || 'ar';
    document.body.setAttribute('data-theme', theme);
    if (lang === 'en') {
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
    }
    selectedLoginSound = localStorage.getItem('rivlLoginSound') || 'engine';
    isMuted = localStorage.getItem('rivlMuted') === 'true';
    updateUserNameDisplay();
};
init();

// عرض اسم المستخدم في الشريط الجانبي
function updateUserNameDisplay() {
    const display = document.getElementById('user-name-display');
    if (userName) {
        display.innerText = `مرحباً، ${userName}`;
    } else {
        display.innerText = '';
    }
}

// تغيير الثيم
function setTheme(val) {
    localStorage.setItem('rivlTheme', val);
    document.body.setAttribute('data-theme', val);
}

// تبديل اللغة
function toggleLanguage() {
    const currentLang = localStorage.getItem('rivlLang') || 'ar';
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('rivlLang', newLang);
    if (newLang === 'en') {
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
    } else {
        document.documentElement.lang = 'ar';
        document.documentElement.dir = 'rtl';
    }
    location.reload();
}

// فتح صفحة الإعدادات بدلاً من المودال
function openSettingsPage() {
    playAudio('popup');
    document.getElementById('libraryContent').style.display = 'none';
    document.getElementById('settingsPage').style.display = 'block';
}

function closeSettingsPage() {
    document.getElementById('settingsPage').style.display = 'none';
    document.getElementById('libraryContent').style.display = 'block';
}

// دوال فتح المودالات الأخرى
function openContact() { playAudio('popup'); document.getElementById('contactModal').style.display = 'block'; }
function openDownloadBooks() { playAudio('popup'); document.getElementById('downloadBooksModal').style.display = 'block'; }
function openAboutUs() { playAudio('popup'); document.getElementById('aboutUsModal').style.display = 'block'; }
function shareSite() {
    if (navigator.share) {
        navigator.share({
            title: 'rivl',
            text: 'اكتشف مكتبة رقمية متكاملة للكتب والملخصات!',
            url: window.location.href
        }).then(() => showToast('✅ تم المشاركة'))
        .catch(() => showToast('❌ خطأ في المشاركة'));
    } else {
        showToast('❌ المشاركة غير مدعومة في هذا المتصفح');
    }
}
function openPassChangeModal() { document.getElementById('passChangeModal').style.display = 'block'; }
function saveNewPassAndSec() {
    const np = document.getElementById('newPassInput').value.trim();
    const nsq = document.getElementById('newSecQuestion').value.trim();
    const nsa = document.getElementById('newSecAnswer').value.trim();
    if(np && nsq && nsa) {
        localStorage.setItem('rivlPass', np);
        localStorage.setItem('rivlSecQuestion', nsq);
        localStorage.setItem('rivlSecAnswer', nsa);
        currentPass = np;
        currentSecQuestion = nsq;
        currentSecAnswer = nsa;
        showToast("✅ تم تغيير كلمة المرور وسؤال الأمان");
        document.getElementById('newPassInput').value = '';
        document.getElementById('newSecQuestion').value = '';
        document.getElementById('newSecAnswer').value = '';
        closeModals();
    } else {
        showToast("❌ يرجى ملء جميع الحقول");
    }
}
function deleteAllFiles() {
    if(confirm("هل أنت متأكد من حذف جميع الملفات؟")) {
        db.transaction("books", "readwrite").objectStore("books").clear().onsuccess = () => {
            db.transaction("bin", "readwrite").objectStore("bin").clear().onsuccess = () => {
                render(); updateStats(); showToast("تم حذف جميع الملفات");
            };
        };
    }
}

// ====================== إعدادات الصوت ======================
function openSoundSettings() {
    playAudio('click');
    document.getElementById('soundSettingsModal').style.display = 'block';
    const muteBtn = document.getElementById('muteBtn');
    muteBtn.innerText = isMuted ? '🔊 إلغاء الكتم' : '🔇 كتم الصوت';
}

function getSoundName(key) {
    const names = {
        engine: 'محرك سيارة',
        rocket: 'صاروخ فضائي',
        magic: 'تأثير سحري',
        cheer: 'تصفيق الجمهور'
    };
    return names[key] || key;
}

function selectLoginSound(key) {
    if (!sounds[key]) return;
    selectedLoginSound = key;
    localStorage.setItem('rivlLoginSound', key);
    showToast(`✅ تم اختيار صوت: ${getSoundName(key)}`);
    if (!isMuted) {
        const audio = new Audio(sounds[key]);
        audio.volume = 0.5;
        audio.play().catch(() => {});
    }
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('rivlMuted', isMuted);
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) muteBtn.innerText = isMuted ? '🔊 إلغاء الكتم' : '🔇 كتم الصوت';
    showToast(isMuted ? '🔇 تم كتم جميع الأصوات' : '🔊 تم تفعيل الأصوات');
}

// ====================== التعامل مع الشاشة الأولية ======================
function handleInitialScreen() {
    const initialized = localStorage.getItem('rivlInitialized');
    if (!initialized) {
        document.getElementById('initialScreen').style.display = 'block';
    } else {
        if (currentPass === '') {
            showPage('libraryContent');
            render();
        } else {
            showPage('loginPage');
        }
    }
}

function startWithoutPassword() {
    localStorage.setItem('rivlPass', '');
    localStorage.setItem('rivlInitialized', 'true');
    currentPass = '';
    document.getElementById('initialScreen').style.display = 'none';
    playAudio('success');
    showPage('libraryContent');
    render();
    showToast('✅ تم البدء بدون كلمة مرور. يمكنك إضافتها لاحقاً من الإعدادات.');
}

function showCreatePasswordModal() {
    document.getElementById('initialScreen').style.display = 'none';
    document.getElementById('createPassModal').style.display = 'block';
    document.getElementById('initPass').value = '';
    document.getElementById('initSecQ').value = '';
    document.getElementById('initSecA').value = '';
}

function saveInitialPass() {
    const pass = document.getElementById('initPass').value.trim();
    const q = document.getElementById('initSecQ').value.trim();
    const a = document.getElementById('initSecA').value.trim();
    if (pass.length < 1 || q.length < 1 || a.length < 1) {
        showToast("❌ يرجى ملء جميع الحقول");
        return;
    }
    localStorage.setItem('rivlPass', pass);
    localStorage.setItem('rivlSecQuestion', q);
    localStorage.setItem('rivlSecAnswer', a);
    localStorage.setItem('rivlInitialized', 'true');
    currentPass = pass;
    currentSecQuestion = q;
    currentSecAnswer = a;
    document.getElementById('createPassModal').style.display = 'none';
    playAudio('success');
    showPage('libraryContent');
    render();
    showToast("✅ تم إنشاء كلمة المرور وسؤال الأمان بنجاح!");
}

function closeCreateModal() {
    document.getElementById('createPassModal').style.display = 'none';
    document.getElementById('initialScreen').style.display = 'block';
}

// ====================== IndexedDB ======================
const req = indexedDB.open("rivl_Final_2026", 4);
req.onupgradeneeded = (e) => {
    const d = e.target.result;
    if (!d.objectStoreNames.contains('books')) {
        d.createObjectStore("books", {keyPath: "id", autoIncrement: true});
    }
    if (!d.objectStoreNames.contains('bin')) {
        d.createObjectStore("bin", {keyPath: "id", autoIncrement: true});
    }
};
req.onsuccess = (e) => { 
    db = e.target.result; 
    updateStats();
    setTimeout(() => {
        document.getElementById('loader').classList.add('fade-out');
        setTimeout(() => {
            document.getElementById('loader').style.display='none';
            handleInitialScreen();
        }, 1000);
    }, 2000);
};

function showToast(m) {
    const t = document.getElementById('toast'); t.innerText = m;
    t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000);
}

function showPage(id) {
    ['loginPage', 'secPage', 'libraryContent', 'initialScreen', 'settingsPage'].forEach(p => {
        const el = document.getElementById(p);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(id);
    if (target) target.style.display = 'block';
    
    const fBadge = document.getElementById('floatingBadge');
    const sBtn = document.getElementById('sidebarToggle');
    if (id === 'libraryContent' || id === 'settingsPage') { 
        fBadge.style.display = 'block'; 
        sBtn.style.display = 'block'; 
    } else { 
        fBadge.style.display = 'none'; 
        sBtn.style.display = 'none'; 
    }
}

function login() {
    if(document.getElementById('passIn').value === currentPass) { 
        playAudio('engine');
        showPage('libraryContent'); 
        render(); 
    } else {
        playAudio('error');
        showToast("❌ كلمة المرور خطأ");
    }
}

function checkSec() {
    if(document.getElementById('secAns').value === currentSecAnswer) {
        playAudio('engine');
        showPage('libraryContent'); 
        showToast("الباسورد هو: " + currentPass); 
        render();
    } else {
        playAudio('error');
        showToast("⚠️ إجابة خطأ");
    }
}

function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display='none'); }

function upload(e) {
    pendingFile = e.target.files[0];
    if(!pendingFile) return;
    playAudio('popup');
    document.getElementById('pendingFileName').innerText = pendingFile.name;
    document.getElementById('bookTitleInput').value = pendingFile.name.replace(/\.pdf$/i, '');
    document.getElementById('bookAuthorInput').value = '';
    document.getElementById('uploadModal').style.display = 'block';
}

async function getPdfInfo(dataUrl) {
    try {
        const pdf = await pdfjsLib.getDocument(dataUrl).promise;
        const numPages = pdf.numPages;
        const page = await pdf.getPage(1);
        const view = page.getViewport({scale: 0.3});
        const canv = document.createElement('canvas');
        canv.width = view.width;
        canv.height = view.height;
        await page.render({canvasContext: canv.getContext('2d'), viewport: view}).promise;
        return {
            thumb: canv.toDataURL('image/jpeg', 0.6),
            numPages: numPages
        };
    } catch(e) {
        console.error("PDF info error:", e);
        return {thumb: '', numPages: 0};
    }
}

document.getElementById('confirmUploadBtn').onclick = async () => {
    const cat = document.getElementById('selectedCat').value;
    const desc = document.getElementById('bookDescInput').value || "لا يوجد وصف";
    const rating = document.getElementById('bookRatingInput').value;
    const title = document.getElementById('bookTitleInput').value.trim() || pendingFile.name.replace(/\.pdf$/i, '');
    const author = document.getElementById('bookAuthorInput').value.trim() || 'غير معروف';
    const file = pendingFile;
    closeModals();
    showToast("⏳ جاري الرفع واستخراج معلومات PDF...");
    
    const r = new FileReader();
    r.onload = async (ev) => {
        const {thumb, numPages} = await getPdfInfo(ev.target.result);
        const tx = db.transaction("books", "readwrite");
        tx.objectStore("books").add({ 
            name: title, 
            author: author,
            numPages: numPages,
            data: ev.target.result, 
            thumb, 
            size: file.size, 
            category: cat,
            description: desc,
            rating: rating,
            date: new Date().toLocaleDateString('ar-EG'),
            readCount: 0,
            lastPage: 1,
            progress: 0,
            readingTime: 0
        });
        tx.oncomplete = () => { 
            playAudio('success');
            render(); 
            updateStats(); 
            showToast("✅ تم حفظ الكتاب مع اسم المؤلف وعدد الصفحات");
            document.getElementById('bookDescInput').value = '';
            document.getElementById('bookTitleInput').value = '';
            document.getElementById('bookAuthorInput').value = '';
        };
    };
    r.readAsDataURL(file);
};

function render() {
    const g = document.getElementById('grid');
    const q = document.getElementById('search').value.toLowerCase();
    const s = document.getElementById('sort').value;
    const cf = document.getElementById('catFilter').value;
    g.innerHTML = "";
    const tx = db.transaction("books", "readonly");
    let books = [];
    tx.objectStore("books").openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if(c) { 
            const nameMatch = c.value.name.toLowerCase().includes(q);
            const descMatch = c.value.description && c.value.description.toLowerCase().includes(q);
            const authorMatch = (c.value.author || '').toLowerCase().includes(q);
            if((nameMatch || descMatch || authorMatch) && (cf === 'all' || c.value.category === cf)) books.push(c.value); 
            c.continue(); 
        } else {
            books.sort((a,b) => s === 'az' ? a.name.localeCompare(b.name) : b.id - a.id);
            books.forEach(b => {
                const d = document.createElement('div'); d.className = 'card';
                const stars = "⭐".repeat(b.rating || 5);
                const progress = b.progress || 0;
                const readingTime = b.readingTime || 0;
                d.innerHTML = `
                    <div class="card-tag">${b.category || 'كتب'}</div>
                    <img src="${b.thumb || 'https://via.placeholder.com/150'}" class="preview" onclick="playAudio('popup'); viewB(${b.id})">
                    <input class="title-edit" value="${b.name}" onchange="updateTitle(${b.id}, this.value)">
                    <div class="book-rating">${stars}</div>
                    <div class="book-author">👤 ${b.author || 'غير معروف'}</div>
                    <div class="book-description">${b.description || "بدون وصف"}</div>
                    <div class="book-progress">📊 تقدم: ${progress}%</div>
                    <div class="book-reading-time">🕒 وقت القراءة: ${formatTime(readingTime)}</div>
                    <div class="book-meta">📅 ${b.date} | 📖 ${b.numPages || '?'} صفحة | ${formatSize(b.size)}</div>
                    <div class="card-btns">
                        <button class="btn-s" style="background:var(--primary); color:#000" onclick="playAudio('popup'); viewB(${b.id})">فتح</button>
                        <button class="btn-s" style="background:#f1c40f; color:#000" onclick="playAudio('click'); editBook(${b.id})">✏️ تعديل</button>
                        <button class="btn-s" style="background:#333" onclick="playAudio('click'); downB(${b.id})">تنزيل</button>
                        <button class="btn-s" style="background:var(--danger)" onclick="playAudio('trash'); moveToBin(${b.id})">حذف</button>
                    </div>`;
                g.appendChild(d);
            });
        }
    };
}

let currentPdfUrl = null;

function viewB(id) {
    db.transaction("books").objectStore("books").get(id).onsuccess = (e) => {
        const b = e.target.result;
        const blob = dataURLtoBlob(b.data);
        currentPdfUrl = URL.createObjectURL(blob);
        currentBookId = id;
        pageNum = b.lastPage || 1;
        readingStartTime = Date.now();
        openReader(currentPdfUrl, b.name);
        incrementReadCount(id);
    };
}

function incrementReadCount(id) {
    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    store.get(id).onsuccess = (e) => {
        const data = e.target.result;
        data.readCount = (data.readCount || 0) + 1;
        store.put(data);
    };
}

function updateBookProgress(id, lastPage, numPages) {
    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    store.get(id).onsuccess = (e) => {
        const data = e.target.result;
        data.lastPage = lastPage;
        data.progress = Math.round((lastPage / numPages) * 100);
        store.put(data);
        tx.oncomplete = () => {
            render();
        };
    };
}

function updateReadingTime(id, additionalTime) {
    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    store.get(id).onsuccess = (e) => {
        const data = e.target.result;
        data.readingTime = (data.readingTime || 0) + Math.round(additionalTime / 60000);
        store.put(data);
        tx.oncomplete = () => {
            render();
        };
    };
}

function downB(id) {
    db.transaction("books").objectStore("books").get(id).onsuccess = (e) => {
        const b = e.target.result;
        const a = document.createElement('a'); a.href = b.data; a.download = b.name + ".pdf"; a.click();
    };
}

function updateTitle(id, val) {
    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    store.get(id).onsuccess = (e) => {
        const data = e.target.result;
        data.name = val;
        store.put(data);
        playAudio('success');
        showToast("تم تعديل الاسم");
    };
}

function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], {type:mime});
}

function moveToBin(id) {
    const tx = db.transaction(["books", "bin"], "readwrite");
    tx.objectStore("books").get(id).onsuccess = (e) => {
        tx.objectStore("bin").add(e.target.result);
        tx.objectStore("books").delete(id);
        tx.oncomplete = () => { render(); updateStats(); showToast("تم النقل للسلة"); };
    };
}

function showBin() {
    const list = document.getElementById('binList'); list.innerHTML = "";
    document.getElementById('binModal').style.display = 'block';
    db.transaction("bin").objectStore("bin").openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if(c) {
            const row = document.createElement('div'); row.style = "display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #333; align-items:center";
            row.innerHTML = `<span style="font-size:0.9rem">${c.value.name}</span> <button class="btn-s" style="background:#198754; padding:5px 10px" onclick="playAudio('success'); restoreBook(${c.value.id})">استعادة</button>`;
            list.appendChild(row); c.continue();
        }
    };
}

function restoreBook(id) {
    const tx = db.transaction(["books", "bin"], "readwrite");
    tx.objectStore("bin").get(id).onsuccess = (e) => {
        tx.objectStore("books").add(e.target.result);
        tx.objectStore("bin").delete(id);
        tx.oncomplete = () => { showBin(); render(); updateStats(); };
    };
}

function emptyBin() {
    if(confirm("حذف نهائي؟")) {
        playAudio('trash');
        db.transaction("bin", "readwrite").objectStore("bin").clear().onsuccess = () => {
            closeModals(); updateStats(); showToast("تم الحذف النهائي");
        };
    }
}

function updateStats() {
    let total = 0;
    const tx = db.transaction(["books", "bin"], "readonly");
    tx.objectStore("books").openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if(c) { total += (c.value.size || 0); c.continue(); }
        else document.getElementById('totalStorage').innerText = formatSize(total);
    };
    tx.objectStore("bin").count().onsuccess = (e) => document.getElementById('binCount').innerText = e.target.result;
}

function formatSize(bytes) {
    if(!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
}

function formatTime(minutes) {
    if (minutes < 60) return minutes + ' دقيقة';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours + ' ساعة ' + mins + ' دقيقة';
}

function exportData() {
    const tx = db.transaction("books", "readonly");
    const data = [];
    tx.objectStore("books").openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if(c) { data.push(c.value); c.continue(); }
        else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], {type: "application/json"}));
            a.download = "rivl_Library_Backup.json"; a.click();
        }
    };
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const data = JSON.parse(ev.target.result);
        const tx = db.transaction("books", "readwrite");
        data.forEach(item => {
            if (!item.readCount) item.readCount = 0;
            if (!item.lastPage) item.lastPage = 1;
            if (!item.progress) item.progress = 0;
            if (!item.readingTime) item.readingTime = 0;
            tx.objectStore("books").add(item);
        });
        tx.oncomplete = () => { playAudio('success'); render(); updateStats(); showToast("تم الاستيراد بنجاح"); };
    };
    reader.readAsText(e.target.files[0]);
}

function editBook(id) {
    editingBookId = id;
    playAudio('click');
    db.transaction("books", "readonly").objectStore("books").get(id).onsuccess = (e) => {
        const b = e.target.result;
        if (!b) return;
        document.getElementById('editTitle').value = b.name || '';
        document.getElementById('editAuthor').value = b.author || '';
        document.getElementById('editCat').value = b.category || 'كتب';
        document.getElementById('editDesc').value = b.description || '';
        document.getElementById('editRating').value = b.rating || '5';
        document.getElementById('editBookModal').style.display = 'block';
    };
}

function saveEditBook() {
    const title = document.getElementById('editTitle').value.trim();
    if (!title) {
        showToast("❌ اسم الكتاب مطلوب");
        return;
    }
    const author = document.getElementById('editAuthor').value.trim() || 'غير معروف';
    const cat = document.getElementById('editCat').value;
    const desc = document.getElementById('editDesc').value.trim() || "لا يوجد وصف";
    const rating = parseInt(document.getElementById('editRating').value) || 3;

    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    store.get(editingBookId).onsuccess = (e) => {
        let data = e.target.result;
        data.name = title;
        data.author = author;
        data.category = cat;
        data.description = desc;
        data.rating = rating;
        store.put(data);
    };
    tx.oncomplete = () => {
        closeModals();
        render();
        showToast("✅ تم حفظ تعديلات الكتاب بنجاح");
    };
}

// Sidebar Toggle
document.getElementById('sidebarToggle').onclick = () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
};
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    if (sidebar.classList.contains('open') && !sidebar.contains(event.target) && !toggle.contains(event.target)) {
        sidebar.classList.remove('open');
    }
});

function openProfile() {
    if (!localStorage.getItem('rivlProfileViewed')) {
        document.getElementById('addUsernameModal').style.display = 'block';
        localStorage.setItem('rivlProfileViewed', 'true');
    } else {
        showProfileStats();
    }
}

function saveUsername() {
    const name = document.getElementById('usernameInput').value.trim();
    if (name) {
        localStorage.setItem('rivlUserName', name);
        userName = name;
        updateUserNameDisplay();
        closeModals();
        showProfileStats();
    } else {
        showToast("❌ يرجى إدخال اسم");
    }
}

function showProfileStats() {
    document.getElementById('profileModal').style.display = 'block';
    const content = document.getElementById('profileContent');
    content.innerHTML = '<p>جاري حساب الإحصائيات...</p>';
    let bookCount = 0;
    let totalSize = 0;
    let maxReadBook = { name: '', readCount: 0 };
    let maxTimeBook = { name: '', readingTime: 0 };
    let categories = {};
    let completedBooks = 0;
    let totalPagesRead = 0;
    let totalReadCount = 0;
    let avgRating = 0;
    let avgProgress = 0;
    let totalReadingTime = 0;
    const tx = db.transaction("books", "readonly");
    tx.objectStore("books").openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if (c) {
            bookCount++;
            totalSize += c.value.size || 0;
            totalReadCount += c.value.readCount || 0;
            avgRating += parseInt(c.value.rating) || 0;
            avgProgress += c.value.progress || 0;
            totalPagesRead += (c.value.lastPage - 1) || 0;
            totalReadingTime += c.value.readingTime || 0;
            if (c.value.readCount > maxReadBook.readCount) {
                maxReadBook = { name: c.value.name, readCount: c.value.readCount };
            }
            if (c.value.readingTime > maxTimeBook.readingTime) {
                maxTimeBook = { name: c.value.name, readingTime: c.value.readingTime };
            }
            if (c.value.progress >= 100) completedBooks++;
            categories[c.value.category] = (categories[c.value.category] || 0) + 1;
            c.continue();
        } else {
            avgRating = bookCount > 0 ? (avgRating / bookCount).toFixed(1) : 0;
            avgProgress = bookCount > 0 ? (avgProgress / bookCount).toFixed(1) : 0;
            let catStats = '';
            for (let cat in categories) {
                catStats += `<li>${cat}: ${categories[cat]} كتاب</li>`;
            }
            content.innerHTML = `
                <p>📚 عدد الكتب: ${bookCount}</p>
                <p>💾 الحجم الإجمالي: ${formatSize(totalSize)}</p>
                <p>📖 أكثر كتاب قراءة: ${maxReadBook.name} (${maxReadBook.readCount} مرات)</p>
                <p>🕒 أكثر كتاب وقت قراءة: ${maxTimeBook.name} (${formatTime(maxTimeBook.readingTime)})</p>
                <p>🏆 عدد الكتب المكتملة: ${completedBooks}</p>
                <p>⭐ متوسط التقييم: ${avgRating}</p>
                <p>📊 متوسط التقدم: ${avgProgress}%</p>
                <p>📄 إجمالي الصفحات المقروءة: ${totalPagesRead}</p>
                <p>🔄 إجمالي مرات القراءة: ${totalReadCount}</p>
                <p>🕒 إجمالي وقت القراءة: ${formatTime(totalReadingTime)}</p>
                <p>توزيع التصنيفات:</p>
                <ul>${catStats}</ul>
            `;
        }
    };
}

// ====================== مشغل PDF ======================
let pdfDoc = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumIsPending = null,
    scale = 1.5,
    rotation = 0,
    autoScrollIdx = null,
    doublePageMode = false,
    drawMode = false,
    isErasing = false,
    drawColor = '#ff0000',
    drawWidth = 5,
    drawingData = {};

const canvasLeft = document.getElementById('canvas-left'),
      ctxLeft = canvasLeft.getContext('2d'),
      canvasRight = document.getElementById('canvas-right'),
      ctxRight = canvasRight.getContext('2d'),
      drawOverlay = document.getElementById('draw-overlay'),
      drawCtx = drawOverlay.getContext('2d');

function openReader(url, title) {
    document.getElementById('pdfModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    readingStartTime = Date.now();
    pdfjsLib.getDocument(url).promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        document.getElementById('total-pages').innerText = pdfDoc.numPages;
        drawingData = {};
        renderPage(pageNum);
    });
}

async function renderPage(num) {
    if (pageIsRendering) {
        pageNumIsPending = num;
        return;
    }
    pageIsRendering = true;

    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale, rotation });
    canvasLeft.height = viewport.height;
    canvasLeft.width = viewport.width;
    await page.render({ canvasContext: ctxLeft, viewport }).promise;

    if (doublePageMode && num < pdfDoc.numPages) {
        const nextPage = await pdfDoc.getPage(num + 1);
        const nextViewport = nextPage.getViewport({ scale, rotation });
        canvasRight.height = nextViewport.height;
        canvasRight.width = nextViewport.width;
        canvasRight.style.display = 'block';
        await nextPage.render({ canvasContext: ctxRight, viewport: nextViewport }).promise;
    } else {
        canvasRight.style.display = 'none';
    }

    const wrapper = document.getElementById('canvas-wrapper');
    drawOverlay.width = doublePageMode ? canvasLeft.width + canvasRight.width : canvasLeft.width;
    drawOverlay.height = canvasLeft.height;
    drawOverlay.style.width = drawOverlay.width + 'px';
    drawOverlay.style.height = drawOverlay.height + 'px';

    drawCtx.clearRect(0, 0, drawOverlay.width, drawOverlay.height);
    if (drawingData[num]) {
        const img = new Image();
        img.src = drawingData[num];
        img.onload = () => drawCtx.drawImage(img, 0, 0);
    }
    if (doublePageMode && drawingData[num + 1]) {
        const img = new Image();
        img.src = drawingData[num + 1];
        img.onload = () => drawCtx.drawImage(img, canvasLeft.width, 0);
    }

    pageIsRendering = false;
    if (pageNumIsPending !== null) {
        renderPage(pageNumIsPending);
        pageNumIsPending = null;
    }
    document.getElementById('page-num-input').value = num;
}

document.getElementById('prev-pg').onclick = () => { 
    if (pageNum <= 1) return; 
    pageNum -= doublePageMode ? 2 : 1; 
    renderPage(pageNum); 
    updateBookProgress(currentBookId, pageNum, pdfDoc.numPages);
};
document.getElementById('next-pg').onclick = () => { 
    if (pageNum >= pdfDoc.numPages - (doublePageMode ? 1 : 0)) return; 
    pageNum += doublePageMode ? 2 : 1; 
    renderPage(pageNum); 
    updateBookProgress(currentBookId, pageNum, pdfDoc.numPages);
};

document.getElementById('z-in').onclick = () => { scale += 0.2; renderPage(pageNum); updateZoomLabel(); };
document.getElementById('z-out').onclick = () => { if(scale <= 0.5) return; scale -= 0.2; renderPage(pageNum); updateZoomLabel(); };
function updateZoomLabel() { document.getElementById('zoom-percent').innerText = `${Math.round(scale * 100)}%`; }

document.getElementById('rotate-pdf').onclick = () => { rotation = (rotation + 90) % 360; renderPage(pageNum); };

document.getElementById('full-scr').onclick = () => {
    let elem = document.getElementById('pdfModal');
    if (!document.fullscreenElement) elem.requestFullscreen();
    else document.exitFullscreen();
};

let themes = ['', 'mode-sepia', 'mode-dark'];
let currentTheme = 0;
document.getElementById('reader-theme').onclick = () => {
    currentTheme = (currentTheme + 1) % themes.length;
    document.getElementById('viewer-viewport').className = 'custom-scroll ' + themes[currentTheme];
};

document.getElementById('auto-scroll-toggle').onclick = function() {
    if(autoScrollIdx) {
        clearInterval(autoScrollIdx); autoScrollIdx = null;
        this.innerText = "🖱️ تمرير تلقائي";
    } else {
        this.innerText = "🛑 إيقاف";
        autoScrollIdx = setInterval(() => {
            document.getElementById('viewer-viewport').scrollTop += 1;
        }, 30);
    }
};

function closeReader() {
    const readingDuration = Date.now() - readingStartTime;
    updateReadingTime(currentBookId, readingDuration);
    updateBookProgress(currentBookId, pageNum, pdfDoc.numPages);
    document.getElementById('pdfModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    if(autoScrollIdx) clearInterval(autoScrollIdx);
    drawMode = false;
    document.getElementById('draw-tools').style.display = 'none';
    drawOverlay.removeEventListener('mousedown', startDrawing);
    drawOverlay.removeEventListener('mousemove', draw);
    drawOverlay.removeEventListener('mouseup', stopDrawing);
    drawOverlay.removeEventListener('mouseout', stopDrawing);
    currentBookId = null;
    readingStartTime = null;
}

document.getElementById('page-num-input').onchange = function() {
    let val = parseInt(this.value);
    if(val > 0 && val <= pdfDoc.numPages) { 
        pageNum = val; 
        renderPage(pageNum); 
        updateBookProgress(currentBookId, pageNum, pdfDoc.numPages);
    }
};

window.addEventListener('keydown', (e) => {
    if(document.getElementById('pdfModal').style.display === 'block') {
        if(e.key === 'ArrowRight') document.getElementById('next-pg').click();
        if(e.key === 'ArrowLeft') document.getElementById('prev-pg').click();
        if(e.key === '+') document.getElementById('z-in').click();
        if(e.key === '-') document.getElementById('z-out').click();
        if(e.key === 'Escape') closeReader();
    }
});

document.getElementById('reader-download').onclick = () => {
    if (currentPdfUrl) {
        const a = document.createElement('a');
        a.href = currentPdfUrl;
        a.download = document.getElementById('reader-filename').innerText + '.pdf';
        a.click();
    } else {
        showToast("❌ خطأ في التحميل");
    }
};

document.getElementById('double-page-toggle').onclick = () => {
    doublePageMode = !doublePageMode;
    renderPage(pageNum);
};

document.getElementById('draw-toggle').onclick = () => {
    drawMode = !drawMode;
    const tools = document.getElementById('draw-tools');
    tools.style.display = drawMode ? 'flex' : 'none';
    if (drawMode) {
        drawColor = document.getElementById('draw-color').value;
        drawWidth = document.getElementById('draw-width').value;
        drawOverlay.addEventListener('mousedown', startDrawing);
        drawOverlay.addEventListener('mousemove', draw);
        drawOverlay.addEventListener('mouseup', stopDrawing);
        drawOverlay.addEventListener('mouseout', stopDrawing);
    } else {
        drawOverlay.removeEventListener('mousedown', startDrawing);
        drawOverlay.removeEventListener('mousemove', draw);
        drawOverlay.removeEventListener('mouseup', stopDrawing);
        drawOverlay.removeEventListener('mouseout', stopDrawing);
    }
};

document.getElementById('draw-color').onchange = (e) => { drawColor = e.target.value; isErasing = false; };
document.getElementById('draw-width').onchange = (e) => { drawWidth = e.target.value; };
document.getElementById('draw-eraser').onclick = () => { isErasing = true; };
document.getElementById('draw-clear').onclick = () => { 
    drawCtx.clearRect(0, 0, drawOverlay.width, drawOverlay.height); 
    delete drawingData[pageNum];
    if (doublePageMode) delete drawingData[pageNum + 1];
};

let drawing = false;
let lastX = 0, lastY = 0;

function startDrawing(e) {
    drawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function draw(e) {
    if (!drawing) return;
    drawCtx.beginPath();
    drawCtx.moveTo(lastX, lastY);
    drawCtx.lineTo(e.offsetX, e.offsetY);
    drawCtx.strokeStyle = isErasing ? '#ffffff' : drawColor;
    drawCtx.lineWidth = isErasing ? 20 : drawWidth;
    drawCtx.lineCap = 'round';
    drawCtx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
    if (drawing) {
        drawing = false;
        drawingData[pageNum] = drawOverlay.toDataURL();
        if (doublePageMode) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasRight.width;
            tempCanvas.height = canvasRight.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(drawOverlay, canvasLeft.width, 0, canvasRight.width, canvasRight.height, 0, 0, canvasRight.width, canvasRight.height);
            drawingData[pageNum + 1] = tempCanvas.toDataURL();
        }
    }
}

// ====================== دالة تشغيل الصوت (مع دعم الكتم والصوت المختار) ======================
function playAudio(type) {
    if (isMuted) return;
    let url = sounds[type];
    if (type === 'engine') {
        url = sounds[selectedLoginSound];
    }
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio blocked"));
}

// ====================== إخفاء شاشة البداية بعد 3 ثوان ======================
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('hide-splash');
            document.body.style.overflow = 'auto';
        }
    }, 3000);
});
