// ====== Default Structured Tags Config ======
const DEFAULT_STRUCTURED_TAGS_CONFIG = {
    itemCategory: {
        label: "아이템",
        values: ["상의", "아우터", "하의", "원피스", "신발"],
        multi: false
    },
    colors: {
        label: "색상",
        values: ["흰색", "검정", "회색", "베이지", "브라운", "네이비", "블루", "그린", "올리브", "카키", "레드", "핑크"],
        multi: true
    },
    shoeType: {
        label: "신발종류",
        values: ["스니커즈", "부츠", "로퍼", "샌들", "힐"],
        multi: false
    }
};

// ====== Global State ======
const appState = {
    db: null,
    allImages: [],
    filteredImages: [],
    allFreeTags: [],
    freeTagFrequency: {},
    recentFreeTags: [],
    structuredTagsConfig: {},
    
    // Structured filters (현재 적용된 필터)
    structuredFilters: {},
    activeFreeTags: [],
    
    filterMode: 'and',
    sortBy: 'newest',
    currentEditImageId: null,
    currentTagPickerTarget: null,
    currentEditingCategoryKey: null,
    useLocalStorage: false,
};

// ====== Initialization ======
document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ DOMContentLoaded - Starting app...');
    
    try {
        initializeViewportHeight();
        await initDB();
        loadStructuredTagsConfig();
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
        const request = indexedDB.open('OutfitArchive', 2);
        
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
            if (!db.objectStoreNames.contains('freeTags')) {
                db.createObjectStore('freeTags', { keyPath: 'name' });
            }
        };
    });
}

function loadStructuredTagsConfig() {
    const saved = localStorage.getItem('structuredTagsConfig');
    if (saved) {
        appState.structuredTagsConfig = JSON.parse(saved);
    } else {
        appState.structuredTagsConfig = JSON.parse(JSON.stringify(DEFAULT_STRUCTURED_TAGS_CONFIG));
        saveStructuredTagsConfig();
    }

    // Initialize filters
    appState.structuredFilters = {};
    for (const key of Object.keys(appState.structuredTagsConfig)) {
        if (appState.structuredTagsConfig[key].multi) {
            appState.structuredFilters[key] = [];
        } else {
            appState.structuredFilters[key] = null;
        }
    }
}

function saveStructuredTagsConfig() {
    localStorage.setItem('structuredTagsConfig', JSON.stringify(appState.structuredTagsConfig));
}

async function loadAllData() {
    appState.allImages = await dbGetAllImages();
    appState.allFreeTags = await dbGetFreeTags();

    appState.freeTagFrequency = {};
    appState.allImages.forEach(img => {
        img.freeTags.forEach(tag => {
            appState.freeTagFrequency[tag] = (appState.freeTagFrequency[tag] || 0) + 1;
        });
    });

    appState.recentFreeTags = JSON.parse(localStorage.getItem('recentFreeTags') || '[]');
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

function dbGetFreeTags() {
    if (appState.useLocalStorage) {
        return Promise.resolve(JSON.parse(localStorage.getItem('freeTags') || '[]'));
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['freeTags'], 'readonly');
        const store = transaction.objectStore('freeTags');
        const request = store.getAll();
        request.onsuccess = () => {
            const tags = request.result.map(item => item.name);
            resolve(tags);
        };
        request.onerror = () => reject(request.error);
    });
}

function dbSaveFreeTags(tags) {
    if (appState.useLocalStorage) {
        localStorage.setItem('freeTags', JSON.stringify(tags));
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const transaction = appState.db.transaction(['freeTags'], 'readwrite');
        const store = transaction.objectStore('freeTags');
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
        const transaction = appState.db.transaction(['images', 'freeTags'], 'readwrite');
        transaction.objectStore('images').clear();
        transaction.objectStore('freeTags').clear();
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

    // Tags Tab - Structured Categories
    const addStructuredCategoryBtn = document.getElementById('addStructuredCategoryBtn');
    if (addStructuredCategoryBtn) {
        addStructuredCategoryBtn.addEventListener('click', openAddCategoryModal);
    }

    const categoryModalCancelBtn = document.getElementById('categoryModalCancelBtn');
    if (categoryModalCancelBtn) {
        categoryModalCancelBtn.addEventListener('click', () => {
            closeModal('editCategoryModal');
        });
    }

    const categoryModalSaveBtn = document.getElementById('categoryModalSaveBtn');
    if (categoryModalSaveBtn) {
        categoryModalSaveBtn.addEventListener('click', saveCategory);
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

    // Confirm Modal
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', () => {
            closeModal('confirmModal');
        });
    }

