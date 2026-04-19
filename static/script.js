function chooseFile() {
    document.getElementById("fileInput").click();
}

let selectedFile = null;

function previewImage(event) {
    selectedFile = event.target.files[0];

    let preview = document.getElementById("preview");
    let uploadText = document.getElementById("uploadText");

    preview.src = URL.createObjectURL(selectedFile);

    preview.classList.remove("hidden");
    uploadText.classList.add("hidden");
}

async function analyze() {
    if (!selectedFile) {
        alert("Please upload an image first!");
        return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    const res = await fetch("/predict", {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    document.getElementById("resultCard").classList.remove("hidden");
    document.getElementById("resultTitle").innerText =
        "Prediction Result : " + data.predicted;


    const probBlock = document.getElementById("probBlock");
    probBlock.innerHTML = "";

    for (const [cls, prob] of Object.entries(data.probabilities)) {
        const p = document.createElement("p");
        p.innerText = `${cls}: ${(prob * 100).toFixed(1)}%`;
        probBlock.appendChild(p);
    }
}

function toggleProb() {
    const wrapper = document.getElementById("probWrapper");
    const btn = document.querySelector(".toggle-btn");

    if (wrapper.classList.contains("hidden")) {
        wrapper.classList.remove("hidden");
        btn.innerText = "Hide Possibilities ▲";
    } else {
        wrapper.classList.add("hidden");
        btn.innerText = "Show Possibilities ▼";
    }
}

function showResult() {
    document.getElementById('upload-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'flex';
}

function showUpload() {
    document.getElementById('result-card').style.display = 'none';
    document.getElementById('upload-card').style.display = 'flex';
}
function openHistoryDetail() {
    document.getElementById('history-modal').style.display = 'flex';
}

function closeHistoryDetail() {
    document.getElementById('history-modal').style.display = 'none';
}

// --- ส่วนที่เพิ่มใหม่: ฟังก์ชันลูกกระตา (Toggle Password) ---
document.addEventListener('DOMContentLoaded', function () {
    const togglePassword = document.querySelector('#togglePassword');
    const passwordField = document.querySelector('#password');
    const eyeIcon = document.querySelector('#eyeIcon');

    // ตรวจสอบก่อนว่าหน้าจอนี้มีปุ่มลูกกระตาไหม (ป้องกัน Error ในหน้าที่มีไม่มีฟอร์ม)
    if (togglePassword && passwordField) {
        togglePassword.addEventListener('click', function () {
            // 1. สลับ type ระหว่าง password และ text
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);

            // 2. เปลี่ยนสีไอคอน
            this.style.color = type === 'text' ? '#2563eb' : '#9ca3af';

            // 3. เปลี่ยนรูปไอคอน SVG (สลับระหว่างตาปกติ กับ ตาที่มีขีดฆ่า)
            if (type === 'text') {
                eyeIcon.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                `;
            } else {
                eyeIcon.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                `;
            }
        });
    }
});