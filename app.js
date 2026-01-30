// ====== Global State ======
const appState = {
    db: null,
    allImages: [],
    filteredImages: [],
    allTags: [],
    tagFrequency: {},
    recentTags: [],
    activeSearchTags: [],
    filterMode: 'and',
    sortBy: 'newest',
    currentEditImageId: null,
    currentTagPickerTarget: null,
    isTagEditMode: false,
    currentTagToRename: null,
    currentTagToDelete: null,
    useLocalStorage: false,
};

// ====== Initialization ======
document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ DOMContentLoaded - Starting app...');
    
    try {
        initializeViewportHeight();
        await initDB();
        await loadAllData();
        setupAllEventListeners();
        switchTab('search');
        console.log('✅ App ready!');
    } catch (error) {
        console.error('❌ Init error:', error);
    }
});

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

    appState.tagFrequency = {};
    appState.allImages.forEach(img => {
        img.tags.forEach(tag => {
            appState.tagFrequency[tag] = (appState.tagFrequency[tag] || 0) + 1;
        });
    });

    appState.recentTags = JSON.parse(localStorage.getItem('recentTags') || '[]');
    updateInfoDisplay();
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

// ====== Event Listeners Setup ======
function setupAllEventListeners() {
    console.log('🔗 Setting up event listeners...');

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Search Tab
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const clearBtn = document.getElementById('searchClearBtn');
            if (clearBtn) {
                clearBtn.style.display = searchInput.value ? 'flex' : 'none';
            }
            applyFilters();
        });
    }

    const searchClearBtn = document.getElementById('searchClearBtn');
    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchClearBtn.style.display = 'none';
            applyFilters();
        });
    }

    const filterToggle = document.getElementById('filterToggle');
    if (filterToggle) {
        filterToggle.addEventListener('click', () => {
            const options = document.getElementById('filterOptions');
            if (options) {
                options.style.display = options.style.display === 'none' ? 'flex' : 'none';
            }
        });
    }

    document.querySelectorAll('input[name="filterMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            appState.filterMode = e.target.value;
            applyFilters();
        });
    });

    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', (e) => {
            appState.sortBy = e.target.value;
            applyFilters();
        });
    }

    const tagPickerBtn = document.getElementById('tagPickerBtn');
    if (tagPickerBtn) {
        tagPickerBtn.addEventListener('click', () => {
            appState.currentTagPickerTarget = 'search';
            openTagPicker();
        });
    }

    // Archive Tab
    const addImageBtn = document.getElementById('addImageBtn');
    if (addImageBtn) {
        addImageBtn.addEventListener('click', () => {
            openModal('addImageModal');
        });
    }

    // Upload
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    
    if (uploadArea && imageInput) {
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
    }

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

    // Tags Tab - Edit Mode
    const editModeBtn = document.getElementById('editModeBtn');
    if (editModeBtn) {
        editModeBtn.addEventListener('click', () => {
            appState.isTagEditMode = true;
            updateTagEditMode();
            renderTagsList();
        });
    }

    const editDoneBtn = document.getElementById('editDoneBtn');
    if (editDoneBtn) {
        editDoneBtn.addEventListener('click', () => {
            appState.isTagEditMode = false;
            updateTagEditMode();
            renderTagsList();
        });
    }

    // Tags Search
    const tagsSearchInput = document.getElementById('tagsSearchInput');
    const tagsSearchClear = document.getElementById('tagsSearchClear');

    if (tagsSearchInput) {
        tagsSearchInput.addEventListener('input', () => {
            if (tagsSearchClear) {
                tagsSearchClear.style.display = tagsSearchInput.value ? 'flex' : 'none';
            }
            renderTagsList();
        });
    }

    if (tagsSearchClear) {
        tagsSearchClear.addEventListener('click', () => {
            tagsSearchInput.value = '';
            tagsSearchClear.style.display = 'none';
            renderTagsList();
        });
    }

    const tagsSortBy = document.getElementById('tagsSortBy');
    if (tagsSortBy) {
        tagsSortBy.addEventListener('change', () => {
            renderTagsList();
        });
    }

    // Settings
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', importData);
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('모든 데이터를 삭제하시겠습니까?')) {
                resetAll();
            }
        });
    }

    // Edit Modal
    const editTagPickerBtn = document.getElementById('editTagPickerBtn');
    if (editTagPickerBtn) {
        editTagPickerBtn.addEventListener('click', () => {
            appState.currentTagPickerTarget = 'edit';
            openTagPicker();
        });
    }

    const editSaveBtn = document.getElementById('editSaveBtn');
    if (editSaveBtn) {
        editSaveBtn.addEventListener('click', saveImageEdit);
    }

    const editDeleteBtn = document.getElementById('editDeleteBtn');
    if (editDeleteBtn) {
        editDeleteBtn.addEventListener('click', () => {
            const imageId = parseInt(document.getElementById('editPreviewImage').dataset.id);
            if (confirm('이미지를 삭제하시겠습니까?')) {
                deleteImage(imageId);
            }
        });
    }

    // Rename Tag Modal
    const renameTagCancelBtn = document.getElementById('renameTagCancelBtn');
    if (renameTagCancelBtn) {
        renameTagCancelBtn.addEventListener('click', () => {
            closeModal('renameTagModal');
        });
    }

    const renameTagOkBtn = document.getElementById('renameTagOkBtn');
    if (renameTagOkBtn) {
        renameTagOkBtn.addEventListener('click', () => {
            const newName = document.getElementById('renameTagInput').value.trim();
            if (newName && appState.currentTagToRename) {
                renameTag(appState.currentTagToRename, newName);
            }
        });
    }

    // Confirm Modal
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', () => {
            closeModal('confirmModal');
        });
    }

    // Tag Picker
    const tagPickerSearch = document.getElementById('tagPickerSearch');
    if (tagPickerSearch) {
        tagPickerSearch.addEventListener('input', (e) => {
            renderTagPicker(e.target.value.toLowerCase());
        });
    }

    const tagPickerOverlay = document.getElementById('tagPickerOverlay');
    if (tagPickerOverlay) {
        tagPickerOverlay.addEventListener('click', closeTagPicker);
    }

    console.log('✅ Event listeners setup complete');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const tabContent = document.getElementById(tabName + 'Tab');
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);

    if (tabContent) tabContent.classList.add('active');
    if (tabBtn) tabBtn.classList.add('active');

    const titles = { search: '검색', archive: '보관함', tags: '태그', settings: '설정' };
    const titleEl = document.querySelector('.header-title');
    if (titleEl) titleEl.textContent = titles[tabName];

    if (tabName === 'tags') {
        updateTagEditMode();
        renderTagsList();
    }
}

