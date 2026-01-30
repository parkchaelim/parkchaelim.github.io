// ====== Global State ======
const appState = {
    db: null,
    allImages: [],
    filteredImages: [],
    allTags: [],
    tagMetadata: {}, // { tagName: { createdAt, usageCount, type } }
    recentTags: [],
    tagFrequency: {},
    selectedImageIds: new Set(),
    activeSearchTags: [],
    filterMode: 'and',
    sortBy: 'newest',
    currentImageIndex: 0,
    isSelectMode: false,
    isTagEditMode: false,
    currentEditImageId: null,
    currentTagPickerTarget: null,
    useLocalStorage: false,
};

// ====== Initialization ======
document.addEventListener('DOMContentLoaded', async () => {
    initializeViewportHeight();
    await initDB();
    await loadAllData();
    setupEventListeners();
    setupTabNavigation();
    switchTab('search');
});

// ====== Viewport Height Management ======
function initializeViewportHeight() {
    function updateHeight() {
        const height = window.visualViewport?.height || window.innerHeight;
        document.documentElement.style.setProperty('--app-height', height + 'px');
    }

    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateHeight);
    }
}

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
            if (!db.objectStoreNames.contains('tagMetadata')) {
                db.createObjectStore('tagMetadata', { keyPath: 'name' });
            }
        };
    });
}

async function loadAllData() {
    appState.allImages = await dbGetAllImages();
    appState.allTags = await dbGetTags();
    appState.tagMetadata = await dbGetTagMetadata();

    if (appState.allTags.length === 0) {
        appState.allTags = [
            '꾸안꾸', '꾸꾸꾸',
            '가디건', '원피스', '치마', '바지', '코트', '자켓', '니트', '스니커즈', '부츠', '로퍼', '샌들', '가방', '머플러',
            '흰색', '검정', '회색', '베이지', '브라운', '네이비', '블루', '그린', '올리브', '카키', '레드', '핑크'
        ];
        await dbSaveTags(appState.allTags);
        initializeTagMetadata();
    }

    appState.tagFrequency = {};
    appState.allImages.forEach(img => {
        img.tags.forEach(tag => {
            appState.tagFrequency[tag] = (appState.tagFrequency[tag] || 0) + 1;
            if (appState.tagMetadata[tag]) {
                appState.tagMetadata[tag].usageCount = appState.tagFrequency[tag];
            }
        });
    });

    appState.recentTags = JSON.parse(localStorage.getItem('recentTags') || '[]');
    updateInfoDisplay();
}

function initializeTagMetadata() {
    appState.allTags.forEach(tag => {
        if (!appState.tagMetadata[tag]) {
            appState.tagMetadata[tag] = {
                createdAt: new Date().toISOString(),
                usageCount: appState.tagFrequency[tag] || 0,
                type: 'custom'
            };
        }
    });
    dbSaveTagMetadata(appState.tagMetadata);
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

function dbGetTagMetadata() {
    if (appState.useLocalStorage) {
        return Promise.resolve(JSON.parse(localStorage.getItem('tagMetadata') || '{}'));
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['tagMetadata'], 'readonly');
        const store = transaction.objectStore('tagMetadata');
        const request = store.getAll();
        request.onsuccess = () => {
            const metadata = {};
            request.result.forEach(item => {
                metadata[item.name] = item;
            });
            resolve(metadata);
        };
        request.onerror = () => reject(request.error);
    });
}

