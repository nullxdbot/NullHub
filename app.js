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
    
    // Handle TikTok, Instagram, AND Facebook with same card style
    if (currentPlatform === 'tiktok' || currentPlatform === 'instagram' || currentPlatform === 'facebook') {
        // Show TikTok card, hide regular preview
        tiktokCard.style.display = 'block';
        regularPreview.style.display = 'none';
        
        // User Info
        const avatar = document.getElementById('tiktok-avatar');
        const username = document.getElementById('tiktok-username');
        const nickname = document.getElementById('tiktok-nickname');
        
        if (currentPlatform === 'instagram') {
            // For Instagram, always use default values (no user data in JSON)
            avatar.src = 'img/Instagram_icon.webp';
            username.textContent = 'Instagram Post';
            nickname.textContent = ''; // No nickname for Instagram
        } else if (currentPlatform === 'facebook') {
            // For Facebook, use Facebook icon
            avatar.src = 'img/Facebook_icon.webp';
            username.textContent = 'Facebook Video';
            nickname.textContent = ''; // No nickname for Facebook
        } else {
            avatar.src = data.author?.avatarThumb || data.author?.avatar_thumb?.url_list?.[0] || data.author?.avatarMedium || data.author?.avatar_medium?.url_list?.[0] || '';
            username.textContent = data.author?.nickname || 'Unknown User';
            nickname.textContent = '@' + (data.author?.uniqueId || data.author?.unique_id || 'unknown');
        }
        
        // Video Player Container
        const videoContainer = document.querySelector('.tiktok-video-container');
        
        // Determine if photo or video
        let photoArray = null;
        let videoUrl = null;
        
        if (currentPlatform === 'instagram') {
            // Instagram returns array of objects: [{type: "jpg", url: "..."}, {type: "mp4", url: "..."}]
            const items = Array.isArray(data) ? data : [data];
            
            // Separate photos and videos
            const photoItems = items.filter(item => item.type && item.type !== 'mp4');
            const videoItems = items.filter(item => item.type === 'mp4');
            
            // Get photo URLs
            if (photoItems.length > 0) {
                photoArray = photoItems.map(item => item.url);
            }
            
            // Get first video URL if exists
            if (videoItems.length > 0) {
                videoUrl = videoItems[0].url;
            }
        } else if (currentPlatform === 'facebook') {
            // Facebook returns array of objects: [{quality: "HD", url: "..."}, {quality: "SD", url: "..."}]
            const items = Array.isArray(data) ? data : [data];
            
            // Facebook only has videos, get HD quality first
            const hdVideo = items.find(item => item.quality === 'HD');
            const sdVideo = items.find(item => item.quality === 'SD');
            
            videoUrl = hdVideo?.url || sdVideo?.url || items[0]?.url;
        } else {
            // TikTok structure
            photoArray = data.photo || data.images;
            videoUrl = data.video || data.videoWM;
        }
        
        // Check if this is a photo/slide post
        if (photoArray && photoArray.length > 0 && !videoUrl) {
            // Photo slider
            videoContainer.innerHTML = `
                <div class="tiktok-image-slider">
                    <div class="slider-container">
                        ${photoArray.map((img, index) => `
                            <div class="slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                                <img src="${img}" alt="Slide ${index + 1}" loading="lazy">
                            </div>
                        `).join('')}
                    </div>
                    ${photoArray.length > 1 ? `
                        <button class="slider-btn prev" onclick="changeSlide(-1)">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button class="slider-btn next" onclick="changeSlide(1)">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                        <div class="slider-dots">
                            ${photoArray.map((_, index) => `
                                <span class="dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
            currentSlideIndex = 0;
        } else if (videoUrl) {
            // Video player
            videoContainer.innerHTML = `
                <video id="tiktok-video-player" controls playsinline></video>
                <div class="video-overlay" id="video-overlay">
                    <button class="play-btn" id="play-btn">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                </div>
            `;
            
            const vp = document.getElementById('tiktok-video-player');
            const vo = document.getElementById('video-overlay');
            const pb = document.getElementById('play-btn');
            
            // Set video source
            vp.src = videoUrl;
            
            pb.addEventListener('click', () => {
                vp.play();
                vo.classList.add('hidden');
            });
            
            vp.addEventListener('play', () => {
                vo.classList.add('hidden');
            });
            
            vp.addEventListener('pause', () => {
                if (vp.currentTime === 0 || vp.ended) {
                    vo.classList.remove('hidden');
                }
            });
        }
        
        // Caption
        const captionEl = document.getElementById('tiktok-caption-text');
        if (currentPlatform === 'instagram') {
            captionEl.textContent = 'Instagram Post';
            captionEl.style.textAlign = 'center';
        } else if (currentPlatform === 'facebook') {
            captionEl.textContent = 'Facebook Video';
            captionEl.style.textAlign = 'center';
        } else {
            captionEl.textContent = data.description || data.title || 'No caption';
            captionEl.style.textAlign = 'left';
        }
        
        // Stats
        const statsSection = document.querySelector('.tiktok-stats');
        if (currentPlatform === 'instagram' || currentPlatform === 'facebook') {
            // Instagram & Facebook API don't provide stats, hide the section
            statsSection.style.display = 'none';
        } else {
            // TikTok has full stats, show the section
            statsSection.style.display = 'flex';
            document.getElementById('tiktok-likes').textContent = formatNumber(data.stats?.likes || data.stats?.diggCount || 0);
            document.getElementById('tiktok-comments').textContent = formatNumber(data.stats?.comments || data.stats?.commentCount || 0);
            document.getElementById('tiktok-views').textContent = formatNumber(data.stats?.views || data.stats?.playCount || 0);
            document.getElementById('tiktok-shares').textContent = formatNumber(data.stats?.shares || data.stats?.shareCount || 0);
            document.getElementById('tiktok-saved').textContent = formatNumber(data.stats?.saves || data.stats?.collectCount || 0);
        }
        
        // Published Date
        const dateEl = document.getElementById('tiktok-date');
        if (currentPlatform === 'instagram') {
            dateEl.textContent = 'Instagram Post';
        } else if (currentPlatform === 'facebook') {
            dateEl.textContent = 'Facebook Video';
        } else {
            const timestamp = data.createTime || data.create_time || data.createtime;
            if (timestamp) {
                const date = new Date(timestamp * 1000);
                dateEl.textContent = formatDate(date);
            } else {
                dateEl.textContent = 'Unknown';
            }
        }
        
        // Music Info
        const musicDiv = document.getElementById('tiktok-music');
        if (currentPlatform === 'tiktok' && data.music) {
            musicDiv.style.display = 'flex';
            document.getElementById('tiktok-music-title').textContent = data.music.title || data.music.play_url || 'Unknown';
        } else {
            musicDiv.style.display = 'none';
        }
        
        // Download Options
        displayDownloadOptions(data);
        
    } else {
        // Show regular preview for other platforms
        tiktokCard.style.display = 'none';
        regularPreview.style.display = 'flex';
        
        // Set thumbnail
        if (data.thumbnail || data.thumb) {
            previewThumb.src = data.thumbnail || data.thumb;
        }
        
        // Set title
        previewTitle.textContent = data.title || 'Video Title';
        
        // Set author
        previewAuthor.textContent = data.author?.name || data.channel || 'Unknown Author';
        
        // Set duration
        if (data.duration) {
            previewDuration.textContent = formatDuration(data.duration);
        }
        
        // Set views
        if (data.views) {
            previewViews.textContent = formatViews(data.views);
        }
        
        // Download Options
        displayDownloadOptions(data);
    }
}

function displayDownloadOptions(data) {
    downloadOptions.innerHTML = '';
    
    if (currentPlatform === 'tiktok') {
        // Video options
        if (data.video && data.video !== false) {
            const videoOption = createDownloadOption({
                type: 'Video HD',
                desc: 'Tanpa Watermark',
                url: data.video,
                icon: 'video'
            });
            downloadOptions.appendChild(videoOption);
        }
        
        if (data.videoWM && data.videoWM !== false) {
            const videoWMOption = createDownloadOption({
                type: 'Video HD',
                desc: 'With Watermark',
                url: data.videoWM,
                icon: 'video'
            });
            downloadOptions.appendChild(videoWMOption);
        }
        
        // Photo options
        const photoArray = data.photo || data.images;
        if (photoArray && Array.isArray(photoArray) && photoArray.length > 0) {
            // Individual photos
            photoArray.forEach((imgUrl, index) => {
                const photoOption = createDownloadOption({
                    type: `Foto ${index + 1}`,
                    desc: 'Gambar HD',
                    url: imgUrl,
                    icon: 'image'
                });
                downloadOptions.appendChild(photoOption);
            });
            
            // Download all button
            const downloadAllBtn = document.createElement('div');
            downloadAllBtn.className = 'download-option';
            downloadAllBtn.innerHTML = `
                <div class="option-info">
                    <div class="option-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </div>
                    <div class="option-text">
                        <h4>Semua Foto</h4>
                        <p>Download ${photoArray.length} gambar sekaligus</p>
                    </div>
                </div>
                <button class="option-download-btn" onclick="downloadAllImages()">
                    Unduh Semua
                </button>
            `;
            downloadOptions.appendChild(downloadAllBtn);
        }
        
        // Audio option
        if (data.music?.play_url) {
            const audioOption = createDownloadOption({
                type: 'Audio',
                desc: 'Background sound',
                url: data.music.play_url,
                icon: 'music'
            });
            downloadOptions.appendChild(audioOption);
        }
        
    } else if (currentPlatform === 'instagram') {
        // Instagram: simple array of {type, url}
        const items = Array.isArray(data) ? data : [data];
        
        items.forEach((item, index) => {
            if (item && item.url) {
                const isVideo = item.type === 'mp4';
                const type = isVideo ? 'Video' : 'Foto';
                const desc = isVideo ? 'Video HD' : 'Gambar HD';
                const icon = isVideo ? 'video' : 'image';
                
                const displayName = items.length > 1 ? `${type} ${index + 1}` : type;
                
                const option = createDownloadOption({
                    type: displayName,
                    desc: desc,
                    url: item.url,
                    icon: icon
                });
                downloadOptions.appendChild(option);
            }
        });
        
        // Add "Download All" button if multiple items
        if (items.length > 1) {
            const downloadAllBtn = document.createElement('div');
            downloadAllBtn.className = 'download-option';
            downloadAllBtn.innerHTML = `
                <div class="option-info">
                    <div class="option-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </div>
                    <div class="option-text">
                        <h4>Semua Item</h4>
                        <p>Download ${items.length} item sekaligus</p>
                    </div>
                </div>
                <button class="option-download-btn" onclick="downloadAllInstagram()">
                    Unduh Semua
                </button>
            `;
            downloadOptions.appendChild(downloadAllBtn);
        }
        
    } else if (currentPlatform === 'facebook') {
        // Facebook: array of {quality, url}
        const items = Array.isArray(data) ? data : [data];
        
        items.forEach((item, index) => {
            if (item && item.url) {
                const quality = item.quality || 'Video';
                const desc = quality === 'HD' ? 'High Quality' : quality === 'SD' ? 'Standard Quality' : 'Video';
                
                const option = createDownloadOption({
                    type: `Video ${quality}`,
                    desc: desc,
                    url: item.url,
                    icon: 'video'
                });
                downloadOptions.appendChild(option);
            }
        });
        
    } else if (currentPlatform === 'youtube') {
        // Video formats
        if (data.video) {
            const formats = ['1080p', '720p', '480p', '360p'];
            formats.forEach(quality => {
                if (data.video[quality]) {
                    const videoOption = createDownloadOption({
                        type: getQualityFromType(quality),
                        desc: 'Video MP4',
                        url: data.video[quality],
                        icon: 'video'
                    });
                    downloadOptions.appendChild(videoOption);
                }
            });
        }
        
        // Audio format
        if (data.audio) {
            const audioOption = createDownloadOption({
                type: 'Audio MP3',
                desc: 'Audio only',
                url: data.audio,
                icon: 'music'
            });
            downloadOptions.appendChild(audioOption);
        }
        
    }
}

function createDownloadOption(options) {
    const div = document.createElement('div');
    div.className = 'download-option';
    
    let iconSvg = '';
    if (options.icon === 'video') {
        iconSvg = '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>';
    } else if (options.icon === 'image') {
        iconSvg = '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>';
    } else if (options.icon === 'music') {
        iconSvg = '<path d="M9 18V5l12-2v13M9 18c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm12-2c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/>';
    }
    
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
        <button class="option-download-btn" onclick="downloadFile('${options.url}', '${options.type.replace(/ /g, '_')}')">
            Unduh
        </button>
    `;
    
    return div;
}

function downloadAllImages() {
    if (!currentData) {
        alert('Tidak ada gambar untuk diunduh');
        return;
    }
    
    const photoArray = currentData.photo || currentData.images;
    if (!photoArray || !Array.isArray(photoArray) || photoArray.length === 0) {
        alert('Tidak ada gambar untuk diunduh');
        return;
    }
    
    // Download each image with a small delay
    photoArray.forEach((imageUrl, index) => {
        setTimeout(() => {
            downloadFile(imageUrl, `TikTok_Photo_${index + 1}`);
        }, index * 500); // 500ms delay between downloads
    });
    
    showNotification(`Mengunduh ${photoArray.length} foto...`);
}

function downloadAllInstagram() {
    if (!currentData) {
        alert('Tidak ada item untuk diunduh');
        return;
    }
    
    const items = Array.isArray(currentData) ? currentData : [currentData];
    
    // Download each item with a small delay
    items.forEach((item, index) => {
        if (item && item.url) {
            setTimeout(() => {
                const ext = item.type === 'mp4' ? 'mp4' : 'jpg';
                const type = item.type === 'mp4' ? 'Video' : 'Photo';
                downloadFile(item.url, `Instagram_${type}_${index + 1}.${ext}`);
            }, index * 500); // 500ms delay between downloads
        }
    });
    
    showNotification(`Mengunduh ${items.length} item...`);
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
    a.download = `NullHub_${quality}_${Date.now()}.mp4`;
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

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

// Slider functions for TikTok photo posts
let currentSlideIndex = 0;

function changeSlide(direction) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    if (slides.length === 0) return;
    
    // Remove active class from current slide
    slides[currentSlideIndex].classList.remove('active');
    dots[currentSlideIndex].classList.remove('active');
    
    // Update index
    currentSlideIndex += direction;
    
    // Loop around
    if (currentSlideIndex >= slides.length) {
        currentSlideIndex = 0;
    } else if (currentSlideIndex < 0) {
        currentSlideIndex = slides.length - 1;
    }
    
    // Add active class to new slide
    slides[currentSlideIndex].classList.add('active');
    dots[currentSlideIndex].classList.add('active');
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    if (slides.length === 0) return;
    
    // Remove active class from current slide
    slides[currentSlideIndex].classList.remove('active');
    dots[currentSlideIndex].classList.remove('active');
    
    // Update to specified index
    currentSlideIndex = index;
    
    // Add active class to new slide
    slides[currentSlideIndex].classList.add('active');
    dots[currentSlideIndex].classList.add('active');
}

console.log('🚀 NullHub Loaded!');
