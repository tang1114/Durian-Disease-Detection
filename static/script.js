let selectedFile = null;
let globalFiles = []; // ใช้ตัวนี้เป็นตัวหลักในการเก็บไฟล์ เพื่อให้ลบทีละรูปด้วยปุ่ม X ได้

// ฟังก์ชันสร้าง Pop-up Alert สวยๆ แทน window.alert()
function showCustomAlert(message) {
    const overlay = document.createElement("div");
    overlay.className = "custom-alert-overlay";
    
    overlay.innerHTML = `
        <div class="custom-alert-box">
            <p>${message}</p>
            <button class="custom-alert-btn" onclick="this.closest('.custom-alert-overlay').remove()">ตกลง</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// ฟังก์ชันสำหรับกดปุ่ม Upload แล้วไปเรียก input file ที่ซ่อนอยู่
function chooseFile() {
    document.getElementById("fileInput").click();
}

// ฟังก์ชันสำหรับแสดงรูปตัวอย่าง (ดัดแปลงให้เก็บลง globalFiles)
function previewImage(event) {
    const files = event.target.files;

    if (globalFiles.length + files.length > 10) {
        showCustomAlert("อัปโหลดได้สูงสุด 10 รูปต่อครั้ง<br>");
        document.getElementById('fileInput').value = ''; 
        return;
    }

    // นำไฟล์เข้า Array
    for (let i = 0; i < files.length; i++) {
        globalFiles.push(files[i]);
    }

    document.getElementById('fileInput').value = ''; // เคลียร์ค่า input
    renderPreview(); // เรียกฟังก์ชันวาดรูป
}

// ฟังก์ชันสำหรับวาดรูปพรีวิวพร้อมปุ่ม X (ลบรูป)
function renderPreview() {
    const container = document.getElementById("previewContainer");
    const uploadText = document.getElementById("uploadText");
    container.innerHTML = "";

    if (globalFiles.length > 0) {
        uploadText.style.display = "none";
    } else {
        uploadText.style.display = "block";
        uploadText.innerText = 'No images selected';
    }

    globalFiles.forEach((file, index) => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("preview-item");
        wrapper.style.position = "relative"; // ให้ปุ่ม X ลอยอิงกับกล่องนี้

        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.classList.add("preview-img"); 

        const name = document.createElement("p");
        name.innerText = file.name;
        name.classList.add("preview-name"); 

        // สร้างปุ่ม X
        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = "✖";
        removeBtn.style.position = "absolute";
        removeBtn.style.top = "-5px";
        removeBtn.style.right = "-5px";
        removeBtn.style.background = "#ef4444"; 
        removeBtn.style.color = "white";
        removeBtn.style.border = "none";
        removeBtn.style.borderRadius = "50%";
        removeBtn.style.width = "20px";
        removeBtn.style.height = "20px";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.fontSize = "10px";
        removeBtn.style.display = "flex";
        removeBtn.style.alignItems = "center";
        removeBtn.style.justifyContent = "center";
        
        removeBtn.onclick = function(e) {
            e.preventDefault(); 
            globalFiles.splice(index, 1); // ลบไฟล์ออกจาก Array
            renderPreview(); // วาดพรีวิวใหม่
        };

        wrapper.appendChild(img);
        wrapper.appendChild(name);
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    });
}

// ฟังก์ชันสำหรับส่งภาพไปวิเคราะห์
async function startAnalysis() {
    const startBtn = document.getElementById('start-btn');
    
    // เปลี่ยนมาเช็คจำนวนจาก globalFiles แทน
    if (globalFiles.length === 0) {
        showCustomAlert("กรุณาอัปโหลดรูปภาพก่อนเริ่มการวิเคราะห์ครับ!"); 
        return;
    }

    const formData = new FormData();
    // ดึงไฟล์จาก globalFiles ส่งไป
    for (let i = 0; i < globalFiles.length; i++) {
        formData.append("files", globalFiles[i]);
    }

    // --- สร้าง Progress Pop-up Modal ---
    let progressOverlay = document.getElementById('progress-overlay');
    if (!progressOverlay) {
        progressOverlay = document.createElement('div');
        progressOverlay.id = 'progress-overlay';
        progressOverlay.className = 'loading-overlay';
        progressOverlay.innerHTML = `
            <div class="loading-modal">
                <div class="loading-spinner"></div>
                <p class="loading-text">กำลังวิเคราะห์ข้อมูล... <span id="progress-text">0%</span></p>
                <div class="progress-track">
                    <div id="progress-bar" class="progress-fill"></div>
                </div>
            </div>
        `;
        document.body.appendChild(progressOverlay);
    }
    progressOverlay.style.display = 'flex';
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    let progressValue = 0;
    progressBar.style.width = '0%';

    // จำลองให้หลอดค่อยๆ วิ่งไปถึง 90%
    const progressInterval = setInterval(() => {
        if (progressValue < 90) {
            progressValue += Math.floor(Math.random() * 5) + 1;
            if(progressValue > 90) progressValue = 90;
            progressBar.style.width = progressValue + '%';
            progressText.innerText = progressValue + '%';
        }
    }, 300);

    startBtn.innerText = "Analyzing...";
    startBtn.disabled = true;
    startBtn.classList.add("opacity-50");

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();

        if (data.status === "success") {
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressText.innerText = '100%';

            setTimeout(() => {
                globalFiles = []; // เคลียร์ไฟล์ทิ้งหลังวิเคราะห์เสร็จ
                renderPreview(); 

                renderResults(data.results);
                showResult(); 
                progressOverlay.style.display = 'none'; 
            }, 800);

        } else {
            clearInterval(progressInterval);
            progressOverlay.style.display = 'none';
            showCustomAlert("Error: " + data.message);
        }
    } catch (error) {
        console.error("Error during analysis:", error);
        clearInterval(progressInterval);
        progressOverlay.style.display = 'none';
        showCustomAlert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
        startBtn.innerText = "Start Analysis";
        startBtn.disabled = false;
        startBtn.classList.remove("opacity-50");
    }
}

// ฟังก์ชันสำหรับเอาข้อมูลที่ได้มาวาดเป็นการ์ด
function renderResults(results) {
    const container = document.getElementById('result-list-container');
    container.innerHTML = ''; 

    results.forEach(item => {
        const confidencePercent = Math.round(item.confidence * 100);
        
        //  เอา "_" ออกจากชื่อโรค
        const cleanPredictionName = item.prediction.replace(/_/g, ' ');

        //  กำหนดสีให้ความรุนแรง
        let severityColor = "";
        if (item.severity === "Safe") {
            severityColor = "#4ade80"; // สีเขียว
        } else if (item.severity === "Medium") {
            severityColor = "#fbbf24"; // สีเหลือง
        } else {
            severityColor = "#f87171"; // สีแดง
        }

        const html = `
            <div class="result-item-card">
                <img src="${item.image_url}" class="result-img" alt="Leaf Result">
                <div class="result-details">
                    <h4>${cleanPredictionName}</h4>
                    <p>
                        ความมั่นใจ : <span class="conf-high">${confidencePercent} %</span> &nbsp;&nbsp; 
                        ความรุนแรง : <span class="severity-high" style="color: ${severityColor};">${item.severity}</span>
                    </p>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// ฟังก์ชันลบรูปทั้งหมด (อัปเดตให้เคลียร์ globalFiles ด้วย)
function clearUploads() {
    document.getElementById('fileInput').value = '';
    document.getElementById('previewContainer').innerHTML = '';
    document.getElementById('uploadText').style.display = "block";
    document.getElementById('uploadText').innerText = 'No images selected';
    selectedFile = null;
    globalFiles = []; // เคลียร์ Array หลัก
}

// ฟังก์ชันสลับการ์ด
function showResult() {
    const uploadCard = document.getElementById('upload-card');
    const resultCard = document.getElementById('result-card');
    if(uploadCard) uploadCard.style.display = 'none';
    if(resultCard) resultCard.style.display = 'block'; 
}

function showUpload() {
    const uploadCard = document.getElementById('upload-card');
    const resultCard = document.getElementById('result-card');
    if(resultCard) resultCard.style.display = 'none';
    if(uploadCard) uploadCard.style.display = 'block';
}

function toggleProb() {
    const wrapper = document.getElementById("probWrapper");
    const btn = document.querySelector(".toggle-btn");
    if (wrapper && btn) {
        if (wrapper.classList.contains("hidden")) {
            wrapper.classList.remove("hidden");
            btn.innerText = "Hide Possibilities ▲";
        } else {
            wrapper.classList.add("hidden");
            btn.innerText = "Show Possibilities ▼";
        }
    }
}

// ฟังก์ชันเปิด-ปิด Modal History
function openHistoryDetail(imageUrl, diseaseName, confidence, severity, date) {
    document.getElementById('modal-img').src = imageUrl;
    
    // 1. นำชื่อโรคมาแทนที่ _ ด้วยช่องว่าง
    let cleanDiseaseName = diseaseName.replace(/_/g, ' ');
    
    // 2. สร้าง Link ไปยังหน้า All Diseases พร้อมระบุ id ของการ์ดเป้าหมาย (#diseaseName)
    let modalTitle = document.getElementById('modal-title');
    modalTitle.innerHTML = `<a href="/all-diseases#${diseaseName}" class="disease-link" title="คลิกเพื่อดูข้อมูลโรคนี้">${cleanDiseaseName}</a>`;
    
    document.getElementById('modal-conf').textContent = confidence + ' %';
    document.getElementById('modal-severity').textContent = severity;
    document.getElementById('modal-date').textContent = 'วันที่ ( DATE ) ' + date;
    document.getElementById('history-modal').style.display = 'flex';
}

function closeHistoryDetail() {
    document.getElementById('history-modal').style.display = 'none';
}

// จัดการ Form Login และ Register
document.addEventListener('DOMContentLoaded', function () {
    const togglePassword = document.querySelector('#togglePassword');
    const passwordField = document.querySelector('#password');
    const eyeIcon = document.querySelector('#eyeIcon');
    const hamburger = document.getElementById('hamburger-menu');
    const navMenu = document.getElementById('nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    if (togglePassword && passwordField) {
        togglePassword.addEventListener('click', function () {
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            // เปลี่ยนเป็นการจัดการ Class แทน style ตรงๆ ในโปรเจกต์จริงจะดีกว่า แต่คงไว้แบบนี้ได้ถ้าไม่ได้เซ็ต CSS ไว้
            this.style.color = type === 'text' ? '#2563eb' : '#9ca3af'; 
            if (type === 'text') {
                eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />`;
            } else {
                eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943-9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
            }
        });
    }

    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault(); 
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok && result.status === 'success') {
                    window.location.href = '/diagnosis'; 
                } else {
                    showCustomAlert('Login Failed: ' + JSON.stringify(result));
                }
            } catch (error) {
                showCustomAlert('Cannot connect to server.');
            }
        });
    }

    const registerForm = document.querySelector('form[action="/register"]');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault(); 
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok && result.status === 'success') {
                    showCustomAlert('Registration Successful! Please login.');
                    setTimeout(() => { window.location.href = '/login'; }, 1500);
                } else {
                    showCustomAlert('Registration Failed: ' + result.message);
                }
            } catch (error) {
                showCustomAlert('Cannot connect to server.');
            }
        });
    }

    // ----------------------------------------------------
    // 2. ส่วนดักจับการคลิกเมนู สำหรับคนที่ยังไม่ได้ล็อกอิน (ของใหม่!)
    // ----------------------------------------------------
    // เช็คว่ามีปุ่ม Login อยู่บนหน้าเว็บไหม (ถ้ามี = ยังไม่ได้เข้าสู่ระบบ)
    const isLoggedOut = document.querySelector('.auth-buttons a[href="/login"]') !== null;

    if (isLoggedOut) {
        // ล็อคเป้าเมนู Diagnosis และ History
        const protectedLinks = document.querySelectorAll('.nav-links a[href="/diagnosis"], .nav-links a[href="/history"]');
        
        protectedLinks.forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault(); // เบรก! ห้ามเปลี่ยนหน้า
                
                // สั่งเปิด Pop-up ที่ซ่อนอยู่ใน HTML ให้แสดงขึ้นมา
                const alertBox = document.getElementById('require-login-alert');
                if(alertBox) {
                    alertBox.style.display = 'flex';
                }
            });
        });
    }

    const btnGetStarted = document.getElementById('btn-get-started');
    const emailInput = document.getElementById('emailInput');

    // เช็คว่ามีปุ่มและช่องกรอกนี้อยู่ในหน้าเว็บไหม (ถ้ามีแปลว่าอยู่หน้า index.html)
    if (btnGetStarted && emailInput) {
        btnGetStarted.addEventListener('click', function(event) {
            event.preventDefault(); // ป้องกันไม่ให้ <a> กระตุกไปหน้าบนสุด
            const email = emailInput.value.trim();
            
            if(email) {
                window.location.href = '/register?email=' + encodeURIComponent(email);
            } else {
                window.location.href = '/register';
            }
        });
    }

    // ==========================================
    // 2. ระบบรับ Email จาก URL มาหยอดในหน้า Register
    // ==========================================
    const registerEmailField = document.getElementById('email');

    // เช็คว่ามีช่อง id="email" ไหม (ถ้ามีแปลว่าอยู่หน้า register.html)
    if (registerEmailField) {
        const urlParams = new URLSearchParams(window.location.search);
        const prefillEmail = urlParams.get('email');
        
        if (prefillEmail) {
            registerEmailField.value = prefillEmail;
        }
    }

    formatDiseaseDescriptions();
});

// ==========================================
// ระบบ Advanced Filter & Sort สำหรับหน้า History
// ==========================================

// เปิด/ปิด แผง Filter
function toggleFilterPanel() {
    const panel = document.getElementById('filter-panel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}

function applyAllFilters() {
    // 1. ดึงค่าจาก Filter
    const diseaseFilter = document.getElementById('filter-disease').value;
    const severityFilter = document.getElementById('filter-severity').value;
    const sortBy = document.getElementById('sort-by').value;
    
    const startDateVal = document.getElementById('filter-start-date').value;
    const endDateVal = document.getElementById('filter-end-date').value;

    const startTs = startDateVal ? new Date(startDateVal).setHours(0, 0, 0, 0) : null;
    const endTs = endDateVal ? new Date(endDateVal).setHours(23, 59, 59, 999) : null;

    const cards = Array.from(document.querySelectorAll('.history-item'));

    cards.forEach(card => {
        const cardDisease = card.getAttribute('data-disease'); // ค่าจะเป็น Leaf_Algal, Leaf_Blight...
        const cardSeverity = card.getAttribute('data-severity'); // ค่าจะเป็น Safe, Low, Medium, High
        const cardTimestamp = parseInt(card.getAttribute('data-timestamp'));

        let isMatch = true;

        // กรองตาม Class
        if (diseaseFilter !== 'All' && cardDisease !== diseaseFilter) isMatch = false;

        // กรองตามความรุนแรง
        if (severityFilter !== 'All' && cardSeverity !== severityFilter) isMatch = false;

        // กรองตามวันที่
        if (startTs && cardTimestamp < startTs) isMatch = false;
        if (endTs && cardTimestamp > endTs) isMatch = false;

        card.style.display = isMatch ? '' : 'none';
    });

    // 2. ระบบการเรียงลำดับ (Sort)
    cards.sort((a, b) => {
        const tsA = parseInt(a.getAttribute('data-timestamp'));
        const tsB = parseInt(b.getAttribute('data-timestamp'));
        const confA = parseFloat(a.getAttribute('data-confidence'));
        const confB = parseFloat(b.getAttribute('data-confidence'));

        if (sortBy === 'Newest') return tsB - tsA;
        if (sortBy === 'Oldest') return tsA - tsB;
        if (sortBy === 'ConfHigh') return confB - confA;
        if (sortBy === 'ConfLow') return confA - confB;
        return 0;
    });

    // วางการ์ดกลับลงไปในหน้าเว็บ
    const container = document.querySelector('.result-list');
    if (container) {
        cards.forEach(card => container.appendChild(card));
    }
}

// ฟังก์ชันล้างค่า
function clearFilters() {
    document.getElementById('filter-disease').value = 'All';
    document.getElementById('filter-severity').value = 'All';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    document.getElementById('sort-by').value = 'Newest';
    applyAllFilters();
}

// ฟังก์ชันสำหรับปิด Pop-up (ถูกเรียกใช้เมื่อกดปุ่ม "ยกเลิก")
function closeLoginAlert() {
    const alertBox = document.getElementById('require-login-alert');
    if (alertBox) {
        alertBox.style.display = 'none'; // สั่งซ่อนกลับไปเหมือนเดิม
    }
}

function formatDiseaseDescriptions() {
    const descriptionBoxes = document.querySelectorAll('.raw-description');

    descriptionBoxes.forEach(box => {
        let rawText = box.textContent || box.innerText;
        if (!rawText || !rawText.trim()) return;

        // 1. แยกบรรทัด เพื่อเอา "ชื่อภาษาไทย" (บรรทัดแรกสุด) ออกมา
        let lines = rawText.trim().split('\n');
        let thaiName = lines[0].trim(); // ดึงบรรทัดแรกมา
        
        // 2. ลบบรรทัดแรกออกจากเนื้อหา เพื่อไม่ให้มันแสดงซ้ำด้านล่าง
        lines.shift(); 
        let remainingText = lines.join('\n').trim();

        // 3. เอาชื่อไทยไปต่อท้ายชื่ออังกฤษด้านบน
        let titleElement = box.closest('.disease-content').querySelector('.disease-title');
        // เช็คก่อนว่ายังไม่ได้ใส่ (ป้องกันการใส่ซ้ำเวลาสลับหน้า)
        if (!titleElement.querySelector('.thai-name')) {
            // เติมชื่อไทยเข้าไปใน h3 ตัวเดิม
            titleElement.innerHTML += ` <span class="thai-name" style="color: #cbd5e1; font-size: 1.3rem; font-weight: 400;">(${thaiName})</span>`;
        }

        // 4. จัด Format ข้อความที่เหลือ 
        // ใช้นิพจน์ปกติ (Regex) \s* เพื่อกินช่องว่างและการกด Enter ที่เกินมาหลังหัวข้อทิ้งไปให้หมด
        let formattedHtml = remainingText
            .replace(/อาการ \(Symptoms\):\s*/g, '<span class="desc-heading text-purple"> อาการ (Symptoms):</span>')
            .replace(/การป้องกัน \(Prevention\):\s*/g, '<span class="desc-heading text-green"> การป้องกัน (Prevention):</span>')
            .replace(/การรักษา \(Treatment\):\s*/g, '<span class="desc-heading text-blue"> การรักษา (Treatment):</span>');

        box.innerHTML = formattedHtml;
    });
}