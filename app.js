// ====== Global State ======
const appState = {
    db: null,
    allImages: [],
    filteredImages: [],
    allTags: [],
    recentTags: [],
    tagFrequency: {},
    selectedImageIds: new Set(),
    activeSearchTags: [],
    filterMode: 'and',
    sortBy: 'newest',
    currentImageIndex: 0,
    isSelectMode: false,
    currentEditImageId: null,
    currentTagPickerTarget: null,
};

// ====== Initialization ======
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    await loadAllData();
    setupEventListeners();
    setupTabNavigation();
    switchTab('search');
});

async function initDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open('OutfitArchive', 1);

        request.onerror = () => {
            console.log('Using localStorage fallback');
            appState.useLocalStorage = true;
            resolve();
        };

        request.onsuccess = () => {
            appState.db = request.result;
            resolve();
        };

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('images')) {
                db.createObjectStore('images', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('tags')) {
                db.createObjectStore('tags', { keyPath: 'name' });
            }
        };
    });
}

async function loadAllData() {
    appState.allImages = await dbGetAllImages();
    appState.allTags = await dbGetTags();

    if (appState.allTags.length === 0) {
        appState.allTags = [
            '꾸안꾸', '꾸꾸꾸',
            '가디건', '원피스', '치마', '바지', '코트', '자켓', '니트', '스니커즈', '부츠', '로퍼', '샌들', '가방', '머플러',
            '흰색', '검정', '회색', '베이지', '브라운', '네이비', '블루', '그린', '올리브', '카키', '레드', '핑크'
        ];
        await dbSaveTags(appState.allTags);
    }

    // Calculate tag frequency
    appState.tagFrequency = {};
    appState.allImages.forEach(img => {
        img.tags.forEach(tag => {
            appState.tagFrequency[tag] = (appState.tagFrequency[tag] || 0) + 1;
        });
    });

    appState.recentTags = JSON.parse(localStorage.getItem('recentTags') || '[]');
    updateInfoDisplay();
}

function saveRecentTags() {
    localStorage.setItem('recentTags', JSON.stringify(appState.recentTags.slice(0, 10)));
}

function recordTagUsage(tag) {
    const index = appState.recentTags.indexOf(tag);
    if (index !== -1) appState.recentTags.splice(index, 1);
    appState.recentTags.unshift(tag);
    appState.recentTags = appState.recentTags.slice(0, 8);
    saveRecentTags();
}

