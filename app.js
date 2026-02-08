const API_KEY = 'SelfFrrl';
const API_BASE_URL = 'https://api.neoxr.eu/api';

// DOM Elements
const urlInput = document.getElementById('url-input');
const pasteBtn = document.getElementById('paste-btn');
const downloadBtn = document.getElementById('download-btn');
const loadingEl = document.getElementById('loading');
const resultSection = document.getElementById('result-section');
const previewThumb = document.getElementById('preview-thumb');
const previewTitle = document.getElementById('preview-title');
const previewAuthor = document.getElementById('preview-author');
const previewDuration = document.getElementById('preview-duration');
const previewViews = document.getElementById('preview-views');
const downloadOptions = document.getElementById('download-options');

let currentPlatform = 'tiktok';

// Paste Button
pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        urlInput.value = text;
    } catch (err) {
        urlInput.focus();
    }
});

// Download Action
downloadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) return showToast('Masukkan URL terlebih dahulu!');

    // Reset UI
    loadingEl.style.display = 'block';
    resultSection.style.display = 'none';
    downloadBtn.disabled = true;

    try {
        const apiUrl = `${API_BASE_URL}/${currentPlatform}?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;
        const response = await fetch(apiUrl);
        const res = await response.json();

        if (res.status && res.data) {
            renderResult(res.data);
        } else {
            showToast('Gagal mendapatkan data. Pastikan link benar.');
        }
    } catch (error) {
        showToast('Terjadi kesalahan koneksi.');
    } finally {
        loadingEl.style.display = 'none';
        downloadBtn.disabled = false;
    }
});

function renderResult(data) {
    resultSection.style.display = 'block';
    
    // Set Preview Data
    // Gunakan avatar sebagai thumbnail jika tidak ada cover video langsung
    previewThumb.src = data.author?.avatarMedium || 'https://via.placeholder.com/150';
    previewTitle.textContent = data.caption || 'TikTok Video';
    previewAuthor.textContent = `@${data.author?.uniqueId || 'user'}`;
    previewDuration.textContent = data.music?.duration ? data.music.duration + ' detik' : '';
    previewViews.textContent = data.statistic?.views ? parseInt(data.statistic.views).toLocaleString() + ' views' : '';

    // Clear Previous Options
    downloadOptions.innerHTML = '';

    // 1. Video No Watermark
    if (data.video) {
        addDownloadButton(data.video, 'Video (No Watermark)', 'MP4');
    }

    // 2. Video With Watermark
    if (data.videoWM) {
        addDownloadButton(data.videoWM, 'Video (Watermark)', 'MP4');
    }

    // 3. Audio Only
    if (data.audio) {
        addDownloadButton(data.audio, 'Audio (Music)', 'MP3');
    }
}

function addDownloadButton(link, label, type) {
    const div = document.createElement('div');
    div.className = 'download-option';
    div.innerHTML = `
        <div class="option-info">
            <div class="option-text">
                <h4>${label}</h4>
                <p>${type}</p>
            </div>
        </div>
        <button class="option-download-btn" onclick="window.open('${link}', '_blank')">Unduh</button>
    `;
    downloadOptions.appendChild(div);
}

function showToast(message) {
    alert(message); // Gunakan alert sederhana atau ganti dengan toast custom
}