function dbSaveTagMetadata(metadata) {
    if (appState.useLocalStorage) {
        localStorage.setItem('tagMetadata', JSON.stringify(metadata));
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['tagMetadata'], 'readwrite');
        const store = transaction.objectStore('tagMetadata');
        store.clear();
        Object.entries(metadata).forEach(([name, data]) => {
            store.add({ name, ...data });
        });
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
        const transaction = appState.db.transaction(['images', 'tags', 'tagMetadata'], 'readwrite');
        transaction.objectStore('images').clear();
        transaction.objectStore('tags').clear();
        transaction.objectStore('tagMetadata').clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

// ====== Event Listeners ======
function setupEventListeners() {
    // Archive - Select Mode
    const archiveTab = document.getElementById('archiveTab');
    archiveTab.addEventListener('click', (e) => {
        const card = e.target.closest('.image-card');
        if (!card) return;

        if (appState.isSelectMode) {
            const imageId = parseInt(card.dataset.id);
            if (appState.selectedImageIds.has(imageId)) {
                appState.selectedImageIds.delete(imageId);
            } else {
                appState.selectedImageIds.add(imageId);
            }
            updateSelectionUI();
            renderArchiveGrid();
        } else {
            const imageId = parseInt(card.dataset.id);
            openEditModal(imageId);
        }
    });

    // Long press for select mode
    let longPressTimer;
    archiveTab.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.image-card');
        if (!card || appState.isSelectMode) return;

        longPressTimer = setTimeout(() => {
            appState.isSelectMode = true;
            const imageId = parseInt(card.dataset.id);
            appState.selectedImageIds.add(imageId);
            updateSelectionUI();
            updateSelectModeBar();
            renderArchiveGrid();
        }, 500);
    });

    archiveTab.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });

    archiveTab.addEventListener('touchmove', () => {
        clearTimeout(longPressTimer);
    });

    // Select Mode Buttons (Archive)
    document.getElementById('selectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('#archiveGrid .image-card').forEach(card => {
            appState.selectedImageIds.add(parseInt(card.dataset.id));
        });
        updateSelectionUI();
        renderArchiveGrid();
    });

    document.getElementById('deselectAllBtn').addEventListener('click', () => {
        appState.selectedImageIds.clear();
        updateSelectionUI();
        renderArchiveGrid();
    });

    document.getElementById('selectDoneBtn').addEventListener('click', () => {
        appState.isSelectMode = false;
        appState.selectedImageIds.clear();
        updateSelectionUI();
        updateSelectModeBar();
        renderArchiveGrid();
    });

    // Multi-Action Bar
    document.getElementById('addTagsSelectedBtn').addEventListener('click', () => {
        if (appState.selectedImageIds.size === 0) return;
        appState.currentTagPickerTarget = 'addTags';
        openTagPicker();
    });

    document.getElementById('removeTagsSelectedBtn').addEventListener('click', () => {
        if (appState.selectedImageIds.size === 0) return;
        appState.currentTagPickerTarget = 'removeTags';
        openTagPicker();
    });

    document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
        if (appState.selectedImageIds.size === 0) return;
        const count = appState.selectedImageIds.size;
        showConfirm(
            `선택한 ${count}개 코디를 삭제할까요?\n되돌릴 수 없습니다.`,
            deleteSelectedImages
        );
    });

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

    // Archive - Add Image
    document.getElementById('addImageBtn').addEventListener('click', () => {
        openModal('addImageModal');
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

    // Tags Tab
    document.getElementById('editModeBtn').addEventListener('click', () => {
        appState.isTagEditMode = true;
        updateTagEditMode();
        renderTagsList(document.getElementById('tagsSortBy').value);
    });

    document.getElementById('editDoneBtn').addEventListener('click', () => {
        appState.isTagEditMode = false;
        updateTagEditMode();
        renderTagsList(document.getElementById('tagsSortBy').value);
    });

    const tagsSearchInput = document.getElementById('tagsSearchInput');
    const tagsSearchClear = document.getElementById('tagsSearchClear');

    tagsSearchInput.addEventListener('input', () => {
        tagsSearchClear.style.display = tagsSearchInput.value ? 'flex' : 'none';
        renderTagsList(document.getElementById('tagsSortBy').value);
    });

    tagsSearchClear.addEventListener('click', () => {
        tagsSearchInput.value = '';
        tagsSearchClear.style.display = 'none';
        renderTagsList(document.getElementById('tagsSortBy').value);
    });

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
        showConfirm('모든 데이터가 삭제됩니다.\n계속하시겠습니까?', resetAll);
    });

    document.getElementById('imageDisplayToggle').addEventListener('change', (e) => {
        const contain = e.target.checked;
        const grids = document.querySelectorAll('.grid-container .image-card img');
        grids.forEach(img => {
            img.style.objectFit = contain ? 'contain' : 'cover';
        });
        localStorage.setItem('imageDisplayMode', contain ? 'contain' : 'cover');
    });

    // Edit Modal
    document.getElementById('editTagPickerBtn').addEventListener('click', () => {
        appState.currentTagPickerTarget = 'edit';
        openTagPicker();
    });

    document.getElementById('editSaveBtn').addEventListener('click', saveImageEdit);
    document.getElementById('editDeleteBtn').addEventListener('click', () => {
        const imageId = parseInt(document.getElementById('editPreviewImage').dataset.id);
        showConfirm('이미지를 삭제하시겠습니까?\n되돌릴 수 없습니다.', async () => {
            await dbDeleteImage(imageId);
            appState.allImages = appState.allImages.filter(img => img.id !== imageId);
            closeModal('editModal');
            applyFilters();
            renderArchiveGrid();
            showToast('삭제되었습니다');
        });
    });

    // Confirm Modal
    document.getElementById('confirmCancelBtn').addEventListener('click', () => {
        closeModal('confirmModal');
    });

    // Rename Tag Modal
    document.getElementById('renameTagCancelBtn').addEventListener('click', () => {
        closeModal('renameTagModal');
    });

    document.getElementById('renameTagOkBtn').addEventListener('click', () => {
        const newName = document.getElementById('renameTagInput').value.trim();
        if (newName && appState.currentTagToRename) {
            renameTag(appState.currentTagToRename, newName);
        }
    });

    // Image Viewer
    document.getElementById('viewerBackBtn').addEventListener('click', closeViewer);
    document.getElementById('viewerDeleteBtn').addEventListener('click', () => {
        const imageId = appState.filteredImages[appState.currentImageIndex]?.id;
        if (!imageId) return;
        showConfirm('이미지를 삭제하시겠습니까?\n되돌릴 수 없습니다.', async () => {
            await dbDeleteImage(imageId);
            appState.allImages = appState.allImages.filter(img => img.id !== imageId);
            closeViewer();
            applyFilters();
            renderSearchGrid();
            showToast('삭제되었습니다');
        });
    });

    document.getElementById('viewerEditBtn').addEventListener('click', openEditFromViewer);

    // Viewer Swipe
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

    // Tag Picker Search
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

    if (tabName === 'archive') {
        updateSelectModeBar();
        renderArchiveGrid();
    } else if (tabName === 'tags') {
        updateTagEditMode();
        renderTagsList('frequency');
    }
}