// Tags Tab - Add Free Tag
    const addFreeTagBtn = document.getElementById('addFreeTagBtn');
    if (addFreeTagBtn) {
        addFreeTagBtn.addEventListener('click', openAddFreeTagModal);
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
        renderStructuredTagsList();
        renderTagsList();
    } else if (tabName === 'search') {
        renderStructuredFilters();
    }
}

// ====== Tags Tab - Structured Tags Management ======
function renderStructuredTagsList() {
    const container = document.getElementById('structuredTagsList');
    if (!container) return;

    let html = '';

    for (const [key, config] of Object.entries(appState.structuredTagsConfig)) {
        const modeLabel = config.multi ? '다중' : '단일';
        html += `
            <div class="structured-category-item">
                <div class="category-info">
                    <div class="category-name">${config.label}</div>
                    <div class="category-meta">${modeLabel} · ${config.values.length}개 값</div>
                    <div class="category-values">${config.values.join(', ')}</div>
                </div>
                <div class="category-actions">
                    <button class="btn-sm" onclick="openEditCategoryModal('${key}')">수정</button>
                    <button class="btn-sm btn-danger" onclick="deleteCategory('${key}')">삭제</button>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function openAddCategoryModal() {
    appState.currentEditingCategoryKey = null;
    document.getElementById('categoryModalTitle').textContent = '카테고리 추가';
    document.getElementById('categoryNameInput').value = '';
    document.getElementById('categoryMultiSelect').value = 'false';
    document.getElementById('categoryValuesInput').value = '';
    openModal('editCategoryModal');
}

function openEditCategoryModal(key) {
    const config = appState.structuredTagsConfig[key];
    appState.currentEditingCategoryKey = key;
    document.getElementById('categoryModalTitle').textContent = '카테고리 수정';
    document.getElementById('categoryNameInput').value = config.label;
    document.getElementById('categoryMultiSelect').value = config.multi.toString();
    document.getElementById('categoryValuesInput').value = config.values.join('\n');
    openModal('editCategoryModal');
}

function saveCategory() {
    const name = document.getElementById('categoryNameInput').value.trim();
    const multi = document.getElementById('categoryMultiSelect').value === 'true';
    const valuesText = document.getElementById('categoryValuesInput').value.trim();

    if (!name || !valuesText) {
        showToast('카테고리명과 값을 입력해주세요');
        return;
    }

    const values = valuesText.split('\n').map(v => v.trim()).filter(v => v);

    if (values.length === 0) {
        showToast('최소 1개 이상의 값이 필요합니다');
        return;
    }

    let key = appState.currentEditingCategoryKey;

    if (!key) {
        // 새 카테고리 추가
        key = name.toLowerCase().replace(/\s+/g, '_');
        if (appState.structuredTagsConfig[key]) {
            showToast('같은 이름의 카테고리가 이미 있습니다');
            return;
        }
    } else {
        // 기존 카테고리 수정 - 이미지의 구조화 태그 업데이트
        const oldConfig = appState.structuredTagsConfig[key];
        if (oldConfig.label !== name) {
            // 이름이 변경되면 모든 이미지에서 빈값으로 리셋
            appState.allImages.forEach(img => {
                img.structuredTags[key] = multi ? [] : null;
            });
        }
    }

    appState.structuredTagsConfig[key] = {
        label: name,
        values: values,
        multi: multi
    };

    // 필터 초기화
    if (multi) {
        appState.structuredFilters[key] = [];
    } else {
        appState.structuredFilters[key] = null;
    }

    saveStructuredTagsConfig();
    closeModal('editCategoryModal');
    renderStructuredTagsList();
    applyFilters();
    renderStructuredFilters();
    showToast('저장됨');
}

function deleteCategory(key) {
    const config = appState.structuredTagsConfig[key];
    if (confirm(`카테고리 '${config.label}'을(를) 삭제하시겠습니까?`)) {
        // 이미지에서 이 카테고리 제거
        appState.allImages.forEach(img => {
            delete img.structuredTags[key];
        });

        delete appState.structuredTagsConfig[key];
        delete appState.structuredFilters[key];

        saveStructuredTagsConfig();
        renderStructuredTagsList();
        applyFilters();
        renderStructuredFilters();
        showToast('카테고리 삭제됨');
    }
}

// ====== Tags Tab - Free Tags ======
function renderTagsList() {
    const list = document.getElementById('tagsList');
    const empty = document.getElementById('tagsEmptyState');
    const searchQuery = document.getElementById('tagsSearchInput')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('tagsSortBy')?.value || 'frequency';

    if (!list || !empty) return;

    let tags = [...appState.allFreeTags];

    if (searchQuery) {
        tags = tags.filter(tag => tag.toLowerCase().includes(searchQuery));
    }

    if (sortBy === 'frequency') {
        tags.sort((a, b) => (appState.freeTagFrequency[b] || 0) - (appState.freeTagFrequency[a] || 0));
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
        <div class="tag-list-item">
            <div class="tag-list-item-left" onclick="addFreeTagToSearch('${tag}')">
                <span class="tag-list-item-name">${tag}</span>
                <span class="tag-item-usage">${appState.freeTagFrequency[tag] || 0}개</span>
            </div>
            <div class="tag-list-item-right">
                <button class="btn-sm btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteFreeTags('${tag}')">삭제</button>
            </div>
        </div>
    `).join('');
}

