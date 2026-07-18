const API_KEY = 'SelfFrrl';
const API_BASE_URL = 'https://api.neoxr.eu/api';

// ============================================================
// DOM Elements
// ============================================================
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
let currentSlideIndex = 0;

// Platform yang API-nya mengembalikan array item {type, url} seperti Instagram
const ARRAY_PLATFORMS = ['instagram', 'xiaohongshu', 'threads', 'twitter'];

// Platform audio: respons berupa info lagu + URL mp3
const MUSIC_PLATFORMS = ['spotify', 'soundcloud', 'applemusic'];

// Tipe item yang dianggap video pada array platforms (gif Twitter = video mp4)
const VIDEO_TYPES = ['mp4', 'gif'];

// ============================================================
// Auto-deteksi platform dari URL
// ============================================================
const PLATFORM_HOSTS = [
    { platform: 'douyin', hosts: ['douyin.com', 'iesdouyin.com'] },
    { platform: 'tiktok', hosts: ['tiktok.com'] },
    { platform: 'instagram', hosts: ['instagram.com', 'instagr.am'] },
    { platform: 'youtube', hosts: ['youtube.com', 'youtu.be'] },
    { platform: 'facebook', hosts: ['facebook.com', 'fb.watch', 'fb.com'] },
    { platform: 'pinterest', hosts: ['pinterest.com', 'pin.it'] },
    { platform: 'capcut', hosts: ['capcut.com'] },
    { platform: 'xiaohongshu', hosts: ['xiaohongshu.com', 'xhslink.com'] },
    { platform: 'threads', hosts: ['threads.net', 'threads.com'] },
    { platform: 'pixiv', hosts: ['pixiv.net'] },
    { platform: 'twitter', hosts: ['twitter.com', 'x.com'] },
    { platform: 'spotify', hosts: ['spotify.com', 'open.spotify.com'] },
    { platform: 'soundcloud', hosts: ['soundcloud.com'] },
    { platform: 'applemusic', hosts: ['music.apple.com'] }
];

function detectPlatformFromUrl(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        for (const entry of PLATFORM_HOSTS) {
            for (const host of entry.hosts) {
                if (hostname === host || hostname.endsWith('.' + host)) {
                    return entry.platform;
                }
            }
        }
    } catch (_) {
        /* URL belum valid, abaikan */
    }
    return null;
}

function setActivePlatform(platform) {
    if (!platform || platform === currentPlatform) return;
    currentPlatform = platform;
    platformBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.platform === platform);
    });
    updateInputPlaceholder();
}

function updateInputPlaceholder() {
    urlInput.placeholder = MUSIC_PLATFORMS.includes(currentPlatform)
        ? 'Tempel link atau ketik judul lagu...'
        : 'Tempel URL video di sini...';
}

function autoDetectPlatform() {
    const detected = detectPlatformFromUrl(urlInput.value.trim());
    if (detected) {
        setActivePlatform(detected);
    }
}

// ============================================================
// Event Listeners
// ============================================================
platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        platformBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPlatform = btn.dataset.platform;
        updateInputPlaceholder();
    });
});

pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        urlInput.value = text;
        urlInput.focus();
        autoDetectPlatform();
    } catch (err) {
        console.error('Gagal paste:', err);
        urlInput.focus();
    }
});

urlInput.addEventListener('input', autoDetectPlatform);

downloadBtn.addEventListener('click', handleDownload);

urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleDownload();
    }
});

// ============================================================
// Fetch Helper (dengan pengecekan response.ok)
// ============================================================
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API merespons dengan status ${response.status}`);
    }
    return response.json();
}

// Versi toleran: kalau satu endpoint gagal, kembalikan {status:false}
// alih-alih melempar error (supaya Promise.all tidak ikut gagal semua)
function safeJson(url) {
    return fetchJson(url).catch(() => ({ status: false }));
}

// Tampilkan alasan asli dari API kalau ada, supaya error mudah didiagnosis
function showApiError(json) {
    const apiMsg = json && (json.msg || json.message);
    showNotification(
        apiMsg ? `Gagal: ${apiMsg}` : 'Gagal mengambil data. Pastikan URL benar dan platform didukung.',
        'error'
    );
}

// ============================================================
// Main Handler
// ============================================================
async function handleDownload() {
    const url = urlInput.value.trim();

    if (!url) {
        showNotification('Masukkan URL video terlebih dahulu!', 'error');
        return;
    }

    if (!isValidUrl(url)) {
        if (MUSIC_PLATFORMS.includes(currentPlatform)) {
            searchMusic(url);
            return;
        }
        showNotification('URL tidak valid! Pastikan URL lengkap dengan https://', 'error');
        return;
    }

    autoDetectPlatform();

    // Cegah double-click / request ganda
    downloadBtn.disabled = true;
    loadingEl.style.display = 'block';
    resultSection.style.display = 'none';

    try {
        const endpoint = getApiEndpoint(currentPlatform);

        if (currentPlatform === 'youtube') {
            const videoUrl = `${API_BASE_URL}/${endpoint}?url=${encodeURIComponent(url)}&type=video&quality=720p&apikey=${API_KEY}`;
            const audioUrl = `${API_BASE_URL}/${endpoint}?url=${encodeURIComponent(url)}&type=audio&quality=128kbps&apikey=${API_KEY}`;

            const [videoData, audioData] = await Promise.all([
                safeJson(videoUrl),
                safeJson(audioUrl)
            ]);

            if (videoData.status) {
                currentData = {
                    ...videoData,
                    audioData: audioData.status ? audioData.data : null
                };
                displayResult(currentData);
            } else {
                showApiError(videoData);
            }
        } else if (currentPlatform === 'pinterest') {
            const pinV1Url = `${API_BASE_URL}/pin?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;
            const pinV2Url = `${API_BASE_URL}/pin-v2?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;

            const [v1Data, v2Data] = await Promise.all([
                safeJson(pinV1Url),
                safeJson(pinV2Url)
            ]);

            if (v2Data.status) {
                currentData = {
                    ...v2Data.data,
                    v1Data: v1Data.status ? v1Data.data : null
                };
                displayResult(currentData);
            } else if (v1Data.status && v1Data.data) {
                // Fallback: v2 gagal tapi v1 sukses (umumnya video)
                currentData = {
                    title: v1Data.data.title || '',
                    is_video: v1Data.data.type === 'mp4',
                    content: [],
                    v1Data: v1Data.data
                };
                displayResult(currentData);
            } else {
                showApiError(v2Data);
            }
        } else {
            const apiUrl = `${API_BASE_URL}/${endpoint}?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;
            const data = await fetchJson(apiUrl);

            if (data.status && data.data) {
                if (currentPlatform === 'capcut' && data.caption) {
                    currentData = {
                        ...data.data,
                        caption: data.caption
                    };
                } else {
                    currentData = data.data;
                }
                displayResult(currentData);
            } else {
                showApiError(data);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan. Periksa koneksi internet Anda atau coba lagi nanti.', 'error');
    } finally {
        loadingEl.style.display = 'none';
        downloadBtn.disabled = false;
    }
}