// ====== Database Operations ======
function dbGetAllImages() {
    if (appState.useLocalStorage) {
        return Promise.resolve(JSON.parse(localStorage.getItem('images') || '[]'));
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbGetImage(id) {
    if (appState.useLocalStorage) {
        const images = JSON.parse(localStorage.getItem('images') || '[]');
        return Promise.resolve(images.find(img => img.id === id));
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbSaveImage(imageData) {
    if (appState.useLocalStorage) {
        const images = JSON.parse(localStorage.getItem('images') || '[]');
        images.push(imageData);
        localStorage.setItem('images', JSON.stringify(images));
        return Promise.resolve(imageData.id);
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.add(imageData);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbUpdateImage(imageData) {
    if (appState.useLocalStorage) {
        const images = JSON.parse(localStorage.getItem('images') || '[]');
        const index = images.findIndex(img => img.id === imageData.id);
        if (index !== -1) images[index] = imageData;
        localStorage.setItem('images', JSON.stringify(images));
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.put(imageData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function dbDeleteImage(id) {
    if (appState.useLocalStorage) {
        const images = JSON.parse(localStorage.getItem('images') || '[]').filter(img => img.id !== id);
        localStorage.setItem('images', JSON.stringify(images));
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function dbGetTags() {
    if (appState.useLocalStorage) {
        return Promise.resolve(JSON.parse(localStorage.getItem('tags') || '[]'));
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['tags'], 'readonly');
        const store = transaction.objectStore('tags');
        const request = store.getAll();
        request.onsuccess = () => {
            const tags = request.result.map(item => item.name);
            resolve(tags);
        };
        request.onerror = () => reject(request.error);
    });
}

function dbSaveTags(tags) {
    if (appState.useLocalStorage) {
        localStorage.setItem('tags', JSON.stringify(tags));
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['tags'], 'readwrite');
        const store = transaction.objectStore('tags');
        store.clear();
        tags.forEach(tag => store.add({ name: tag }));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

function dbClearAll() {
    if (appState.useLocalStorage) {
        localStorage.clear();
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['images', 'tags'], 'readwrite');
        transaction.objectStore('images').clear();
        transaction.objectStore('tags').clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

// ====== Event Listeners ======
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const filterToggle = document.getElementById('filterToggle');
    const tagPickerBtn = document.getElementById('tagPickerBtn');

    searchInput.addEventListener('input', () => {
        searchClearBtn.style.display = searchInput.value ? 'flex' : 'none';
        applyFilters();
    });

    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
        applyFilters();
    });

    filterToggle.addEventListener('click', () => {
        const options = document.getElementById('filterOptions');
        options.style.display = options.style.display === 'none' ? 'flex' : 'none';
    });

    document.querySelectorAll('input[name="filterMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            appState.filterMode = e.target.value;
            applyFilters();
        });
    });

    document.getElementById('sortBy').addEventListener('change', (e) => {
        appState.sortBy = e.target.value;
        applyFilters();
    });

    tagPickerBtn.addEventListener('click', () => {
        appState.currentTagPickerTarget = 'search';
        openTagPicker();
    });

    // Archive
    document.getElementById('addImageBtn').addEventListener('click', () => {
        openModal('addImageModal');
    });

    document.getElementById('selectModeBtn').addEventListener('click', () => {
        appState.isSelectMode = !appState.isSelectMode;
        document.getElementById('selectModeBtn').textContent = appState.isSelectMode ? '완료' : '선택';
        renderArchiveGrid();
    });

    document.getElementById('selectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('#archiveGrid .image-card').forEach(card => {
            appState.selectedImageIds.add(parseInt(card.dataset.id));
        });
        renderArchiveGrid();
        updateMultiSelectBar();
    });

    document.getElementById('deselectAllBtn').addEventListener('click', () => {
        appState.selectedImageIds.clear();
        renderArchiveGrid();
        updateMultiSelectBar();
    });

    // Upload
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');

    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary)';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = 'var(--border)';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--border)';
        handleFiles(e.dataTransfer.files);
    });

    imageInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        e.target.value = '';
    });

    document.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items || [];
        const files = [];
        for (let item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                files.push(item.getAsFile());
            }
        }
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    // Tags
    document.getElementById('tagsSortBy').addEventListener('change', (e) => {
        renderTagsList(e.target.value);
    });

    // Settings
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', importData);
    document.getElementById('resetBtn').addEventListener('click', () => {
        showConfirm('모든 데이터가 삭제됩니다. 계속하시겠습니까?', resetAll);
    });

    document.getElementById('imageDisplayToggle').addEventListener('change', (e) => {
        const contain = e.target.checked;
        const grids = document.querySelectorAll('.grid-container .image-card img');
        grids.forEach(img => {
            img.style.objectFit = contain ? 'contain' : 'cover';
        });
        localStorage.setItem('imageDisplayMode', contain ? 'contain' : 'cover');
    });

    // Modal Actions
    document.getElementById('editTagPickerBtn').addEventListener('click', () => {
        appState.currentTagPickerTarget = 'edit';
        openTagPicker();
    });

    document.getElementById('editSaveBtn').addEventListener('click', saveImageEdit);
    document.getElementById('editDeleteBtn').addEventListener('click', () => {
        const imageId = parseInt(document.getElementById('editPreviewImage').dataset.id);
        showConfirm('이미지를 삭제하시겠습니까?', async () => {
            await dbDeleteImage(imageId);
            appState.allImages = appState.allImages.filter(img => img.id !== imageId);
            closeModal('editModal');
            applyFilters();
            renderArchiveGrid();
            showToast('삭제되었습니다');
        });
    });

    document.getElementById('addTagsToSelectedBtn').addEventListener('click', () => {
        appState.currentTagPickerTarget = 'addTags';
        openTagPicker();
    });

    document.getElementById('removeTagsFromSelectedBtn').addEventListener('click', () => {
        appState.currentTagPickerTarget = 'removeTags';
        openTagPicker();
    });

    document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
        if (appState.selectedImageIds.size === 0) return;
        showConfirm(`${appState.selectedImageIds.size}개 이미지를 삭제하시겠습니까?`, deleteSelectedImages);
    });

    document.getElementById('confirmOkBtn').addEventListener('click', () => {
        closeModal('confirmModal');
    });

    // Image Viewer
    document.getElementById('viewerBackBtn').addEventListener('click', closeViewer);
    document.getElementById('viewerDeleteBtn').addEventListener('click', () => {
        const imageId = appState.filteredImages[appState.currentImageIndex]?.id;
        if (!imageId) return;
        showConfirm('이미지를 삭제하시겠습니까?', async () => {
            await dbDeleteImage(imageId);
            appState.allImages = appState.allImages.filter(img => img.id !== imageId);
            closeViewer();
            applyFilters();
            renderSearchGrid();
            showToast('삭제되었습니다');
        });
    });

    document.getElementById('viewerEditBtn').addEventListener('click', openEditFromViewer);

    // Viewer Canvas Swipe
    let touchStartX = 0;
    const viewerCanvas = document.getElementById('viewerCanvas');
    viewerCanvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });
    viewerCanvas.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 50) {
            nextViewerImage();
        } else if (touchEndX - touchStartX > 50) {
            prevViewerImage();
        }
    });

    // Tap Picker
    document.getElementById('tagPickerSearch').addEventListener('input', (e) => {
        renderTagPicker(e.target.value.toLowerCase());
    });

    document.getElementById('tagPickerOverlay').addEventListener('click', closeTagPicker);
}

function setupTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const tabContent = document.getElementById(tabName + 'Tab');
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);

    if (tabContent) tabContent.classList.add('active');
    if (tabBtn) tabBtn.classList.add('active');

    const titles = {
        search: '검색',
        archive: '보관함',
        tags: '태그',
        settings: '설정'
    };
    document.getElementById('headerTitle').textContent = titles[tabName];

    if (tabName === 'search') {
        renderSearchGrid();
    } else if (tabName === 'archive') {
        renderArchiveGrid();
    } else if (tabName === 'tags') {
        renderTagsList('frequency');
    }
}

// ====== Search Tab ======
function applyFilters() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const searchTerms = searchText.split(/\s+/).filter(t => t);

    let filtered = appState.allImages.filter(img => {
        // Text search
        if (searchTerms.length > 0) {
            const hasAllTerms = searchTerms.every(term =>
                img.tags.some(tag => tag.toLowerCase().includes(term)) ||
                (img.memo && img.memo.toLowerCase().includes(term))
            );
            if (!hasAllTerms) return false;
        }

        // Tag filtering
        if (appState.activeSearchTags.length > 0) {
            const imageTags = img.tags.map(t => t.toLowerCase());
            if (appState.filterMode === 'and') {
                return appState.activeSearchTags.every(tag => imageTags.includes(tag));
            } else {
                return appState.activeSearchTags.some(tag => imageTags.includes(tag));
            }
        }

        return true;
    });

    // Sort
    filtered.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return appState.sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

    appState.filteredImages = filtered;
    renderSelectedFilters();
    renderSearchGrid();
}

function renderSelectedFilters() {
    const container = document.getElementById('selectedFilters');
    container.innerHTML = appState.activeSearchTags.map(tag => `
        <div class="filter-chip">
            ${tag}
            <span class="filter-chip-remove" onclick="removeSearchTag('${tag}')">✕</span>
        </div>
    `).join('');
}

function removeSearchTag(tag) {
    appState.activeSearchTags = appState.activeSearchTags.filter(t => t !== tag);
    applyFilters();
}

function renderSearchGrid() {
    const grid = document.getElementById('searchGrid');
    const empty = document.getElementById('searchEmptyState');
    const info = document.getElementById('resultsInfo');

    if (appState.filteredImages.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        info.textContent = '';
        return;
    }

    empty.style.display = 'none';
    info.textContent = `${appState.filteredImages.length}개`;

    const objectFit = localStorage.getItem('imageDisplayMode') || 'contain';
    grid.innerHTML = appState.filteredImages.map((img, idx) => `
        <div class="image-card" data-id="${img.id}" onclick="openViewer(${idx})">
            <img src="${img.thumbnail}" alt="image" style="object-fit: ${objectFit};">
        </div>
    `).join('');
}