// ====== Select Mode ======
function updateSelectionUI() {
    const count = appState.selectedImageIds.size;
    document.getElementById('selectionCount').textContent = `${count}개 선택`;

    const deleteBtn = document.getElementById('deleteSelectedBtn');
    deleteBtn.disabled = count === 0;
}

function updateSelectModeBar() {
    const selectModeBtn = document.getElementById('selectModeBtn');
    const selectModeBar = document.getElementById('selectModeBar');
    const multiActionBar = document.getElementById('multiActionBar');

    if (appState.isSelectMode && document.getElementById('archiveTab').classList.contains('active')) {
        selectModeBtn.style.display = 'none';
        selectModeBar.style.display = 'flex';
        multiActionBar.style.display = 'flex';
        document.documentElement.style.setProperty('--actionbar-height', '50px');
    } else {
        selectModeBtn.style.display = appState.currentTab === 'archive' ? 'block' : 'none';
        selectModeBar.style.display = 'none';
        multiActionBar.style.display = 'none';
        document.documentElement.style.setProperty('--actionbar-height', '0px');
    }

    updateSelectionUI();
}

// ====== Tag Edit Mode ======
function updateTagEditMode() {
    const editModeBtn = document.getElementById('editModeBtn');
    const editDoneBtn = document.getElementById('editDoneBtn');

    if (appState.isTagEditMode && document.getElementById('tagsTab').classList.contains('active')) {
        editModeBtn.style.display = 'none';
        editDoneBtn.style.display = 'block';
    } else {
        editModeBtn.style.display = document.getElementById('tagsTab').classList.contains('active') ? 'block' : 'none';
        editDoneBtn.style.display = 'none';
    }
}