// ====== Tags Tab - Edit Mode ======
function updateTagEditMode() {
    const editModeBtn = document.getElementById('editModeBtn');
    const editDoneBtn = document.getElementById('editDoneBtn');
    const tagsTab = document.getElementById('tagsTab').classList.contains('active');

    if (appState.isTagEditMode && tagsTab) {
        if (editModeBtn) editModeBtn.style.display = 'none';
        if (editDoneBtn) editDoneBtn.style.display = 'block';
    } else {
        if (editModeBtn) editModeBtn.style.display = tagsTab ? 'block' : 'none';
        if (editDoneBtn) editDoneBtn.style.display = 'none';
    }
}

// ====== Search Tab ======
function applyFilters() {
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';
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
    if (!container) return;

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

    if (!grid || !empty || !info) return;

    if (appState.filteredImages.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        info.textContent = '';
        return;
    }

    empty.style.display = 'none';
    info.textContent = `${appState.filteredImages.length}개`;

    grid.innerHTML = appState.filteredImages.map((img, idx) => `
        <div class="image-card" data-id="${img.id}" onclick="openEditModal(${img.id})">
            <img src="${img.thumbnail}" alt="image" style="object-fit: contain;">
        </div>
    `).join('');
}

// ====== Archive Tab ======
function renderArchiveGrid() {
    const grid = document.getElementById('archiveGrid');
    const empty = document.getElementById('archiveEmptyState');

    if (!grid || !empty) return;

    if (appState.allImages.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    const sorted = [...appState.allImages].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    grid.innerHTML = sorted.map(img => `
        <div class="image-card" data-id="${img.id}" onclick="openEditModal(${img.id})">
            <img src="${img.thumbnail}" alt="image" style="object-fit: contain;">
        </div>
    `).join('');
}

// ====== Tags Tab ======
function renderTagsList() {
    const list = document.getElementById('tagsList');
    const empty = document.getElementById('tagsEmptyState');
    const searchQuery = document.getElementById('tagsSearchInput')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('tagsSortBy')?.value || 'frequency';

    if (!list || !empty) return;

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

    if (appState.isTagEditMode) {
        list.innerHTML = tags.map(tag => `
            <div class="tag-list-item">
                <div class="tag-list-item-left" onclick="openRenameTagModal('${tag}')">
                    <span class="tag-list-item-name">${tag}</span>
                </div>
                <div class="tag-list-item-right">
                    <span class="tag-count-badge">${appState.tagFrequency[tag] || 0}</span>
                    <button class="tag-delete-btn" onclick="openDeleteTagConfirm('${tag}')">−</button>
                </div>
            </div>
        `).join('');
    } else {
        list.innerHTML = tags.map(tag => `
            <div class="tag-list-item" onclick="addTagToSearch('${tag}')">
                <div class="tag-list-item-left">
                    <span class="tag-list-item-name">${tag}</span>
                </div>
                <div class="tag-list-item-right">
                    <span class="tag-count-badge">${appState.tagFrequency[tag] || 0}</span>
                </div>
            </div>
        `).join('');
    }
}

function addTagToSearch(tag) {
    const lowerTag = tag.toLowerCase();
    if (!appState.activeSearchTags.includes(lowerTag)) {
        appState.activeSearchTags.push(lowerTag);
    }
    switchTab('search');
    applyFilters();
}

// ====== Tag Management ======
function openRenameTagModal(tag) {
    appState.currentTagToRename = tag;
    const input = document.getElementById('renameTagInput');
    if (input) {
        input.value = tag;
        input.focus();
        input.select();
    }
    openModal('renameTagModal');
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

    // 새 태그가 이미 존재하면 병합
    const isExisting = appState.allTags.includes(newTag);

    // 모든 이미지의 태그 업데이트
    appState.allImages.forEach(img => {
        img.tags = img.tags.map(tag => tag === oldTag ? newTag : tag);
        img.tags = [...new Set(img.tags)]; // 중복 제거
    });

    // 각 이미지 업데이트
    for (const img of appState.allImages) {
        await dbUpdateImage(img);
    }

    // 태그 목록 업데이트
    if (!isExisting) {
        appState.allTags = appState.allTags.filter(t => t !== oldTag);
        appState.allTags.push(newTag);
        appState.allTags.sort();
    } else {
        appState.allTags = appState.allTags.filter(t => t !== oldTag);
    }
    await dbSaveTags(appState.allTags);

    // 빈도 업데이트
    if (appState.tagFrequency[oldTag]) {
        appState.tagFrequency[newTag] = appState.tagFrequency[oldTag];
        delete appState.tagFrequency[oldTag];
    }

    closeModal('renameTagModal');
    renderTagsList();
    applyFilters();
    renderSearchGrid();
    renderTagPicker(document.getElementById('tagPickerSearch')?.value.toLowerCase() || '');
    showToast('태그명 변경됨');
}

function openDeleteTagConfirm(tag) {
    const count = appState.tagFrequency[tag] || 0;
    appState.currentTagToDelete = tag;
    
    const text = `태그 '${tag}'를 삭제할까요?\n이 태그가 ${count}개 코디에 적용되어 있습니다.`;
    showConfirm(text, deleteTag);
}

async function deleteTag() {
    const tag = appState.currentTagToDelete;
    if (!tag) return;

    // 모든 이미지에서 태그 제거
    appState.allImages.forEach(img => {
        img.tags = img.tags.filter(t => t !== tag);
    });

    for (const img of appState.allImages) {
        await dbUpdateImage(img);
    }

    // 태그 목록에서 제거
    appState.allTags = appState.allTags.filter(t => t !== tag);
    await dbSaveTags(appState.allTags);

    // 빈도 제거
    delete appState.tagFrequency[tag];

    renderTagsList();
    applyFilters();
    renderSearchGrid();
    showToast('태그 삭제됨');
    closeModal('confirmModal');
}

// ====== Upload ======
async function handleFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showToast('이미지를 선택해주세요');
        return;
    }

    closeModal('addImageModal');
    document.getElementById('progressOverlay').style.display = 'flex';

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
            console.error('Error:', error);
        }
    }

    document.getElementById('progressOverlay').style.display = 'none';
    updateInfoDisplay();
    renderArchiveGrid();
    applyFilters();
    showToast(`${imageFiles.length}개 저장됨`);
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