// ====== Archive Tab ======
function renderArchiveGrid() {
    const grid = document.getElementById('archiveGrid');
    const empty = document.getElementById('archiveEmptyState');

    if (appState.allImages.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    const sorted = [...appState.allImages].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const objectFit = localStorage.getItem('imageDisplayMode') || 'contain';
    grid.innerHTML = sorted.map(img => `
        <div class="image-card ${appState.selectedImageIds.has(img.id) ? 'selected' : ''}" 
             data-id="${img.id}" 
             onclick="handleArchiveCardClick(event, ${img.id})">
            <img src="${img.thumbnail}" alt="image" style="object-fit: ${objectFit};">
        </div>
    `).join('');
}

function handleArchiveCardClick(event, imageId) {
    if (appState.isSelectMode) {
        if (appState.selectedImageIds.has(imageId)) {
            appState.selectedImageIds.delete(imageId);
        } else {
            appState.selectedImageIds.add(imageId);
        }
        updateMultiSelectBar();
        renderArchiveGrid();
    } else {
        openEditModal(imageId);
    }
}

function updateMultiSelectBar() {
    const bar = document.getElementById('multiSelectBar');
    const count = document.getElementById('selectionCount');

    if (appState.isSelectMode && appState.selectedImageIds.size > 0) {
        bar.style.display = 'flex';
        count.textContent = `${appState.selectedImageIds.size}개 선택`;
    } else {
        bar.style.display = 'none';
    }
}

// ====== Tags Tab ======
function renderTagsList(sortBy) {
    const list = document.getElementById('tagsList');
    let tags = [...appState.allTags];

    if (sortBy === 'frequency') {
        tags.sort((a, b) => (appState.tagFrequency[b] || 0) - (appState.tagFrequency[a] || 0));
    } else {
        tags.sort();
    }

    list.innerHTML = tags.map(tag => `
        <button class="tag-item" onclick="addTagToSearch('${tag}')">${tag}</button>
    `).join('');
}

function addTagToSearch(tag) {
    const lowerTag = tag.toLowerCase();
    if (!appState.activeSearchTags.includes(lowerTag)) {
        appState.activeSearchTags.push(lowerTag);
        recordTagUsage(tag);
    }
    switchTab('search');
    applyFilters();
}

// ====== Image Upload ======
async function handleFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showToast('이미지 파일을 선택해주세요');
        return;
    }

    closeModal('addImageModal');
    document.getElementById('progressOverlay').style.display = 'flex';

    const quickAdd = document.getElementById('quickAddCheckbox').checked;

    for (let i = 0; i < imageFiles.length; i++) {
        try {
            const file = imageFiles[i];
            const dataURL = await fileToDataURL(file);
            const thumbnail = await generateThumbnail(dataURL);

            const imageData = {
                id: Date.now() + i,
                thumbnail: thumbnail,
                original: dataURL,
                tags: [],
                memo: '',
                createdAt: new Date().toISOString()
            };

            await dbSaveImage(imageData);
            appState.allImages.push(imageData);

            document.getElementById('progressFill').style.width = ((i + 1) / imageFiles.length * 100) + '%';
            document.getElementById('progressText').textContent = `${i + 1} / ${imageFiles.length}`;
        } catch (error) {
            console.error('Error processing image:', error);
        }
    }

    document.getElementById('progressOverlay').style.display = 'none';
    document.getElementById('imageInput').value = '';
    updateInfoDisplay();
    renderArchiveGrid();
    applyFilters();
    showToast('저장되었습니다');

    if (!quickAdd && appState.allImages.length > 0) {
        setTimeout(() => {
            openEditModal(appState.allImages[appState.allImages.length - 1].id);
        }, 300);
    }
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function generateThumbnail(dataURL) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > 400) {
                    height = Math.round(height * 400 / width);
                    width = 400;
                }
            } else {
                if (height > 400) {
                    width = Math.round(width * 400 / height);
                    height = 400;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = dataURL;
    });
}

