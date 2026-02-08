const API_KEY = 'SelfFrrl';
const API_BASE_URL = 'https://api.neoxr.eu/api';

// DOM Elements
const platformBtns = document.querySelectorAll('.platform-btn');
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
let currentData = null;

// Platform Selection
platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        platformBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPlatform = btn.dataset.platform;
    });
});

// Paste Button
pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        urlInput.value = text;
        urlInput.focus();
    } catch (err) {
        console.error('Gagal paste:', err);
        // Fallback: focus input untuk manual paste
        urlInput.focus();
    }
});

// Download Button
downloadBtn.addEventListener('click', handleDownload);

// Enter key support
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleDownload();
    }
});

async function handleDownload() {
    const url = urlInput.value.trim();
    
    if (!url) {
        alert('Masukkan URL video terlebih dahulu!');
        return;
    }
    
    if (!isValidUrl(url)) {
        alert('URL tidak valid! Pastikan URL lengkap dengan https://');
        return;
    }
    
    // Show loading
    loadingEl.style.display = 'block';
    resultSection.style.display = 'none';
    
    try {
        const endpoint = getApiEndpoint(currentPlatform);
        const apiUrl = `${API_BASE_URL}/${endpoint}?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        loadingEl.style.display = 'none';
        
        if (data.status && data.data) {
            currentData = data.data;
            displayResult(data.data);
        } else {
            alert('Gagal mengambil data. Pastikan URL benar dan platform didukung.');
        }
    } catch (error) {
        loadingEl.style.display = 'none';
        console.error('Error:', error);
        alert('Terjadi kesalahan. Periksa koneksi internet Anda.');
    }
}

function getApiEndpoint(platform) {
    const endpoints = {
        'tiktok': 'tiktok',
        'instagram': 'ig',
        'youtube': 'yt',
        'facebook': 'fb'
    };
    return endpoints[platform] || 'tiktok';
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function displayResult(data) {
    resultSection.style.display = 'block';
    
    const tiktokCard = document.getElementById('tiktok-card');
    const regularPreview = document.getElementById('regular-preview');
    
    // Handle TikTok specific data structure
    if (currentPlatform === 'tiktok') {
        // Show TikTok card, hide regular preview
        tiktokCard.style.display = 'block';
        regularPreview.style.display = 'none';
        
        // User Info
        const avatar = document.getElementById('tiktok-avatar');
        const username = document.getElementById('tiktok-username');
        const nickname = document.getElementById('tiktok-nickname');
        
        avatar.src = data.author?.avatarThumb || data.author?.avatarMedium || '';
        username.textContent = data.author?.nickname || 'Unknown User';
        nickname.textContent = '@' + (data.author?.uniqueId || 'unknown');
        
        // Video Player
        const videoPlayer = document.getElementById('tiktok-video-player');
        const videoOverlay = document.getElementById('video-overlay');
        const playBtn = document.getElementById('play-btn');
        
        // Set video source - prioritize no watermark
        if (data.video) {
            videoPlayer.src = data.video;
        } else if (data.videoWM) {
            videoPlayer.src = data.videoWM;
        }
        
        // Play button handler
        playBtn.addEventListener('click', () => {
            videoPlayer.play();
            videoOverlay.classList.add('hidden');
        });
        
        videoOverlay.addEventListener('click', () => {
            videoPlayer.play();
            videoOverlay.classList.add('hidden');
        });
        
        videoPlayer.addEventListener('play', () => {
            videoOverlay.classList.add('hidden');
        });
        
        videoPlayer.addEventListener('pause', () => {
            videoOverlay.classList.remove('hidden');
        });
        
        // Caption
        const captionText = document.getElementById('tiktok-caption-text');
        captionText.textContent = data.caption || data.title || 'No caption';
        
        // Statistics
        const likes = document.getElementById('tiktok-likes');
        const comments = document.getElementById('tiktok-comments');
        const views = document.getElementById('tiktok-views');
        const shares = document.getElementById('tiktok-shares');
        const saved = document.getElementById('tiktok-saved');
        
        likes.textContent = data.statistic?.likes ? formatNumber(data.statistic.likes) : '0';
        comments.textContent = data.statistic?.comments ? formatNumber(data.statistic.comments) : '0';
        views.textContent = data.statistic?.views ? formatNumber(data.statistic.views) : '0';
        shares.textContent = data.statistic?.shares ? formatNumber(data.statistic.shares) : '0';
        saved.textContent = data.statistic?.saved ? formatNumber(parseInt(data.statistic.saved)) : '0';
        
        // Published Date
        const publishedDate = document.getElementById('tiktok-date');
        if (data.published) {
            const date = new Date(parseInt(data.published) * 1000);
            publishedDate.textContent = formatDate(date);
        }
        
        // Music Info
        const musicSection = document.getElementById('tiktok-music');
        const musicTitle = document.getElementById('tiktok-music-title');
        
        if (data.music && data.music.title) {
            musicSection.style.display = 'flex';
            let musicText = data.music.title;
            if (data.music.author && data.music.author !== data.music.title) {
                musicText += ' - ' + data.music.author;
            }
            if (data.music.duration) {
                musicText += ' (' + data.music.duration + 's)';
            }
            musicTitle.textContent = musicText;
        } else {
            musicSection.style.display = 'none';
        }
        
    } else {
        // Show regular preview, hide TikTok card
        tiktokCard.style.display = 'none';
        regularPreview.style.display = 'flex';
        
        // For other platforms
        if (data.thumbnail) {
            previewThumb.src = data.thumbnail;
        } else {
            previewThumb.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2290%22%3E%3Crect fill=%22%23333%22 width=%22120%22 height=%2290%22/%3E%3C/svg%3E';
        }
        previewTitle.textContent = data.title || 'Video';
        previewAuthor.textContent = data.author || 'Unknown';
        previewDuration.textContent = data.duration || '';
        previewViews.textContent = data.views ? formatViews(data.views) : '';
    }
    
    // Display download options
    displayDownloadOptions(data);
}

function displayDownloadOptions(data) {
    downloadOptions.innerHTML = '';
    
    // TikTok specific options
    if (currentPlatform === 'tiktok') {
        // Video No Watermark
        if (data.video) {
            const option = createDownloadOptionSimple({
                url: data.video,
                type: 'Video HD',
                desc: 'No Watermark',
                icon: 'video'
            });
            downloadOptions.appendChild(option);
        }
        
        // Video With Watermark
        if (data.videoWM) {
            const option = createDownloadOptionSimple({
                url: data.videoWM,
                type: 'Video HD',
                desc: 'With Watermark',
                icon: 'video'
            });
            downloadOptions.appendChild(option);
        }
        
        // Audio MP3
        if (data.audio && data.audio !== 'https://snaptikpro.net/' && data.audio !== '') {
            const option = createDownloadOptionSimple({
                url: data.audio,
                type: 'Audio MP3',
                desc: data.music?.title || 'Original Sound',
                icon: 'audio'
            });
            downloadOptions.appendChild(option);
        } else if (data.music && data.music.title) {
            // Jika audio URL tidak tersedia, tampilkan info tapi disable button
            const option = createDownloadOptionSimple({
                url: '#',
                type: 'Audio MP3',
                desc: data.music.title + ' (Tidak tersedia)',
                icon: 'audio',
                disabled: true
            });
            downloadOptions.appendChild(option);
        }
    } else {
        // For other platforms (array or single object)
        const items = Array.isArray(data) ? data : [data];
        items.forEach((item, index) => {
            const option = createDownloadOption(item, index);
            downloadOptions.appendChild(option);
        });
    }
}

function createDownloadOption(item, index) {
    const div = document.createElement('div');
    div.className = 'download-option';
    
    const type = item.type || 'mp4';
    const quality = item.quality || getQualityFromType(type);
    const size = item.size || 'Unknown';
    
    div.innerHTML = `
        <div class="option-info">
            <div class="option-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${type.includes('mp4') || type.includes('video') ? 
                        '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>' :
                        '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'
                    }
                </svg>
            </div>
            <div class="option-text">
                <h4>${quality}</h4>
                <p>${type.toUpperCase()} ${size !== 'Unknown' ? '• ' + size : ''}</p>
            </div>
        </div>
        <button class="option-download-btn" onclick="downloadFile('${item.url}', '${quality}')">
            Unduh
        </button>
    `;
    
    return div;
}

function createDownloadOptionSimple(options) {
    const div = document.createElement('div');
    div.className = 'download-option';
    if (options.disabled) {
        div.classList.add('disabled');
    }
    
    const iconSvg = options.icon === 'audio' ? 
        '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' :
        '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>';
    
    const buttonHtml = options.disabled ? 
        `<button class="option-download-btn" disabled style="opacity: 0.5; cursor: not-allowed;">Tidak Tersedia</button>` :
        `<button class="option-download-btn" onclick="downloadFile('${options.url}', '${options.type.replace(/ /g, '_')}')">Unduh</button>`;
    
    div.innerHTML = `
        <div class="option-info">
            <div class="option-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${iconSvg}
                </svg>
            </div>
            <div class="option-text">
                <h4>${options.type}</h4>
                <p>${options.desc}</p>
            </div>
        </div>
        ${buttonHtml}
    `;
    
    return div;
}

function getQualityFromType(type) {
    if (type.includes('1080')) return 'Full HD 1080p';
    if (type.includes('720')) return 'HD 720p';
    if (type.includes('480')) return 'SD 480p';
    if (type.includes('360')) return 'SD 360p';
    if (type.includes('mp3') || type.includes('audio')) return 'Audio MP3';
    return 'Video';
}

function downloadFile(url, quality) {
    // Create temporary link to trigger download
    const a = document.createElement('a');
    a.href = url;
    
    // Determine file extension based on quality/type
    let extension = '.mp4';
    if (quality.includes('Audio') || quality.includes('MP3')) {
        extension = '.mp3';
    }
    
    a.download = `NullHub_${quality}_${Date.now()}${extension}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Show notification
    showNotification('Download dimulai! Periksa folder download Anda.');
}

function formatViews(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M views';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K views';
    }
    return views + ' views';
}

function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) {
        return diffMinutes + ' menit yang lalu';
    } else if (diffHours < 24) {
        return diffHours + ' jam yang lalu';
    } else if (diffDays < 7) {
        return diffDays + ' hari yang lalu';
    } else if (diffDays < 30) {
        return Math.floor(diffDays / 7) + ' minggu yang lalu';
    } else {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
    }
}

function showNotification(message) {
    // Simple notification (bisa diganti dengan toast library)
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animation for notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    @keyframes slideDown {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('🚀 NullHub Loaded!');