// ====== Search Tab ======
function applyFilters() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const searchTerms = searchText.split(/\s+/).filter(t => t);

    let filtered = appState.allImages.filter(img => {
        if (searchTerms.length > 0) {
            const hasAllTerms = searchTerms.every(term =>
                img.tags.some(tag => tag.toLowerCase().includes(term)) ||
                (img.memo && img.memo.toLowerCase().includes(term))
            );
            if (!hasAllTerms) return false;
        }

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
             data-id="${img.id}">
            <img src="${img.thumbnail}" alt="image" style="object-fit: ${objectFit};">
        </div>
    `).join('');
}

// ====== Tags Tab ======
function renderTagsList(sortBy) {
    const list = document.getElementById('tagsList');
    const empty = document.getElementById('tagsEmptyState');
    const searchQuery = document.getElementById('tagsSearchInput').value.toLowerCase();

    let tags = [...appState.allTags];

    if (searchQuery) {
        tags = tags.filter(tag => tag.toLowerCase().includes(searchQuery));
    }

    if (sortBy === 'frequency') {
        tags.sort((a, b) => (appState.tagFrequency[b] || 0) - (appState.tagFrequency[a] || 0));
    } else {
        tags.sort();
    }

    if (tags.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    list.innerHTML = tags.map(tag => `
        <div class="tag-list-item" ${!appState.isTagEditMode ? `onclick="addTagToSearch('${tag}')"` : ''}>
            <div class="tag-list-item-left">
                ${appState.isTagEditMode ? `<div style="width: 6px; height: 6px; background: #ccc; border-radius: 50%;"></div>` : ''}
                <span class="tag-list-item-name">${tag}</span>
            </div>
            <div class="tag-list-item-right">
                <span class="tag-count-badge">${appState.tagFrequency[tag] || 0}</span>
                ${appState.isTagEditMode ? `
                    <button class="tag-delete-btn" onclick="openDeleteTagModal('${tag}')" style="margin: 0;">−</button>
                ` : ''}
            </div>
        </div>
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

// ====== Tag Management ======
async function openDeleteTagModal(tag) {
    const usageCount = appState.tagFrequency[tag] || 0;
    const text = `태그 '${tag}'를 삭제할까요?\n이 태그가 ${usageCount}개의 코디에 적용되어 있습니다.`;
    
    appState.currentTagToDelete = tag;
    showConfirm(text, deleteTag, true);
}

async function deleteTag() {
    const tag = appState.currentTagToDelete;
    if (!tag) return;

    // 모든 이미지에서 해당 태그 제거
    appState.allImages.forEach(img => {
        img.tags = img.tags.filter(t => t !== tag);
    });

    // 각 이미지 업데이트
    for (const img of appState.allImages) {
        await dbUpdateImage(img);
    }

    // 태그 목록에서 제거
    appState.allTags = appState.allTags.filter(t => t !== tag);
    await dbSaveTags(appState.allTags);

    // 메타데이터 제거
    delete appState.tagMetadata[tag];
    delete appState.tagFrequency[tag];
    await dbSaveTagMetadata(appState.tagMetadata);

    // UI 업데이트
    renderTagsList(document.getElementById('tagsSortBy').value);
    applyFilters();
    renderSearchGrid();
    showToast('태그 삭제됨');
    appState.currentTagToDelete = null;
}

async function renameTag(oldTag, newTag) {
    if (!newTag || newTag === oldTag) {
        closeModal('renameTagModal');
        return;
    }

    newTag = newTag.trim().replace(/\s+/g, ' ');
    if (!newTag) {
        showToast('태그명을 입력해주세요');
        return;
    }

    // 새 태그가 이미 존재하면 병합 처리
    const isExisting = appState.allTags.includes(newTag);

    // 모든 이미지의 태그 업데이트
    appState.allImages.forEach(img => {
        img.tags = img.tags.map(tag => tag === oldTag ? newTag : tag);
        // 중복 제거
        img.tags = [...new Set(img.tags)];
    });

    // 각 이미지 업데이트
    for (const img of appState.allImages) {
        await dbUpdateImage(img);
    }

    // 태그 목록 업데이트
    if (!isExisting) {
        // 기존 태그 제거, 새 태그 추가
        appState.allTags = appState.allTags.filter(t => t !== oldTag);
        appState.allTags.push(newTag);
        appState.allTags.sort();
        await dbSaveTags(appState.allTags);
    } else {
        // 기존 태그만 제거
        appState.allTags = appState.allTags.filter(t => t !== oldTag);
        await dbSaveTags(appState.allTags);
    }

    // 메타데이터 업데이트
    if (appState.tagMetadata[oldTag]) {
        appState.tagMetadata[newTag] = appState.tagMetadata[oldTag];
        delete appState.tagMetadata[oldTag];
    }
    await dbSaveTagMetadata(appState.tagMetadata);

    // 빈도 업데이트
    if (appState.tagFrequency[oldTag]) {
        appState.tagFrequency[newTag] = appState.tagFrequency[oldTag];
        delete appState.tagFrequency[oldTag];
    }

    // 최근 태그 업데이트
    appState.recentTags = appState.recentTags.map(t => t === oldTag ? newTag : t);
    saveRecentTags();

    // UI 업데이트
    closeModal('renameTagModal');
    renderTagsList(document.getElementById('tagsSortBy').value);
    applyFilters();
    renderSearchGrid();
    renderTagPicker(document.getElementById('tagPickerSearch').value.toLowerCase());
    showToast('태그명 변경됨');
}

// 태그 행 클릭 시 이름 변경 모달 열기 (편집모드일 때)
function openRenameTagModal(tag) {
    appState.currentTagToRename = tag;
    document.getElementById('renameTagTitle').textContent = `태그 이름 변경`;
    document.getElementById('renameTagInput').value = tag;
    openModal('renameTagModal');
    setTimeout(() => {
        document.getElementById('renameTagInput').focus();
        document.getElementById('renameTagInput').select();
    }, 300);
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
    showToast(`${imageFiles.length}개 저장되었습니다`);

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
}

function closeViewer() {
    document.getElementById('imageViewer').style.display = 'none';
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
        appState.allTags.sort();
        await dbSaveTags(appState.allTags);
        
        // 메타데이터 추가
        appState.tagMetadata[trimmed] = {
            createdAt: new Date().toISOString(),
            usageCount: 0,
            type: 'custom'
        };
        await dbSaveTagMetadata(appState.tagMetadata);
    }
    selectTag(trimmed);
}

// ====== Multi-select Actions ======
async function deleteSelectedImages() {
    const count = appState.selectedImageIds.size;
    for (const id of appState.selectedImageIds) {
        await dbDeleteImage(id);
    }
    appState.allImages = appState.allImages.filter(img => !appState.selectedImageIds.has(img.id));
    appState.selectedImageIds.clear();
    appState.isSelectMode = false;
    updateSelectModeBar();
    renderArchiveGrid();
    applyFilters();
    showToast(`${count}개 삭제됨`);
}

// ====== Settings ======
function exportData() {
    const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        images: appState.allImages,
        tags: appState.allTags,
        tagMetadata: appState.tagMetadata
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
            appState.allTags = [...new Set([...appState.allTags, ...(data.tags || [])])];
            appState.tagMetadata = { ...appState.tagMetadata, ...(data.tagMetadata || {}) };

            await dbSaveTags(appState.allTags);
            await dbSaveTagMetadata(appState.tagMetadata);
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

function showConfirm(text, callback, isDeletion = false) {
    document.getElementById('confirmText').textContent = text;
    const okBtn = document.getElementById('confirmOkBtn');
    okBtn.textContent = isDeletion ? '삭제' : '확인';
    okBtn.onclick = callback;
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