// ====== Edit Modal ======
async function openEditModal(imageId) {
    const image = await dbGetImage(imageId);
    if (!image) return;

    appState.currentEditImageId = imageId;
    document.getElementById('editPreviewImage').src = image.original;
    document.getElementById('editPreviewImage').dataset.id = imageId;
    document.getElementById('editMemo').value = image.memo || '';

    const tagContainer = document.getElementById('editSelectedTags');
    if (tagContainer) {
        tagContainer.innerHTML = image.tags.map(tag => `
            <div class="tag-selected">
                ${tag}
                <span class="tag-remove" onclick="removeEditTag('${tag}')">✕</span>
            </div>
        `).join('');
    }

    openModal('editModal');
}

function removeEditTag(tag) {
    const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
    if (!image) return;
    image.tags = image.tags.filter(t => t !== tag);
    const tagContainer = document.getElementById('editSelectedTags');
    if (tagContainer) {
        tagContainer.innerHTML = image.tags.map(t => `
            <div class="tag-selected">
                ${t}
                <span class="tag-remove" onclick="removeEditTag('${t}')">✕</span>
            </div>
        `).join('');
    }
}

async function saveImageEdit() {
    const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
    if (!image) return;

    image.memo = document.getElementById('editMemo').value;
    await dbUpdateImage(image);
    closeModal('editModal');
    applyFilters();
    renderArchiveGrid();
    showToast('저장됨');
}

