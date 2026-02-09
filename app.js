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
    
    // Handle TikTok AND Instagram with same card style
    if (currentPlatform === 'tiktok' || currentPlatform === 'instagram') {
        // Show TikTok card, hide regular preview
        tiktokCard.style.display = 'block';
        regularPreview.style.display = 'none';
        
        // User Info
        const avatar = document.getElementById('tiktok-avatar');
        const username = document.getElementById('tiktok-username');
        const nickname = document.getElementById('tiktok-nickname');
        
        if (currentPlatform === 'instagram') {
            // For Instagram, use Instagram icon
            avatar.src = 'img/Instagram_icon.webp';
            username.textContent = 'Instagram Downloader';
            nickname.textContent = ''; // Kosongkan nickname
        } else {
            avatar.src = data.author?.avatarThumb || data.author?.avatar_thumb?.url_list?.[0] || data.author?.avatarMedium || data.author?.avatar_medium?.url_list?.[0] || '';
            username.textContent = data.author?.nickname || 'Unknown User';
            nickname.textContent = '@' + (data.author?.uniqueId || data.author?.unique_id || 'unknown');
        }
        
        // Video Player Container
        const videoContainer = document.querySelector('.tiktok-video-container');
        
        // Determine if photo or video
        let photoArray = null;
        let hasVideo = false;
        
        if (currentPlatform === 'instagram') {
            // Instagram returns array of objects
            const items = Array.isArray(data) ? data : [data];
            const photoItems = items.filter(item => item.type !== 'mp4');
            const videoItems = items.filter(item => item.type === 'mp4');
            
            if (photoItems.length > 0) {
                photoArray = photoItems.map(item => item.url);
            }
            if (videoItems.length > 0) {
                hasVideo = true;
            }
        } else {
            // TikTok
            photoArray = data.photo || data.images;
            hasVideo = data.video || data.videoWM;
        }
        
        // Check if this is a photo/slide post
        if (photoArray && photoArray.length > 0 && !hasVideo) {
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
        } else {
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
            if (currentPlatform === 'instagram') {
                const items = Array.isArray(data) ? data : [data];
                const videoItem = items.find(item => item.type === 'mp4');
                if (videoItem) vp.src = videoItem.url;
            } else {
                if (data.video && data.video !== false) {
                    vp.src = data.video;
                } else if (data.videoWM && data.videoWM !== false) {
                    vp.src = data.videoWM;
                }
            }
            
            pb.addEventListener('click', () => {
                vp.play();
                vo.classList.add('hidden');
            });
            vo.addEventListener('click', () => {
                vp.play();
                vo.classList.add('hidden');
            });
            vp.addEventListener('play', () => vo.classList.add('hidden'));
            vp.addEventListener('pause', () => vo.classList.remove('hidden'));
        }
        
        // Caption
        const captionText = document.getElementById('tiktok-caption-text');
        captionText.textContent = (currentPlatform === 'instagram') ? 'No caption' : (data.caption || data.title || 'No caption');
        
        // Statistics
        const statsSection = document.querySelector('.tiktok-stats');
        const likes = document.getElementById('tiktok-likes');
        const comments = document.getElementById('tiktok-comments');
        const views = document.getElementById('tiktok-views');
        const shares = document.getElementById('tiktok-shares');
        const saved = document.getElementById('tiktok-saved');
        
        if (currentPlatform === 'instagram') {
            // Hide entire stats section for Instagram
            statsSection.style.display = 'none';
        } else {
            // Show stats for TikTok
            statsSection.style.display = 'flex';
            likes.textContent = data.statistic?.likes ? formatNumber(data.statistic.likes) : '0';
            comments.textContent = data.statistic?.comments ? formatNumber(data.statistic.comments) : '0';
            views.textContent = data.statistic?.views ? formatNumber(data.statistic.views) : '0';
            shares.textContent = data.statistic?.shares ? formatNumber(data.statistic.shares) : '0';
            saved.textContent = data.statistic?.saved ? formatNumber(parseInt(data.statistic.saved)) : '0';
        }
        
        // Published Date
        const publishedDate = document.getElementById('tiktok-date');
        if (currentPlatform === 'instagram') {
            publishedDate.textContent = 'Instagram Post';
        } else if (data.published) {
            const date = new Date(parseInt(data.published) * 1000);
            publishedDate.textContent = formatDate(date);
        }
        
        // Music Info
        const musicSection = document.getElementById('tiktok-music');
        const musicTitle = document.getElementById('tiktok-music-title');
        
        if (currentPlatform === 'tiktok' && data.music && data.music.title) {
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
        
        // For Instagram and other platforms
        // Instagram returns data as array of objects with type and url
        if (currentPlatform === 'instagram') {
            // For Instagram, data is an array
            const firstItem = Array.isArray(data) ? data[0] : data;
            
            if (firstItem && firstItem.url) {
                // Check if it's video or image
                if (firstItem.type === 'mp4') {
                    previewThumb.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2290%22%3E%3Crect fill=%22%23333%22 width=%22120%22 height=%2290%22/%3E%3Ctext x=%2260%22 y=%2250%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2216%22%3EVideo%3C/text%3E%3C/svg%3E';
                } else {
                    previewThumb.src = firstItem.url;
                }
            } else {
                previewThumb.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2290%22%3E%3Crect fill=%22%23333%22 width=%22120%22 height=%2290%22/%3E%3C/svg%3E';
            }
            
            const itemCount = Array.isArray(data) ? data.length : 1;
            previewTitle.textContent = itemCount > 1 ? `Instagram Post (${itemCount} items)` : 'Instagram Post';
            previewAuthor.textContent = 'Instagram';
            previewDuration.textContent = '';
            previewViews.textContent = '';
        } else {
            // For YouTube and other platforms
            if (currentPlatform === 'youtube') {
                // YouTube has specific data structure
                if (data.thumbnail) {
                    previewThumb.src = data.thumbnail;
                } else {
                    previewThumb.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2290%22%3E%3Crect fill=%22%23FF0000%22 width=%22120%22 height=%2290%22/%3E%3Ctext x=%2260%22 y=%2250%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2216%22%3EYouTube%3C/text%3E%3C/svg%3E';
                }
                previewTitle.textContent = data.title || 'YouTube Video';
                previewAuthor.textContent = data.channel || 'Unknown Channel';
                previewDuration.textContent = data.fduration || data.duration || '';
                previewViews.textContent = data.views || '';
            } else {
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
        }
    
    // Display download options
    displayDownloadOptions(data);
}

function displayDownloadOptions(data) {
    downloadOptions.innerHTML = '';
    
    // YouTube specific options
    if (currentPlatform === 'youtube') {
        // YouTube data has nested structure in data.data
        if (data.data && data.data.url) {
            const option = createDownloadOptionSimple({
                url: data.data.url,
                type: `Video ${data.data.quality || 'HD'}`,
                desc: `${data.data.size || 'Unknown size'} • ${data.data.extension || 'mp4'}`,
                icon: 'video'
            });
            downloadOptions.appendChild(option);
        }
        return;
    }
    
    // Instagram specific options
    if (currentPlatform === 'instagram') {
        // Instagram data is an array of objects with type and url
        const items = Array.isArray(data) ? data : [data];
        
        items.forEach((item, index) => {
            if (item && item.url) {
                const option = createDownloadOptionSimple({
                    url: item.url,
                    type: item.type === 'mp4' ? `Video ${index + 1}` : `Foto ${index + 1}`,
                    desc: item.type === 'mp4' ? 'Video HD' : 'Gambar HD',
                    icon: item.type === 'mp4' ? 'video' : 'image'
                });
                downloadOptions.appendChild(option);
            }
        });
        
        // Add option to download all if multiple items
        if (items.length > 1) {
            const allOption = document.createElement('div');
            allOption.className = 'download-option';
            allOption.innerHTML = `
                <div class="option-info">
                    <div class="option-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                    </div>
                    <div class="option-text">
                        <h4>Download Semua</h4>
                        <p>${items.length} item (foto & video)</p>
                    </div>
                </div>
                <button class="option-download-btn" onclick="downloadAllInstagram()">
                    Unduh Semua
                </button>
            `;
            downloadOptions.appendChild(allOption);
        }
        
        return;
    }
    
    // TikTok specific options
    if (currentPlatform === 'tiktok') {
        // Check if this is a photo/slide post (use 'photo' or 'images' array)
        const photoArray = data.photo || data.images;
        if (photoArray && Array.isArray(photoArray) && photoArray.length > 0) {
            // Photo/Slide post - provide download options for each image
            photoArray.forEach((imageUrl, index) => {
                const option = createDownloadOptionSimple({
                    url: imageUrl,
                    type: `Foto ${index + 1}`,
                    desc: `Gambar HD (${photoArray.length} foto)`,
                    icon: 'image'
                });
                downloadOptions.appendChild(option);
            });
            
            // Add option to download all images
            if (photoArray.length > 1) {
                const allOption = document.createElement('div');
                allOption.className = 'download-option';
                allOption.innerHTML = `
                    <div class="option-info">
                        <div class="option-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
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
                downloadOptions.appendChild(allOption);
            }
            
            // Add audio download option if available
            if (data.audio) {
                const audioOption = createDownloadOptionSimple({
                    url: data.audio,
                    type: 'Audio',
                    desc: 'Original sound',
                    icon: 'audio'
                });
                downloadOptions.appendChild(audioOption);
            }
        } else {
            // Video post
            // Video No Watermark
            if (data.video && data.video !== false) {
                const option = createDownloadOptionSimple({
                    url: data.video,
                    type: 'Video HD',
                    desc: 'No Watermark',
                    icon: 'video'
                });
                downloadOptions.appendChild(option);
            }
            
            // Video With Watermark
            if (data.videoWM && data.videoWM !== false) {
                const option = createDownloadOptionSimple({
                    url: data.videoWM,
                    type: 'Video HD',
                    desc: 'With Watermark',
                    icon: 'video'
                });
                downloadOptions.appendChild(option);
            }
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
    
    let iconSvg;
    if (options.icon === 'audio') {
        iconSvg = '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';
    } else if (options.icon === 'image') {
        iconSvg = '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>';
    } else {
        iconSvg = '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>';
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