// ====== Search Tab - Structured Filters ======
function renderStructuredFilters() {
    const container = document.getElementById('structuredFilters');
    if (!container) return;

    let html = '';

    for (const [key, config] of Object.entries(appState.structuredTagsConfig)) {
        const currentValue = appState.structuredFilters[key];
        let filterDisplay = '';

        if (config.multi && Array.isArray(currentValue) && currentValue.length > 0) {
            filterDisplay = currentValue.map(v => `<span class="filter-chip">${v} <span class="filter-chip-remove" onclick="removeStructuredFilter('${key}', '${v}')">✕</span></span>`).join('');
        } else if (!config.multi && currentValue) {
            filterDisplay = `<span class="filter-chip">${currentValue} <span class="filter-chip-remove" onclick="removeStructuredFilter('${key}', '${currentValue}')">✕</span></span>`;
        }

        if (filterDisplay) {
            html += `<div class="structured-filter-group">${filterDisplay}</div>`;
        }
    }

    container.innerHTML = html || '';
}

function removeStructuredFilter(key, value) {
    const config = appState.structuredTagsConfig[key];
    if (config.multi) {
        appState.structuredFilters[key] = appState.structuredFilters[key].filter(v => v !== value);
    } else {
        appState.structuredFilters[key] = null;
    }
    applyFilters();
}

// ====== Search Tab - Apply Filters ======
function applyFilters() {
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const searchTerms = searchText.split(/\s+/).filter(t => t);

    let filtered = appState.allImages.filter(img => {
        // Structured tag filtering
        for (const [key, config] of Object.entries(appState.structuredTagsConfig)) {
            const filterValue = appState.structuredFilters[key];

            if (config.multi && Array.isArray(filterValue) && filterValue.length > 0) {
                const imgValues = img.structuredTags[key] || [];
                const hasAny = filterValue.some(v => imgValues.includes(v));
                if (!hasAny) return false;
            } else if (!config.multi && filterValue) {
                if (img.structuredTags[key] !== filterValue) return false;
            }
        }

        // Free tag filtering
        if (appState.activeFreeTags.length > 0) {
            if (appState.filterMode === 'and') {
                const hasAllTags = appState.activeFreeTags.every(tag => 
                    img.freeTags.includes(tag)
                );
                if (!hasAllTags) return false;
            } else {
                const hasAnyTag = appState.activeFreeTags.some(tag => 
                    img.freeTags.includes(tag)
                );
                if (!hasAnyTag) return false;
            }
        }

        // Text search
        if (searchTerms.length > 0) {
            const hasAllTerms = searchTerms.every(term => {
                const inFreeTags = img.freeTags.some(tag => tag.toLowerCase().includes(term));
                const inMemo = img.memo && img.memo.toLowerCase().includes(term);
                const inStructured = Object.values(img.structuredTags).some(v => {
                    if (Array.isArray(v)) {
                        return v.some(item => item.toLowerCase().includes(term));
                    }
                    return v && v.toLowerCase().includes(term);
                });
                return inFreeTags || inMemo || inStructured;
            });
            if (!hasAllTerms) return false;
        }

        return true;
    });

    filtered.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return appState.sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

    appState.filteredImages = filtered;
    renderStructuredFilters();
    renderSelectedFilters();
    renderSearchGrid();
}