function getApiEndpoint(platform) {
    const endpoints = {
        'tiktok': 'tiktok',
        'instagram': 'ig',
        'youtube': 'youtube',
        'facebook': 'fb',
        'pinterest': 'pin',
        'capcut': 'capcut',
        'xiaohongshu': 'xiaohongshu',
        'douyin': 'douyin',
        'threads': 'threads',
        'pixiv': 'pixiv',
        'twitter': 'twitter',
        'spotify': 'spotify',
        'soundcloud': 'soundcloud',
        'applemusic': 'applemusic'
    };
    return endpoints[platform] || 'tiktok';
}

function isValidUrl(string) {
    try {
        const parsed = new URL(string);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// ============================================================
// Display Result
// ============================================================
function displayResult(data) {
    resultSection.style.display = 'block';
    document.getElementById('search-results').style.display = 'none';

    const tiktokCard = document.getElementById('tiktok-card');
    const regularPreview = document.getElementById('regular-preview');

    const cardPlatforms = ['tiktok', 'instagram', 'youtube', 'facebook', 'pinterest', 'capcut', 'xiaohongshu', 'douyin', 'threads', 'pixiv', 'twitter', 'spotify', 'soundcloud', 'applemusic'];

    if (cardPlatforms.includes(currentPlatform)) {
        tiktokCard.style.display = 'block';
        regularPreview.style.display = 'none';

        // ---------- User Info ----------
        const avatar = document.getElementById('tiktok-avatar');
        const username = document.getElementById('tiktok-username');
        const nickname = document.getElementById('tiktok-nickname');

        if (currentPlatform === 'instagram') {
            avatar.src = 'img/Instagram_icon.webp';
            username.textContent = 'Instagram Downloader';
            nickname.textContent = '';
        } else if (currentPlatform === 'youtube') {
            avatar.src = 'img/YouTube_icon.webp';
            username.textContent = data.channel || 'YouTube';
            nickname.textContent = '';
        } else if (currentPlatform === 'facebook') {
            avatar.src = 'img/Facebook_icon.webp';
            username.textContent = 'Facebook Video';
            nickname.textContent = '';
        } else if (currentPlatform === 'pinterest') {
            avatar.src = data.author?.image_medium_url || data.author?.image_small_url || 'img/Pinterest_icon.webp';
            username.textContent = data.author?.full_name || data.author?.username || 'Pinterest';
            nickname.textContent = data.author?.username ? `@${data.author.username}` : '';
        } else if (currentPlatform === 'capcut') {
            avatar.src = 'img/CapCut_icon.webp';
            username.textContent = 'CapCut';
            nickname.textContent = '';
        } else if (currentPlatform === 'xiaohongshu') {
            avatar.src = 'img/rednote_icon.webp';
            username.textContent = 'Xiaohongshu';
            nickname.textContent = 'RedNote';
        } else if (currentPlatform === 'douyin') {
            avatar.src = 'img/TikTok_icon.webp';
            username.textContent = 'Douyin';
            nickname.textContent = '抖音';
        } else if (currentPlatform === 'threads') {
            avatar.src = 'img/Threads_icon.webp';
            username.textContent = 'Threads';
            nickname.textContent = '';
        } else if (currentPlatform === 'pixiv') {
            avatar.src = 'img/pixiv_icon.webp';
            username.textContent = data.author?.name || 'Pixiv';
            nickname.textContent = data.author?.username ? `@${data.author.username}` : '';
        } else if (currentPlatform === 'twitter') {
            avatar.src = 'img/X_icon.webp';
            username.textContent = 'Twitter / X';
            nickname.textContent = '';
        } else if (currentPlatform === 'spotify') {
            avatar.src = 'img/Spotify_icon.webp';
            username.textContent = data.artist?.name || 'Spotify';
            nickname.textContent = data.duration || '';
        } else if (currentPlatform === 'soundcloud') {
            avatar.src = 'img/SoundCloud_icon.webp';
            username.textContent = 'SoundCloud';
            nickname.textContent = '';
        } else if (currentPlatform === 'applemusic') {
            avatar.src = 'img/AppleMusic_icon.webp';
            username.textContent = data.album || 'Apple Music';
            nickname.textContent = data.published || '';
        } else {
            avatar.src = data.author?.avatarThumb || data.author?.avatar_thumb?.url_list?.[0] || data.author?.avatarMedium || data.author?.avatar_medium?.url_list?.[0] || '';
            username.textContent = data.author?.nickname || 'Unknown User';
            nickname.textContent = '@' + (data.author?.uniqueId || data.author?.unique_id || 'unknown');
        }

        // ---------- Media (foto/video) ----------
        const videoContainer = document.querySelector('.tiktok-video-container');

        let photoArray = null;
        let hasVideo = false;

        if (ARRAY_PLATFORMS.includes(currentPlatform)) {
            // Instagram, Xiaohongshu, Threads, Twitter: array item {type, url}
            const items = Array.isArray(data) ? data : [data];
            const photoItems = items.filter(item => !VIDEO_TYPES.includes(item.type));
            const videoItems = items.filter(item => VIDEO_TYPES.includes(item.type));

            if (photoItems.length > 0) {
                photoArray = photoItems.map(item => item.url);
            }
            if (videoItems.length > 0) {
                hasVideo = true;
            }
        } else if (currentPlatform === 'youtube' || currentPlatform === 'facebook' || currentPlatform === 'capcut') {
            hasVideo = true;
        } else if (currentPlatform === 'pinterest') {
            if (data.v1Data && data.v1Data.type === 'mp4') {
                hasVideo = true;
            } else if (data.is_video) {
                hasVideo = true;
            } else if (data.content && Array.isArray(data.content) && data.content.length > 0) {
                photoArray = data.content.map(item => item.url);
            }
        } else if (currentPlatform === 'pixiv') {
            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                photoArray = data.images;
            }
        } else {
            // TikTok / Douyin
            photoArray = data.photo || data.images;
            hasVideo = data.video || data.videoWM;
        }

        if (MUSIC_PLATFORMS.includes(currentPlatform)) {
            renderAudioPlayer(videoContainer, data);
        } else if (photoArray && photoArray.length > 0 && !hasVideo) {
            renderPhotoSlider(videoContainer, photoArray);
        } else {
            renderVideoPlayer(videoContainer, data);
        }

        // ---------- Caption ----------
        const captionText = document.getElementById('tiktok-caption-text');
        if (currentPlatform === 'instagram') {
            captionText.textContent = 'No caption';
        } else if (currentPlatform === 'xiaohongshu') {
            captionText.textContent = 'Xiaohongshu Post';
        } else if (currentPlatform === 'douyin') {
            captionText.textContent = data.caption || data.title || 'Douyin Video';
        } else if (currentPlatform === 'threads') {
            captionText.textContent = 'Threads Post';
        } else if (currentPlatform === 'twitter') {
            captionText.textContent = 'Twitter / X Post';
        } else if (currentPlatform === 'spotify') {
            captionText.textContent = data.artist?.name ? `${data.title} — ${data.artist.name}` : (data.title || 'Spotify Track');
        } else if (currentPlatform === 'soundcloud') {
            captionText.textContent = data.title || 'SoundCloud Track';
        } else if (currentPlatform === 'applemusic') {
            captionText.textContent = data.album ? `${data.title} — ${data.album}` : (data.title || 'Apple Music Track');
        } else if (currentPlatform === 'pixiv') {
            const title = data.title || '';
            const desc = data.description || '';
            captionText.textContent = title || desc || 'Pixiv Artwork';
        } else if (currentPlatform === 'youtube') {
            captionText.textContent = data.title || 'No caption';
        } else if (currentPlatform === 'facebook') {
            captionText.textContent = 'Facebook Video';
        } else if (currentPlatform === 'pinterest') {
            const title = data.title && data.title !== '-' ? data.title : '';
            const desc = data.description && data.description !== '-' ? data.description : '';

            let contentType = '';
            if (data.v1Data && data.v1Data.type === 'mp4') {
                contentType = 'Video';
            } else if (data.is_video) {
                contentType = 'Video';
            } else if (data.content && data.content[0]?.url?.includes('.gif')) {
                contentType = 'GIF';
            } else if (data.content && data.content.length > 0) {
                contentType = 'Image';
            }

            captionText.textContent = title || desc || (contentType ? `Pinterest ${contentType}` : 'Pinterest');
        } else {
            captionText.textContent = data.caption || data.title || 'No caption';
        }

        // ---------- Statistics ----------
        const statsSection = document.querySelector('.tiktok-stats');
        const likes = document.getElementById('tiktok-likes');
        const comments = document.getElementById('tiktok-comments');
        const views = document.getElementById('tiktok-views');
        const shares = document.getElementById('tiktok-shares');
        const saved = document.getElementById('tiktok-saved');

        if (currentPlatform === 'tiktok') {
            statsSection.style.display = 'flex';
            likes.textContent = data.statistic?.likes ? formatNumber(parseInt(data.statistic.likes)) : '0';
            comments.textContent = data.statistic?.comments ? formatNumber(parseInt(data.statistic.comments)) : '0';
            views.textContent = data.statistic?.views ? formatNumber(parseInt(data.statistic.views)) : '0';
            shares.textContent = data.statistic?.shares ? formatNumber(parseInt(data.statistic.shares)) : '0';
            saved.textContent = data.statistic?.saved ? formatNumber(parseInt(data.statistic.saved)) : '0';
        } else {
            statsSection.style.display = 'none';
        }

        // ---------- Published Date ----------
        const publishedSection = document.getElementById('tiktok-published');
        const publishedDate = document.getElementById('tiktok-date');

        if (currentPlatform === 'tiktok' && data.published) {
            publishedSection.style.display = 'flex';
            const date = new Date(parseInt(data.published) * 1000);
            publishedDate.textContent = formatDate(date);
        } else {
            publishedSection.style.display = 'none';
        }

        // ---------- Music Info ----------
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
        // ---------- Regular Preview (fallback) ----------
        tiktokCard.style.display = 'none';
        regularPreview.style.display = 'flex';

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

    displayDownloadOptions(data);
}

// ============================================================
// Photo Slider Renderer
// ============================================================
function renderPhotoSlider(videoContainer, photoArray) {
    videoContainer.innerHTML = `
        <div class="tiktok-image-slider">
            <div class="slider-container">
                ${photoArray.map((img, index) => `
                    <div class="slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <img alt="Slide ${index + 1}" loading="lazy">
                    </div>
                `).join('')}
            </div>
            ${photoArray.length > 1 ? `
                <button class="slider-btn prev" type="button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <button class="slider-btn next" type="button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
                <div class="slider-dots">
                    ${photoArray.map((_, index) => `
                        <span class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;

    // Set src via property agar URL dengan karakter khusus tidak merusak HTML
    videoContainer.querySelectorAll('.slide img').forEach((imgEl, index) => {
        imgEl.src = photoArray[index];
    });

    currentSlideIndex = 0;

    const prevBtn = videoContainer.querySelector('.slider-btn.prev');
    const nextBtn = videoContainer.querySelector('.slider-btn.next');
    if (prevBtn) prevBtn.addEventListener('click', () => changeSlide(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeSlide(1));

    videoContainer.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index)));
    });
}

// ============================================================
// Audio Player Renderer (Spotify / SoundCloud / Apple Music)
// ============================================================
function renderAudioPlayer(videoContainer, data) {
    let title = data.title || '';
    let thumb = data.thumbnail || '';
    let audioUrl = '';

    if (currentPlatform === 'applemusic') {
        audioUrl = data.audio?.url || '';
    } else {
        audioUrl = data.url || '';
    }

    videoContainer.innerHTML = `
        <div class="music-card">
            <img class="music-thumb" alt="Cover" loading="lazy">
            <div class="music-title"></div>
            <audio controls preload="none"></audio>
        </div>
    `;

    const img = videoContainer.querySelector('.music-thumb');
    if (thumb) {
        img.src = thumb;
    } else {
        img.remove();
    }

    videoContainer.querySelector('.music-title').textContent = title;

    const audio = videoContainer.querySelector('audio');
    if (audioUrl) {
        audio.src = audioUrl;
    }
}

// ============================================================
// Video Player Renderer
// ============================================================
function renderVideoPlayer(videoContainer, data) {
    videoContainer.innerHTML = `
        <video id="tiktok-video-player" controls playsinline></video>
        <div class="video-overlay" id="video-overlay">
            <button class="play-btn" id="play-btn" type="button">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </button>
        </div>
    `;

    const vp = document.getElementById('tiktok-video-player');
    const vo = document.getElementById('video-overlay');
    const pb = document.getElementById('play-btn');

    if (ARRAY_PLATFORMS.includes(currentPlatform)) {
        const items = Array.isArray(data) ? data : [data];
        const videoItem = items.find(item => VIDEO_TYPES.includes(item.type));
        if (videoItem) vp.src = videoItem.url;
    } else if (currentPlatform === 'youtube') {
        if (data.data && data.data.url) {
            vp.src = data.data.url;
            vp.poster = data.thumbnail || '';
        }
    } else if (currentPlatform === 'facebook') {
        const items = Array.isArray(data) ? data : [data];
        const hdVideo = items.find(item => item.quality === 'HD');
        const video = hdVideo || items[0];
        if (video && video.url) {
            vp.src = video.url;
        }
    } else if (currentPlatform === 'pinterest') {
        if (data.v1Data && data.v1Data.url) {
            vp.src = data.v1Data.url;
        } else if (data.content && Array.isArray(data.content) && data.content.length > 0) {
            vp.src = data.content[0].url;
        }
    } else if (currentPlatform === 'capcut') {
        if (data.url) {
            vp.src = data.url;
        }
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

// ============================================================
// Download Options
// ============================================================
function displayDownloadOptions(data) {
    downloadOptions.innerHTML = '';

    // ---------- YouTube ----------
    if (currentPlatform === 'youtube') {
        if (data.data && data.data.url) {
            downloadOptions.appendChild(createDownloadOptionSimple({
                url: data.data.url,
                type: `Video ${data.data.quality || '720p'}`,
                desc: `${data.data.size || ''} • ${data.data.extension || 'mp4'}`,
                icon: 'video'
            }));
        }

        if (data.audioData && data.audioData.url) {
            downloadOptions.appendChild(createDownloadOptionSimple({
                url: data.audioData.url,
                type: `Audio ${data.audioData.quality || '128kbps'}`,
                desc: `${data.audioData.size || ''} • ${data.audioData.extension || 'mp3'}`,
                icon: 'audio'
            }));
        }
        return;
    }

    // ---------- Facebook ----------
    if (currentPlatform === 'facebook') {
        const items = Array.isArray(data) ? data : [data];

        items.forEach((item) => {
            if (item && item.url && item.response === 200) {
                downloadOptions.appendChild(createDownloadOptionSimple({
                    url: item.url,
                    type: `Video ${item.quality}`,
                    desc: `Facebook ${item.quality}`,
                    icon: 'video'
                }));
            }
        });
        return;
    }

    // ---------- Pinterest ----------
    if (currentPlatform === 'pinterest') {
        if (data.v1Data && data.v1Data.url && data.v1Data.type === 'mp4') {
            downloadOptions.appendChild(createDownloadOptionSimple({
                url: data.v1Data.url,
                type: 'Video MP4',
                desc: `${data.v1Data.size || ''} • mp4`,
                icon: 'video'
            }));
        }

        if (data.content && Array.isArray(data.content)) {
            data.content.forEach((item, index) => {
                if (item.url) {
                    const isGif = item.url.includes('.gif');
                    const type = isGif ? 'GIF' : 'Image';

                    downloadOptions.appendChild(createDownloadOptionSimple({
                        url: item.url,
                        type: data.content.length > 1 ? `${type} ${index + 1}` : type,
                        desc: item.width && item.height ? `${item.width}x${item.height}` : 'Pinterest',
                        icon: 'image'
                    }));
                }
            });
        }
        return;
    }

    // ---------- CapCut ----------
    if (currentPlatform === 'capcut') {
        if (data.url) {
            downloadOptions.appendChild(createDownloadOptionSimple({
                url: data.url,
                type: 'Video',
                desc: 'CapCut Video',
                icon: 'video'
            }));
        }
        return;
    }

    // ---------- Spotify / SoundCloud / Apple Music ----------
    if (MUSIC_PLATFORMS.includes(currentPlatform)) {
        const audioUrl = currentPlatform === 'applemusic' ? data.audio?.url : data.url;
        if (audioUrl) {
            downloadOptions.appendChild(createDownloadOptionSimple({
                url: audioUrl,
                type: 'Audio MP3',
                desc: data.title || 'Music',
                icon: 'audio'
            }));
        }
        return;
    }

    // ---------- Instagram / Xiaohongshu / Threads / Twitter (array platforms) ----------
    if (ARRAY_PLATFORMS.includes(currentPlatform)) {
        const items = Array.isArray(data) ? data : [data];
        const labels = {
            instagram: { name: 'Instagram', photo: 'Foto', videoDesc: 'Video HD', photoDesc: 'Gambar HD' },
            xiaohongshu: { name: 'Xiaohongshu', photo: 'Image', videoDesc: 'Video', photoDesc: 'Image' },
            threads: { name: 'Threads', photo: 'Image', videoDesc: 'Video', photoDesc: 'Image' },
            twitter: { name: 'Twitter', photo: 'Image', videoDesc: 'Video', photoDesc: 'Image' }
        };
        const label = labels[currentPlatform];

        items.forEach((item, index) => {
            if (item && item.url) {
                const isVideo = VIDEO_TYPES.includes(item.type);
                const typeName = item.type === 'gif' ? 'GIF' : (isVideo ? 'Video' : label.photo);
                downloadOptions.appendChild(createDownloadOptionSimple({
                    url: item.url,
                    type: `${typeName} ${index + 1}`,
                    desc: isVideo ? label.videoDesc : label.photoDesc,
                    icon: isVideo ? 'video' : 'image'
                }));
            }
        });

        if (items.length > 1) {
            downloadOptions.appendChild(createDownloadAllOption(
                currentPlatform === 'instagram' ? 'Download Semua' : 'Download All',
                `${items.length} item`,
                () => downloadAllArrayItems(label.name)
            ));
        }
        return;
    }

    // ---------- Pixiv ----------
    if (currentPlatform === 'pixiv') {
        if (data.images && Array.isArray(data.images)) {
            data.images.forEach((imageUrl, index) => {
                downloadOptions.appendChild(createDownloadOptionSimple({
                    url: imageUrl,
                    type: data.images.length > 1 ? `Image ${index + 1}` : 'Image',
                    desc: 'Pixiv Artwork',
                    icon: 'image'
                }));
            });

            if (data.images.length > 1) {
                downloadOptions.appendChild(createDownloadAllOption(
                    'Download All',
                    `${data.images.length} images`,
                    downloadAllPixiv
                ));
            }
        }
        return;
    }

    // ---------- TikTok / Douyin ----------
    if (currentPlatform === 'tiktok' || currentPlatform === 'douyin') {
        const photoArray = data.photo || data.images;
        if (photoArray && Array.isArray(photoArray) && photoArray.length > 0) {
            photoArray.forEach((imageUrl, index) => {
                downloadOptions.appendChild(createDownloadOptionSimple({
                    url: imageUrl,
                    type: `Foto ${index + 1}`,
                    desc: `Gambar HD (${photoArray.length} foto)`,
                    icon: 'image'
                }));
            });

            if (photoArray.length > 1) {
                downloadOptions.appendChild(createDownloadAllOption(
                    'Semua Foto',
                    `Download ${photoArray.length} gambar sekaligus`,
                    downloadAllImages
                ));
            }

            if (data.audio) {
                downloadOptions.appendChild(createDownloadOptionSimple({
                    url: data.audio,
                    type: 'Audio',
                    desc: 'Original sound',
                    icon: 'audio'
                }));
            }
        } else {
            if (data.video && data.video !== false) {
                downloadOptions.appendChild(createDownloadOptionSimple({
                    url: data.video,
                    type: 'Video HD',
                    desc: 'No Watermark',
                    icon: 'video'
                }));
            }

            if (data.videoWM && data.videoWM !== false) {
                downloadOptions.appendChild(createDownloadOptionSimple({
                    url: data.videoWM,
                    type: 'Video HD WM',
                    desc: 'With Watermark',
                    icon: 'video'
                }));
            }

            if (data.audio) {
                downloadOptions.appendChild(createDownloadOptionSimple({
                    url: data.audio,
                    type: 'Audio',
                    desc: 'Original sound',
                    icon: 'audio'
                }));
            }
        }
        return;
    }

    // ---------- Fallback (platform lain) ----------
    const items = Array.isArray(data) ? data : [data];
    items.forEach((item) => {
        downloadOptions.appendChild(createDownloadOption(item));
    });
}

// ============================================================
// Download Option Builders (tanpa inline onclick — aman dari
// URL yang mengandung tanda kutip)
// ============================================================
const ICON_PATHS = {
    video: '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
    audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'
};

function createDownloadOptionSimple(options) {
    const div = document.createElement('div');
    div.className = 'download-option';

    const iconSvg = ICON_PATHS[options.icon] || ICON_PATHS.video;

    div.innerHTML = `
        <div class="option-info">
            <div class="option-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${iconSvg}
                </svg>
            </div>
            <div class="option-text">
                <h4></h4>
                <p></p>
            </div>
        </div>
        <button class="option-download-btn" type="button">
            Unduh
        </button>
    `;

    // Isi teks via textContent agar aman dari karakter khusus
    div.querySelector('h4').textContent = options.type;
    div.querySelector('p').textContent = options.desc;

    div.querySelector('.option-download-btn').addEventListener('click', () => {
        downloadFile(options.url, options.type.replace(/ /g, '_'));
    });

    return div;
}

function createDownloadOption(item) {
    const type = item.type || 'mp4';
    const quality = item.quality || getQualityFromType(type);
    const size = item.size || 'Unknown';
    const isVideo = type.includes('mp4') || type.includes('video');

    return createDownloadOptionSimple({
        url: item.url,
        type: quality,
        desc: `${type.toUpperCase()}${size !== 'Unknown' ? ' • ' + size : ''}`,
        icon: isVideo ? 'video' : 'audio'
    });
}

function createDownloadAllOption(title, subtitle, handler) {
    const div = document.createElement('div');
    div.className = 'download-option';
    div.innerHTML = `
        <div class="option-info">
            <div class="option-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${ICON_PATHS.image}
                </svg>
            </div>
            <div class="option-text">
                <h4></h4>
                <p></p>
            </div>
        </div>
        <button class="option-download-btn" type="button">
            Unduh Semua
        </button>
    `;

    div.querySelector('h4').textContent = title;
    div.querySelector('p').textContent = subtitle;
    div.querySelector('.option-download-btn').addEventListener('click', handler);

    return div;
}

// ============================================================
// Download All Handlers
// ============================================================
function downloadAllImages() {
    if (!currentData) {
        showNotification('Tidak ada gambar untuk diunduh', 'error');
        return;
    }

    const photoArray = currentData.photo || currentData.images;
    if (!photoArray || !Array.isArray(photoArray) || photoArray.length === 0) {
        showNotification('Tidak ada gambar untuk diunduh', 'error');
        return;
    }

    photoArray.forEach((imageUrl, index) => {
        setTimeout(() => {
            downloadFile(imageUrl, `TikTok_Foto_${index + 1}`, true);
        }, index * 800);
    });

    showNotification(`Mengunduh ${photoArray.length} foto...`, 'info');
}

function downloadAllArrayItems(platformName) {
    if (!currentData) {
        showNotification('Tidak ada item untuk diunduh', 'error');
        return;
    }

    const items = Array.isArray(currentData) ? currentData : [currentData];

    items.forEach((item, index) => {
        if (item && item.url) {
            setTimeout(() => {
                const type = VIDEO_TYPES.includes(item.type) ? 'Video' : 'Foto';
                downloadFile(item.url, `${platformName}_${type}_${index + 1}`, true);
            }, index * 800);
        }
    });

    showNotification(`Mengunduh ${items.length} item...`, 'info');
}

function downloadAllPixiv() {
    if (!currentData || !currentData.images) {
        showNotification('Tidak ada gambar untuk diunduh', 'error');
        return;
    }

    const images = currentData.images;

    images.forEach((imageUrl, index) => {
        setTimeout(() => {
            downloadFile(imageUrl, `Pixiv_Image_${index + 1}`, true);
        }, index * 800);
    });

    showNotification(`Mengunduh ${images.length} gambar...`, 'info');
}

// ============================================================
// Download File
// - Coba fetch → blob agar atribut download dihormati browser
//   (atribut download diabaikan untuk URL cross-origin).
// - Jika CORS memblokir, fallback buka di tab baru.
// ============================================================
function getExtensionFromUrl(url, name) {
    try {
        const pathname = new URL(url).pathname.toLowerCase();
        const match = pathname.match(/\.(mp4|mov|webm|mp3|m4a|wav|jpg|jpeg|png|webp|gif|heic)$/);
        if (match) return match[1];
    } catch (_) { /* abaikan */ }

    const lower = (name || '').toLowerCase();
    if (lower.includes('audio') || lower.includes('mp3')) return 'mp3';
    if (lower.includes('foto') || lower.includes('image') || lower.includes('gambar') || lower.includes('photo')) return 'jpg';
    return 'mp4';
}

async function downloadFile(url, name, silent = false) {
    const extension = getExtensionFromUrl(url, name);
    const safeName = String(name).replace(/[^\w\-]+/g, '_');
    const filename = `NullHub_${safeName}_${Date.now()}.${extension}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

        if (!silent) {
            showNotification('Download dimulai! Periksa folder download Anda.', 'success');
        }
    } catch (_) {
        // Fallback: CORS diblokir server media, buka di tab baru
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();

        if (!silent) {
            showNotification('File dibuka di tab baru. Tekan lama / klik kanan untuk menyimpan.', 'info');
        }
    }
}

// ============================================================
// Pencarian Musik (Spotify / SoundCloud / Apple Music)
// Struktur respons mengikuti plugin bot: data = array {title, url, ...}
// ============================================================
const MUSIC_SEARCH = {
    spotify: {
        endpoint: 'spotify-search',
        subtitle: (v) => [v.duration, v.popularity ? `Popularitas ${v.popularity}` : ''].filter(Boolean).join(' • ') || 'Spotify'
    },
    soundcloud: {
        endpoint: 'soundcloud-search',
        subtitle: (v) => v.artist || 'SoundCloud'
    },
    applemusic: {
        endpoint: 'applemusic-search',
        subtitle: () => 'Apple Music'
    }
};

async function searchMusic(query) {
    downloadBtn.disabled = true;
    loadingEl.style.display = 'block';
    resultSection.style.display = 'none';

    try {
        const conf = MUSIC_SEARCH[currentPlatform];
        const json = await fetchJson(`${API_BASE_URL}/${conf.endpoint}?q=${encodeURIComponent(query)}&apikey=${API_KEY}`);

        if (!json.status || !Array.isArray(json.data) || json.data.length === 0) {
            showNotification('Tidak ada hasil untuk kata kunci itu. Coba yang lain.', 'error');
            return;
        }

        renderMusicSearchResults(json.data, conf);
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Terjadi kesalahan. Periksa koneksi internet Anda atau coba lagi nanti.', 'error');
    } finally {
        loadingEl.style.display = 'none';
        downloadBtn.disabled = false;
    }
}

function renderMusicSearchResults(items, conf) {
    resultSection.style.display = 'block';
    document.getElementById('tiktok-card').style.display = 'none';
    document.getElementById('regular-preview').style.display = 'none';
    downloadOptions.innerHTML = '';

    const wrap = document.getElementById('search-results');
    const list = document.getElementById('search-results-list');
    wrap.style.display = 'block';
    list.innerHTML = '';

    items.slice(0, 10).forEach((v) => {
        if (!v || !v.url) return;

        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'search-result-item';
        item.innerHTML = `
            <div class="sr-info">
                <h4></h4>
                <p></p>
            </div>
            <span class="sr-action">Pilih ›</span>
        `;
        item.querySelector('h4').textContent = v.artist ? `${v.artist} – ${v.title}` : (v.title || 'Tanpa judul');
        item.querySelector('p').textContent = conf.subtitle(v);
        item.addEventListener('click', () => {
            urlInput.value = v.url;
            wrap.style.display = 'none';
            handleDownload();
        });

        list.appendChild(item);
    });

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// Formatters
// ============================================================
function getQualityFromType(type) {
    if (type.includes('1080')) return 'Full HD 1080p';
    if (type.includes('720')) return 'HD 720p';
    if (type.includes('480')) return 'SD 480p';
    if (type.includes('360')) return 'SD 360p';
    if (type.includes('mp3') || type.includes('audio')) return 'Audio MP3';
    return 'Video';
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
    if (isNaN(num)) return '0';
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

// ============================================================
// Toast Notification (satu versi, animasi ter-inject dengan benar)
// ============================================================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');

    const icons = {
        success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>`,
        error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>`,
        info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>`
    };

    const colors = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        info: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
    };

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            ${icons[type] || icons.info}
            <span></span>
        </div>
        <div class="toast-progress"></div>
    `;

    notification.querySelector('span').textContent = message;

    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
        z-index: 10000;
        animation: slideUpBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        backdrop-filter: blur(10px);
        min-width: 300px;
        max-width: 500px;
    `;

    const progressBar = notification.querySelector('.toast-progress');
    if (progressBar) {
        progressBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 0 0 16px 16px;
            animation: toastProgress 3s linear;
        `;
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideDownBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// Inject keyframes untuk toast (dulu bug: variabel yang di-append salah)
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes slideUpBounce {
        0% {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
        60% {
            transform: translateX(-50%) translateY(-10px);
        }
        100% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    @keyframes slideDownBounce {
        0% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        100% {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
    }
    @keyframes toastProgress {
        from { width: 100%; }
        to { width: 0%; }
    }
    .toast-progress {
        width: 100%;
    }
`;
document.head.appendChild(toastStyle);

// ============================================================
// Slider Functions
// ============================================================
function changeSlide(direction) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    if (slides.length === 0) return;

    slides[currentSlideIndex]?.classList.remove('active');
    dots[currentSlideIndex]?.classList.remove('active');

    currentSlideIndex += direction;

    if (currentSlideIndex >= slides.length) {
        currentSlideIndex = 0;
    } else if (currentSlideIndex < 0) {
        currentSlideIndex = slides.length - 1;
    }

    slides[currentSlideIndex]?.classList.add('active');
    dots[currentSlideIndex]?.classList.add('active');
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    if (slides.length === 0) return;

    slides[currentSlideIndex]?.classList.remove('active');
    dots[currentSlideIndex]?.classList.remove('active');

    currentSlideIndex = index;

    slides[currentSlideIndex]?.classList.add('active');
    dots[currentSlideIndex]?.classList.add('active');
}

console.log('🚀 NullHub Loaded!');

// ============================================================
// Bottom Navigation — Sistem Halaman
// ============================================================
const navItems = document.querySelectorAll('.bottom-nav .nav-item');
const pageEls = {
    downloader: document.getElementById('page-downloader'),
    ai: document.getElementById('page-ai')
};

function switchPage(pageName) {
    if (!pageEls[pageName]) return;

    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageName);
    });

    Object.entries(pageEls).forEach(([name, el]) => {
        el.classList.toggle('active', name === pageName);
    });

    // Kunci scroll body saat di halaman chat agar layout tidak lompat
    document.body.classList.toggle('ai-page-active', pageName === 'ai');

    window.scrollTo({ top: 0, behavior: 'instant' });

    if (pageName === 'ai' && aiMessages.children.length === 0) {
        showAiGreeting();
    }
}

// Ukur tinggi header asli untuk posisi kartu chat (nilai --header-h di CSS)
function updateHeaderHeight() {
    const header = document.querySelector('.app-header');
    if (header) {
        document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
    }
}
updateHeaderHeight();
window.addEventListener('resize', updateHeaderHeight);

navItems.forEach(item => {
    item.addEventListener('click', () => switchPage(item.dataset.page));
});

// ============================================================
// AI Chat (Neoxr gpt-pro) — Halaman AI
// ============================================================
const aiClearBtn = document.getElementById('ai-clear-btn');
const aiMessages = document.getElementById('ai-messages');
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send-btn');

let aiBusy = false;

// Model AI yang tersedia (endpoint Neoxr, format respons sama)
const AI_MODELS = {
    gpt: { endpoint: 'gpt-pro', label: 'GPT' },
    gemini: { endpoint: 'gemini-chat', label: 'Gemini' },
    bing: { endpoint: 'bing-chat', label: 'Bing' }
};
let aiModel = 'gpt';

document.querySelectorAll('.ai-model-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (aiBusy || btn.dataset.model === aiModel) return;
        aiModel = btn.dataset.model;
        document.querySelectorAll('.ai-model-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.model === aiModel);
        });
        appendAiMessage(`Model diganti ke ${AI_MODELS[aiModel].label} ✨`, 'bot');
    });
});

const AI_GREETING = 'Halo! Saya NullXD AI 🤖\nTanyakan apa saja — teknologi, tips, atau hal lain yang ingin kamu tahu.';

aiClearBtn.addEventListener('click', () => {
    aiMessages.innerHTML = '';
    showAiGreeting();
});

aiSendBtn.addEventListener('click', sendAiMessage);
aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendAiMessage();
    }
});

// Saat keyboard muncul, pastikan pesan terakhir tetap terlihat
aiInput.addEventListener('focus', () => {
    setTimeout(() => {
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }, 300);
});

// ---------- Renderer Rich Message ----------
// Escape HTML dulu, baru terapkan format — respons API tidak bisa
// menyuntikkan tag HTML. Mendukung: ```code block```, tabel markdown,
// heading, pembatas, bold, inline code, dan bullet.
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatAiMessage(text) {
    const parts = String(text).split(/```(\w*)\n?([\s\S]*?)```/g);
    let html = '';
    for (let i = 0; i < parts.length; i += 3) {
        html += formatAiText(parts[i] || '');
        if (i + 2 < parts.length) {
            html += buildCodeBlock(parts[i + 1], parts[i + 2]);
        }
    }
    return html;
}

function buildCodeBlock(language, code) {
    const lang = (language || 'code').toLowerCase();
    return `<div class="ai-code"><div class="ai-code-head"><span>${escapeHtml(lang)}</span><button class="ai-copy-btn" type="button">Copy</button></div><pre><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre></div>`;
}

function formatAiText(text) {
    let safe = escapeHtml(text);
    safe = renderTables(safe);
    safe = safe.replace(/^#{1,3} (.+)$/gm, '<strong class="ai-h">$1</strong>');
    safe = safe.replace(/^---+$/gm, '<span class="ai-hr"></span>');
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    safe = safe.replace(/^[*-] /gm, '• ');
    return safe;
}

// Deteksi blok tabel markdown (baris | ... | dengan pemisah |---|)
function renderTables(text) {
    const lines = text.split('\n');
    const output = [];
    let i = 0;

    while (i < lines.length) {
        const isTableLine = (l) => /^\s*\|.*\|\s*$/.test(l);
        const isSeparator = (l) => /^\s*\|[\s\-:|]+\|\s*$/.test(l);

        if (isTableLine(lines[i]) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
            const tableLines = [lines[i], lines[i + 1]];
            let j = i + 2;
            while (j < lines.length && isTableLine(lines[j])) {
                tableLines.push(lines[j]);
                j++;
            }
            output.push(buildTable(tableLines));
            i = j;
        } else {
            output.push(lines[i]);
            i++;
        }
    }
    return output.join('\n');
}

function buildTable(tableLines) {
    const parseRow = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const header = parseRow(tableLines[0]);
    const body = tableLines.slice(2).map(parseRow);

    let html = '<table class="ai-table"><thead><tr>';
    header.forEach(cell => { html += `<th>${cell}</th>`; });
    html += '</tr></thead><tbody>';
    body.forEach(row => {
        html += '<tr>';
        row.forEach(cell => { html += `<td>${cell}</td>`; });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

// ---------- Greeting + Suggestion Chips ----------
const AI_SUGGESTIONS = [
    'Apa itu Node.js?',
    'Buatkan caption Instagram',
    'Ide konten TikTok',
    'Buatkan contoh kode JavaScript'
];

function showAiGreeting() {
    appendAiMessage(AI_GREETING, 'bot');

    const div = document.createElement('div');
    div.className = 'ai-suggestions';
    AI_SUGGESTIONS.forEach(s => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ai-chip';
        chip.textContent = s;
        chip.addEventListener('click', () => {
            if (aiBusy) return;
            aiInput.value = s;
            sendAiMessage();
        });
        div.appendChild(chip);
    });
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

// Tombol Copy pada blok kode (event delegation, berlaku untuk semua bubble)
aiMessages.addEventListener('click', async (e) => {
    const btn = e.target.closest('.ai-copy-btn');
    if (!btn) return;
    const code = btn.closest('.ai-code')?.querySelector('code')?.textContent || '';
    try {
        await navigator.clipboard.writeText(code);
        btn.textContent = 'Disalin!';
    } catch (_) {
        btn.textContent = 'Gagal';
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
});

function appendAiMessage(text, role) {
    const div = document.createElement('div');
    div.className = `ai-msg ${role}`;
    if (role === 'user') {
        div.textContent = text;
    } else {
        div.innerHTML = formatAiMessage(text);
    }
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    return div;
}

function showAiTyping() {
    const div = document.createElement('div');
    div.className = 'ai-typing';
    div.id = 'ai-typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

function hideAiTyping() {
    document.getElementById('ai-typing-indicator')?.remove();
}

async function sendAiMessage() {
    const question = aiInput.value.trim();
    if (!question || aiBusy) return;

    aiBusy = true;
    aiSendBtn.disabled = true;
    aiInput.value = '';

    aiMessages.querySelector('.ai-suggestions')?.remove();

    appendAiMessage(question, 'user');
    showAiTyping();

    try {
        const endpoint = AI_MODELS[aiModel].endpoint;
        const apiUrl = `${API_BASE_URL}/${endpoint}?q=${encodeURIComponent(question)}&apikey=${API_KEY}`;
        const result = await fetchJson(apiUrl);

        hideAiTyping();

        if (result.status && result.data && result.data.message) {
            appendAiMessage(result.data.message, 'bot');
        } else {
            appendAiMessage('Maaf, saya tidak mendapatkan jawaban dari server. Coba tanyakan dengan kalimat lain.', 'error');
        }
    } catch (error) {
        console.error('AI Chat error:', error);
        hideAiTyping();
        appendAiMessage('Terjadi kesalahan koneksi. Periksa internet Anda lalu coba lagi.', 'error');
    } finally {
        aiBusy = false;
        aiSendBtn.disabled = false;
        aiInput.focus();
    }
}