// ====== Image Viewer ======
function openViewer(index) {
    appState.currentImageIndex = index;
    showViewerImage();
    document.getElementById('imageViewer').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeViewer() {
    document.getElementById('imageViewer').style.display = 'none';
    document.body.style.overflow = '';
}

function showViewerImage() {
    const image = appState.filteredImages[appState.currentImageIndex];
    if (!image) return;

    document.getElementById('viewerImage').src = image.original;
    document.getElementById('viewerImage').dataset.id = image.id;
    document.getElementById('viewerCounter').textContent = `${appState.currentImageIndex + 1} / ${appState.filteredImages.length}`;
}

function nextViewerImage() {
    if (appState.currentImageIndex < appState.filteredImages.length - 1) {
        appState.currentImageIndex++;
        showViewerImage();
    }
}

function prevViewerImage() {
    if (appState.currentImageIndex > 0) {
        appState.currentImageIndex--;
        showViewerImage();
    }
}

function openEditFromViewer() {
    const image = appState.filteredImages[appState.currentImageIndex];
    if (!image) return;
    closeViewer();
    openEditModal(image.id);
}

// ====== Edit Modal ======
async function openEditModal(imageId) {
    const image = await dbGetImage(imageId);
    if (!image) return;

    appState.currentEditImageId = imageId;
    document.getElementById('editPreviewImage').src = image.original;
    document.getElementById('editPreviewImage').dataset.id = imageId;
    document.getElementById('editMemo').value = image.memo || '';

    renderEditSelectedTags(image.tags);
    openModal('editModal');
}

function renderEditSelectedTags(tags) {
    const container = document.getElementById('editSelectedTags');
    container.innerHTML = tags.map(tag => `
        <div class="tag-selected">
            ${tag}
            <span class="tag-remove" onclick="removeEditTag('${tag}')">✕</span>
        </div>
    `).join('');
}

function removeEditTag(tag) {
    const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
    if (!image) return;
    image.tags = image.tags.filter(t => t !== tag);
    renderEditSelectedTags(image.tags);
}

async function saveImageEdit() {
    const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
    if (!image) return;

    image.memo = document.getElementById('editMemo').value;
    await dbUpdateImage(image);
    closeModal('editModal');
    applyFilters();
    renderArchiveGrid();
    showToast('저장되었습니다');
}

// ====== Tag Picker ======
function openTagPicker() {
    document.getElementById('tagPickerOverlay').style.display = 'block';
    document.getElementById('tagPicker').style.display = 'flex';
    document.getElementById('tagPickerSearch').value = '';
    renderTagPicker('');
}

function closeTagPicker() {
    document.getElementById('tagPickerOverlay').style.display = 'none';
    document.getElementById('tagPicker').style.display = 'none';
}

function renderTagPicker(searchQuery) {
    const content = document.getElementById('tagPickerContent');
    let html = '';

    // Recent tags
    if (!searchQuery && appState.recentTags.length > 0) {
        html += `
            <div class="tag-picker-section">
                <div class="tag-picker-section-title">최근</div>
                <div class="tag-picker-badges">
                    ${appState.recentTags.map(tag => `
                        <button class="tag-badge ${isTagSelected(tag) ? 'selected' : ''}" 
                                onclick="selectTag('${tag}')">${tag}</button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Popular tags
    const popularTags = Object.entries(appState.tagFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(entry => entry[0])
        .filter(tag => !searchQuery || tag.toLowerCase().includes(searchQuery));

    if (popularTags.length > 0) {
        html += `
            <div class="tag-picker-section">
                <div class="tag-picker-section-title">자주 쓰는 태그</div>
                <div class="tag-picker-badges">
                    ${popularTags.map(tag => `
                        <button class="tag-badge ${isTagSelected(tag) ? 'selected' : ''}" 
                                onclick="selectTag('${tag}')">${tag}</button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Categories
    const categories = {
        스타일: ['꾸안꾸', '꾸꾸꾸'],
        색상: ['흰색', '검정', '회색', '베이지', '브라운', '네이비', '블루', '그린', '올리브', '카키', '레드', '핑크'],
        아이템: ['가디건', '원피스', '치마', '바지', '코트', '자켓', '니트', '스니커즈', '부츠', '로퍼', '샌들', '가방', '머플러']
    };

    for (const [category, tags] of Object.entries(categories)) {
        const filtered = tags.filter(tag => !searchQuery || tag.toLowerCase().includes(searchQuery));
        if (filtered.length > 0) {
            html += `
                <div class="tag-picker-section">
                    <div class="tag-picker-section-title">${category}</div>
                    <div class="tag-picker-badges">
                        ${filtered.map(tag => `
                            <button class="tag-badge ${isTagSelected(tag) ? 'selected' : ''}" 
                                    onclick="selectTag('${tag}')">${tag}</button>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    // New tag option
    if (searchQuery && !appState.allTags.includes(searchQuery)) {
        html += `
            <div class="tag-picker-section">
                <button class="tag-badge-new" onclick="createNewTag('${searchQuery}')">
                    + '${searchQuery}' 태그 만들기
                </button>
            </div>
        `;
    }

    content.innerHTML = html;
}

function isTagSelected(tag) {
    if (appState.currentTagPickerTarget === 'search') {
        return appState.activeSearchTags.includes(tag.toLowerCase());
    } else if (appState.currentTagPickerTarget === 'edit') {
        const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
        return image && image.tags.includes(tag);
    }
    return false;
}

function selectTag(tag) {
    if (appState.currentTagPickerTarget === 'search') {
        const lowerTag = tag.toLowerCase();
        const index = appState.activeSearchTags.indexOf(lowerTag);
        if (index !== -1) {
            appState.activeSearchTags.splice(index, 1);
        } else {
            appState.activeSearchTags.push(lowerTag);
            recordTagUsage(tag);
        }
        applyFilters();
        renderTagPicker(document.getElementById('tagPickerSearch').value.toLowerCase());
    } else if (appState.currentTagPickerTarget === 'edit') {
        const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
        if (!image) return;

        const index = image.tags.indexOf(tag);
        if (index !== -1) {
            image.tags.splice(index, 1);
        } else {
            image.tags.push(tag);
            recordTagUsage(tag);
        }
        renderEditSelectedTags(image.tags);
        renderTagPicker(document.getElementById('tagPickerSearch').value.toLowerCase());
    } else if (appState.currentTagPickerTarget === 'addTags') {
        appState.selectedImageIds.forEach(imageId => {
            const image = appState.allImages.find(img => img.id === imageId);
            if (image && !image.tags.includes(tag)) {
                image.tags.push(tag);
            }
        });
        renderTagPicker(document.getElementById('tagPickerSearch').value.toLowerCase());
    } else if (appState.currentTagPickerTarget === 'removeTags') {
        appState.selectedImageIds.forEach(imageId => {
            const image = appState.allImages.find(img => img.id === imageId);
            if (image) {
                image.tags = image.tags.filter(t => t !== tag);
            }
        });
        renderTagPicker(document.getElementById('tagPickerSearch').value.toLowerCase());
    }
}

async function createNewTag(tag) {
    const trimmed = tag.trim();
    if (!appState.allTags.includes(trimmed)) {
        appState.allTags.push(trimmed);
        await dbSaveTags(appState.allTags);
    }
    selectTag(trimmed);
}

// ====== Multi-select Actions ======
async function deleteSelectedImages() {
    for (const id of appState.selectedImageIds) {
        await dbDeleteImage(id);
    }
    appState.allImages = appState.allImages.filter(img => !appState.selectedImageIds.has(img.id));
    appState.selectedImageIds.clear();
    appState.isSelectMode = false;
    document.getElementById('selectModeBtn').textContent = '선택';
    updateMultiSelectBar();
    renderArchiveGrid();
    applyFilters();
    showToast('삭제되었습니다');
}

// ====== Settings ======
function exportData() {
    const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        images: appState.allImages,
        tags: appState.allTags
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outfit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('내보내졌습니다');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            const merge = confirm('기존 데이터와 병합하시겠습니까? (취소하면 덮어씌워집니다)');

            if (!merge) {
                await dbClearAll();
                appState.allImages = [];
            }

            appState.allImages = [...appState.allImages, ...data.images];
            appState.allTags = [...new Set([...appState.allTags, ...data.tags])];

            await dbSaveTags(appState.allTags);
            for (const image of data.images) {
                try {
                    await dbSaveImage(image);
                } catch (error) {
                    console.warn('Image might already exist:', image.id);
                }
            }

            await loadAllData();
            renderArchiveGrid();
            applyFilters();
            showToast('가져왔습니다');
        } catch (error) {
            showToast('가져오기 실패: ' + error.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

async function resetAll() {
    await dbClearAll();
    appState.allImages = [];
    appState.allTags = [];
    appState.selectedImageIds.clear();
    appState.activeSearchTags = [];
    localStorage.clear();
    location.reload();
}

// ====== UI Helpers ======
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showConfirm(text, callback) {
    document.getElementById('confirmText').textContent = text;
    document.getElementById('confirmOkBtn').onclick = callback;
    openModal('confirmModal');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

function updateInfoDisplay() {
    document.getElementById('imageCountInfo').textContent = appState.allImages.length;
    document.getElementById('tagCountInfo').textContent = appState.allTags.length;
}