function renderSelectedFilters() {
    const container = document.getElementById('selectedFilters');
    if (!container) return;

    container.innerHTML = appState.activeFreeTags.map(tag => `
        <div class="filter-chip">
            ${tag}
            <span class="filter-chip-remove" onclick="removeSearchTag('${tag}')">✕</span>
        </div>
    `).join('');
}

function removeSearchTag(tag) {
    appState.activeFreeTags = appState.activeFreeTags.filter(t => t !== tag);
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

    grid.innerHTML = appState.filteredImages.map((img) => `
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

            const structuredTags = {};
            for (const [key, config] of Object.entries(appState.structuredTagsConfig)) {
                structuredTags[key] = config.multi ? [] : null;
            }

            const imageData = {
                id: Date.now() + i,
                thumbnail: thumbnail,
                original: dataURL,
                structuredTags: structuredTags,
                freeTags: [],
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

    renderEditStructuredTags(image.structuredTags);
    renderEditFreeTags(image.freeTags);

    openModal('editModal');
}

function renderEditStructuredTags(structuredTags) {
    const container = document.getElementById('editStructuredTags');
    if (!container) return;

    let html = '';

    for (const [key, config] of Object.entries(appState.structuredTagsConfig)) {
        const currentValue = structuredTags[key];
        const label = config.label;
        
        if (config.multi) {
            const selectedChips = config.values.map(value => `
                <button class="edit-structured-chip ${(currentValue || []).includes(value) ? 'selected' : ''}" 
                        onclick="toggleStructuredTagInEdit('${key}', '${value}')">
                    ${value}
                </button>
            `).join('');
            html += `
                <div class="edit-tag-category">
                    <span class="edit-tag-label">${label}:</span>
                    <div class="edit-tag-chips">${selectedChips}</div>
                </div>
            `;
        } else {
            const selectedChips = config.values.map(value => `
                <button class="edit-structured-chip ${currentValue === value ? 'selected' : ''}" 
                        onclick="setStructuredTagInEdit('${key}', '${value}')">
                    ${value}
                </button>
            `).join('');
            html += `
                <div class="edit-tag-category">
                    <span class="edit-tag-label">${label}:</span>
                    <div class="edit-tag-chips">${selectedChips}</div>
                </div>
            `;
        }
    }

    container.innerHTML = html;
}

function setStructuredTagInEdit(key, value) {
    const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
    if (!image) return;
    image.structuredTags[key] = image.structuredTags[key] === value ? null : value;
    renderEditStructuredTags(image.structuredTags);
}

function toggleStructuredTagInEdit(key, value) {
    const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
    if (!image) return;
    
    if (!image.structuredTags[key]) {
        image.structuredTags[key] = [];
    }
    
    const index = image.structuredTags[key].indexOf(value);
    if (index !== -1) {
        image.structuredTags[key].splice(index, 1);
    } else {
        image.structuredTags[key].push(value);
    }
    renderEditStructuredTags(image.structuredTags);
}

function renderEditFreeTags(freeTags) {
    const container = document.getElementById('editFreeTags');
    if (!container) return;

    container.innerHTML = freeTags.map(tag => `
        <div class="tag-selected">
            ${tag}
            <span class="tag-remove" onclick="removeFreeTagInEdit('${tag}')">✕</span>
        </div>
    `).join('');
}

function removeFreeTagInEdit(tag) {
    const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
    if (!image) return;
    image.freeTags = image.freeTags.filter(t => t !== tag);
    renderEditFreeTags(image.freeTags);
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

    if (appState.currentTagPickerTarget === 'search') {
        // 1. Structured Tags Section
        html += '<div class="tag-picker-section">';
        html += '<div class="tag-picker-section-title">구조화 필터</div>';

        for (const [key, config] of Object.entries(appState.structuredTagsConfig)) {
            const label = config.label;
            html += `<div class="structured-picker-category"><strong>${label}</strong></div>`;
            html += '<div class="tag-picker-badges">';

            config.values.forEach(value => {
                let isSelected = false;
                const filterValue = appState.structuredFilters[key];
                if (config.multi) {
                    isSelected = filterValue.includes(value);
                } else {
                    isSelected = filterValue === value;
                }

                html += `
                    <button class="tag-badge ${isSelected ? 'selected' : ''}" 
                            onclick="selectStructuredFilter('${key}', '${value}')">
                        ${value}
                    </button>
                `;
            });

            html += '</div>';
        }

        html += '</div>';

        // 2. Free Tags Section
        html += '<div class="tag-picker-section">';
        html += '<div class="tag-picker-section-title">자유 태그</div>';
        html += '<div class="tag-picker-badges">';

        appState.allFreeTags.filter(tag => !searchQuery || tag.toLowerCase().includes(searchQuery)).forEach(tag => {
            html += `
                <button class="tag-badge ${appState.activeFreeTags.includes(tag) ? 'selected' : ''}" 
                        onclick="selectFreeTag('${tag}')">
                    ${tag}
                </button>
            `;
        });

        html += '</div>';
        html += '</div>';

        // 3. New Free Tag Option
        if (searchQuery && !appState.allFreeTags.includes(searchQuery)) {
            html += `
                <div class="tag-picker-section">
                    <button class="tag-badge-new" onclick="createNewFreeTag('${searchQuery}')">
                        + '${searchQuery}' 태그 만들기
                    </button>
                </div>
            `;
        }
    } else if (appState.currentTagPickerTarget === 'edit') {
        // Edit mode: only free tags
        html += '<div class="tag-picker-section">';
        html += '<div class="tag-picker-section-title">자유 태그</div>';
        html += '<div class="tag-picker-badges">';

        appState.allFreeTags.filter(tag => !searchQuery || tag.toLowerCase().includes(searchQuery)).forEach(tag => {
            const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
            const isSelected = image && image.freeTags.includes(tag);

            html += `
                <button class="tag-badge ${isSelected ? 'selected' : ''}" 
                        onclick="selectFreeTagInEdit('${tag}')">
                    ${tag}
                </button>
            `;
        });

        html += '</div>';
        html += '</div>';

        // New tag option
        if (searchQuery && !appState.allFreeTags.includes(searchQuery)) {
            html += `
                <div class="tag-picker-section">
                    <button class="tag-badge-new" onclick="createNewFreeTagInEdit('${searchQuery}')">
                        + '${searchQuery}' 태그 만들기
                    </button>
                </div>
            `;
        }
    }

    content.innerHTML = html;
}

function selectStructuredFilter(key, value) {
    const config = appState.structuredTagsConfig[key];
    if (config.multi) {
        const index = appState.structuredFilters[key].indexOf(value);
        if (index !== -1) {
            appState.structuredFilters[key].splice(index, 1);
        } else {
            appState.structuredFilters[key].push(value);
        }
    } else {
        appState.structuredFilters[key] = appState.structuredFilters[key] === value ? null : value;
    }
    applyFilters();
    renderTagPicker(document.getElementById('tagPickerSearch')?.value.toLowerCase() || '');
}

function selectFreeTag(tag) {
    const index = appState.activeFreeTags.indexOf(tag);
    if (index !== -1) {
        appState.activeFreeTags.splice(index, 1);
    } else {
        appState.activeFreeTags.push(tag);
    }
    applyFilters();
    renderTagPicker(document.getElementById('tagPickerSearch')?.value.toLowerCase() || '');
}

function selectFreeTagInEdit(tag) {
    const image = appState.allImages.find(img => img.id === appState.currentEditImageId);
    if (!image) return;

    const index = image.freeTags.indexOf(tag);
    if (index !== -1) {
        image.freeTags.splice(index, 1);
    } else {
        image.freeTags.push(tag);
    }

    renderEditFreeTags(image.freeTags);
    renderTagPicker(document.getElementById('tagPickerSearch')?.value.toLowerCase() || '');
}

async function createNewFreeTag(tag) {
    const trimmed = tag.trim();
    if (!appState.allFreeTags.includes(trimmed)) {
        appState.allFreeTags.push(trimmed);
        appState.allFreeTags.sort();
        await dbSaveFreeTags(appState.allFreeTags);
    }
    selectFreeTag(trimmed);
}

async function createNewFreeTagInEdit(tag) {
    const trimmed = tag.trim();
    if (!appState.allFreeTags.includes(trimmed)) {
        appState.allFreeTags.push(trimmed);
        appState.allFreeTags.sort();
        await dbSaveFreeTags(appState.allFreeTags);
    }
    selectFreeTagInEdit(trimmed);
}

// ====== Settings ======
function exportData() {
    const data = {
        version: 2,
        images: appState.allImages,
        freeTags: appState.allFreeTags,
        structuredTagsConfig: appState.structuredTagsConfig
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
                appState.allFreeTags = [];
            }

            if (data.structuredTagsConfig) {
                appState.structuredTagsConfig = { ...appState.structuredTagsConfig, ...data.structuredTagsConfig };
                saveStructuredTagsConfig();
            }

            appState.allImages = [...appState.allImages, ...data.images];
            appState.allFreeTags = [...new Set([...appState.allFreeTags, ...(data.freeTags || [])])];

            await dbSaveFreeTags(appState.allFreeTags);
            for (const image of data.images) {
                await dbSaveImage(image);
            }

            await loadAllData();
            loadStructuredTagsConfig();
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
    appState.allFreeTags = [];
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
    if (tagCount) tagCount.textContent = appState.allFreeTags.length;
}



// ====== Add Free Tag Modal ======
function openAddFreeTagModal() {
    const newTag = prompt('추가할 태그명을 입력하세요');
    if (!newTag) return;

    const trimmed = newTag.trim();
    if (!trimmed) {
        showToast('태그명을 입력해주세요');
        return;
    }

    if (appState.allFreeTags.includes(trimmed)) {
        showToast('이미 있는 태그입니다');
        return;
    }

    addNewFreeTagImmediate(trimmed);
}

async function addNewFreeTagImmediate(tag) {
    appState.allFreeTags.push(tag);
    appState.allFreeTags.sort();
    await dbSaveFreeTags(appState.allFreeTags);
    appState.freeTagFrequency[tag] = 0;
    renderTagsList();
    updateInfoDisplay();
    showToast(`'${tag}' 추가됨`);
}

async function deleteFreeTags(tag) {
    const count = appState.freeTagFrequency[tag] || 0;
    if (count > 0) {
        if (!confirm(`이 태그가 ${count}개 이미지에 적용되어 있습니다.\n삭제하시겠습니까?`)) {
            return;
        }
        // 모든 이미지에서 이 태그 제거
        appState.allImages.forEach(img => {
            img.freeTags = img.freeTags.filter(t => t !== tag);
        });
        // 각 이미지 업데이트
        for (const img of appState.allImages) {
            await dbUpdateImage(img);
        }
    } else {
        if (!confirm(`'${tag}'을 삭제하시겠습니까?`)) {
            return;
        }
    }

    appState.allFreeTags = appState.allFreeTags.filter(t => t !== tag);
    delete appState.freeTagFrequency[tag];
    await dbSaveFreeTags(appState.allFreeTags);
    
    renderTagsList();
    applyFilters();
    renderSearchGrid();
    updateInfoDisplay();
    showToast('삭제됨');
}