async function deleteImage(imageId) {
    await dbDeleteImage(imageId);
    appState.allImages = appState.allImages.filter(img => img.id !== imageId);
    closeModal('editModal');
    applyFilters();
    renderArchiveGrid();
    showToast('삭제됨');
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
    if (!content) return;

    let html = '';

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
                            <button class="tag-badge" onclick="selectTag('${tag}')">${tag}</button>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    content.innerHTML = html;
}

function selectTag(tag) {
    if (appState.currentTagPickerTarget === 'search') {
        const lowerTag = tag.toLowerCase();
        const index = appState.activeSearchTags.indexOf(lowerTag);
        if (index !== -1) {
            appState.activeSearchTags.splice(index, 1);
        } else {
            appState.activeSearchTags.push(lowerTag);
        }
        applyFilters();
        renderTagPicker(document.getElementById('tagPickerSearch')?.value.toLowerCase() || '');
    } else if (appState.currentTagPickerTarget === 'edit') {
        const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
        if (!image) return;

        const index = image.tags.indexOf(tag);
        if (index !== -1) {
            image.tags.splice(index, 1);
        } else {
            image.tags.push(tag);
        }

        const tagContainer = document.getElementById('editSelectedTags');
        if (tagContainer) {
            tagContainer.innerHTML = image.tags.map(t => `
                <div class="tag-selected">
                    ${t}
                    <span class="tag-remove" onclick="removeEditTag('${t}')">✕</span>
                </div>
            `).join('');
        }
    }
}

// ====== Settings ======
function exportData() {
    const data = {
        version: 1,
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
    showToast('내보냄');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            const merge = confirm('기존과 병합?');

            if (!merge) {
                await dbClearAll();
                appState.allImages = [];
            }

            appState.allImages = [...appState.allImages, ...data.images];
            appState.allTags = [...new Set([...appState.allTags, ...data.tags])];

            await dbSaveTags(appState.allTags);
            for (const image of data.images) {
                await dbSaveImage(image);
            }

            await loadAllData();
            renderArchiveGrid();
            applyFilters();
            showToast('가져옴');
        } catch (error) {
            showToast('실패: ' + error.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

async function resetAll() {
    await dbClearAll();
    appState.allImages = [];
    appState.allTags = [];
    localStorage.clear();
    location.reload();
}

// ====== UI Helpers ======
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function showConfirm(text, callback) {
    const confirmText = document.getElementById('confirmText');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    
    if (confirmText) confirmText.textContent = text;
    if (confirmOkBtn) confirmOkBtn.onclick = callback;
    
    openModal('confirmModal');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

function updateInfoDisplay() {
    const imageCount = document.getElementById('imageCountInfo');
    const tagCount = document.getElementById('tagCountInfo');

    if (imageCount) imageCount.textContent = appState.allImages.length;
    if (tagCount) tagCount.textContent = appState.allTags.length;
}