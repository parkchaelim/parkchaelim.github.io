// ====== Database Manager ======
class DatabaseManager {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        return new Promise((resolve) => {
            const request = indexedDB.open('OutfitArchive', 1);

            request.onerror = () => {
                console.error('IndexedDB init failed, using localStorage fallback');
                this.useLocalStorage = true;
                resolve();
            };

            request.onsuccess = () => {
                this.db = request.result;
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

    async saveImage(imageData) {
        if (this.useLocalStorage) {
            const images = JSON.parse(localStorage.getItem('images') || '[]');
            images.push(imageData);
            localStorage.setItem('images', JSON.stringify(images));
            return imageData.id;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.add(imageData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getImage(id) {
        if (this.useLocalStorage) {
            const images = JSON.parse(localStorage.getItem('images') || '[]');
            return images.find(img => img.id === id);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllImages() {
        if (this.useLocalStorage) {
            return JSON.parse(localStorage.getItem('images') || '[]');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateImage(imageData) {
        if (this.useLocalStorage) {
            const images = JSON.parse(localStorage.getItem('images') || '[]');
            const index = images.findIndex(img => img.id === imageData.id);
            if (index !== -1) {
                images[index] = imageData;
                localStorage.setItem('images', JSON.stringify(images));
            }
            return imageData.id;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.put(imageData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteImage(id) {
        if (this.useLocalStorage) {
            const images = JSON.parse(localStorage.getItem('images') || '[]');
            const filtered = images.filter(img => img.id !== id);
            localStorage.setItem('images', JSON.stringify(filtered));
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async saveTags(tags) {
        if (this.useLocalStorage) {
            localStorage.setItem('tags', JSON.stringify(tags));
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tags'], 'readwrite');
            const store = transaction.objectStore('tags');
            store.clear();

            tags.forEach(tag => store.add({ name: tag }));
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getTags() {
        if (this.useLocalStorage) {
            return JSON.parse(localStorage.getItem('tags') || '[]');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tags'], 'readonly');
            const store = transaction.objectStore('tags');
            const request = store.getAll();

            request.onsuccess = () => {
                const tags = request.result.map(item => item.name);
                resolve(tags);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async clearAll() {
        if (this.useLocalStorage) {
            localStorage.clear();
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images', 'tags'], 'readwrite');
            transaction.objectStore('images').clear();
            transaction.objectStore('tags').clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    exportData() {
        const images = JSON.parse(localStorage.getItem('images') || '[]');
        const tags = JSON.parse(localStorage.getItem('tags') || '[]');
        return {
            version: 1,
            exportDate: new Date().toISOString(),
            images,
            tags
        };
    }

    async importData(data, merge = false) {
        if (!merge) {
            await this.clearAll();
        }

        if (this.useLocalStorage) {
            let images = merge ? JSON.parse(localStorage.getItem('images') || '[]') : [];
            images = [...images, ...data.images];
            let tags = merge ? JSON.parse(localStorage.getItem('tags') || '[]') : [];
            tags = [...new Set([...tags, ...data.tags])];
            localStorage.setItem('images', JSON.stringify(images));
            localStorage.setItem('tags', JSON.stringify(tags));
        } else {
            for (const image of data.images) {
                await this.saveImage(image);
            }
            const existingTags = await this.getTags();
            const allTags = [...new Set([...existingTags, ...data.tags])];
            await this.saveTags(allTags);
        }
    }
}

// ====== Image Processor ======
class ImageProcessor {
    static async fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    static async generateThumbnail(dataURL) {
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
}

// ====== App State ======
const appState = {
    allImages: [],
    filteredImages: [],
    allTags: [],
    recentTags: [],
    selectedImageIds: new Set(),
    activeSearchTags: [],
    useORFilter: false,
    sortBy: 'newest',
    currentTab: 'search',
    scrollPositions: {},
    isSelectMode: false,
    db: null,
};

// ====== Initialization ======
async function initializeApp() {
    appState.db = new DatabaseManager();
    await appState.db.init();

    await loadAllData();
    setupEventListeners();
    setupTabNavigation();
    renderSearchTab();

    // Show search tab by default
    switchTab('search');
}

async function loadAllData() {
    appState.allImages = await appState.db.getAllImages();
    appState.allTags = await appState.db.getTags();
    
    if (appState.allTags.length === 0) {
        appState.allTags = [
            '꾸안꾸', '꾸꾸꾸',
            '가디건', '원피스', '치마', '바지', '코트', '자켓', '니트', '스니커즈', '부츠', '로퍼', '샌들', '가방', '머플러',
            '흰색', '검정', '회색', '베이지', '브라운', '네이비', '블루', '그린', '올리브', '카키', '레드', '핑크'
        ];
        await appState.db.saveTags(appState.allTags);
    }

    appState.recentTags = JSON.parse(localStorage.getItem('recentTags') || '[]');
    updateInfoDisplay();
}

function saveRecentTags() {
    localStorage.setItem('recentTags', JSON.stringify(appState.recentTags.slice(0, 10)));
}

function recordTagUsage(tag) {
    const index = appState.recentTags.indexOf(tag);
    if (index !== -1) {
        appState.recentTags.splice(index, 1);
    }
    appState.recentTags.unshift(tag);
    appState.recentTags = appState.recentTags.slice(0, 8);
    saveRecentTags();
}

// ====== Event Listeners ======
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const searchOptionsToggle = document.getElementById('searchOptionsToggle');
    const filterModeToggle = document.getElementById('filterModeToggle');
    const sortBy = document.getElementById('sortBy');
    const imageInput = document.getElementById('imageInput');
    const uploadArea = document.getElementById('uploadArea');
    const addImageBtn = document.getElementById('addImageBtn');

    searchInput.addEventListener('input', (e) => {
        searchClearBtn.style.display = e.target.value ? 'flex' : 'none';
        applyFilters();
    });

    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
        applyFilters();
    });

    searchOptionsToggle.addEventListener('click', () => {
        const options = document.getElementById('searchOptions');
        options.style.display = options.style.display === 'none' ? 'flex' : 'none';
    });

    filterModeToggle.addEventListener('click', () => {
        appState.useORFilter = !appState.useORFilter;
        const label = document.getElementById('filterModeLabel');
        label.textContent = appState.useORFilter ? '하나라도 포함' : '모두 포함';
        applyFilters();
    });

    sortBy.addEventListener('change', (e) => {
        appState.sortBy = e.target.value;
        applyFilters();
    });

    // Tag Categories
    document.querySelectorAll('.tag-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tag-category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderTagChips(e.target.dataset.category);
        });
    });

    // Upload
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

    // Archive Tab
    addImageBtn.addEventListener('click', () => {
        document.getElementById('addImageModal').classList.add('active');
    });

    document.getElementById('addImageCloseBtn').addEventListener('click', () => {
        document.getElementById('addImageModal').classList.remove('active');
    });

    document.getElementById('selectModeBtn').addEventListener('click', () => {
        appState.isSelectMode = !appState.isSelectMode;
        document.getElementById('selectModeBtn').textContent = appState.isSelectMode ? '완료' : '선택';
        updateSelectionUI();
    });

    document.getElementById('selectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('#archiveGrid .image-card').forEach(card => {
            appState.selectedImageIds.add(parseInt(card.dataset.id));
            card.classList.add('selected');
        });
        updateSelectionUI();
    });

    document.getElementById('deselectAllBtn').addEventListener('click', () => {
        appState.selectedImageIds.clear();
        document.querySelectorAll('#archiveGrid .image-card').forEach(card => {
            card.classList.remove('selected');
        });
        updateSelectionUI();
    });

    // Modal Actions
    document.getElementById('uploadConfirmBtn').addEventListener('click', async () => {
        const files = document.getElementById('imageInput').files;
        if (files.length === 0) {
            showToast('이미지를 선택해주세요');
            return;
        }
        await uploadImages(Array.from(files));
    });

    document.getElementById('detailCloseBtn').addEventListener('click', () => {
        closeDetailModal();
    });

    document.getElementById('detailSaveBtn').addEventListener('click', async () => {
        await saveImageDetail();
    });

    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
        showConfirmModal('정말 삭제하시겠습니까?', async () => {
            const imageId = parseInt(document.getElementById('detailImage').dataset.id);
            await appState.db.deleteImage(imageId);
            appState.allImages = appState.allImages.filter(img => img.id !== imageId);
            closeDetailModal();
            applyFilters();
            renderArchiveTab();
            showToast('삭제되었습니다');
        });
    });

    // Settings
    document.getElementById('exportBtn').addEventListener('click', () => {
        const data = appState.db.exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `outfit-archive-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('내보내졌습니다');
    });

    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const merge = confirm('기존 데이터와 병합하시겠습니까?');
                await appState.db.importData(data, merge);
                await loadAllData();
                applyFilters();
                renderArchiveTab();
                showToast('가져왔습니다');
            } catch (error) {
                showToast('가져오기 실패: ' + error.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        showConfirmModal('모든 데이터가 삭제됩니다. 계속하시겠습니까?', async () => {
            await appState.db.clearAll();
            appState.allImages = [];
            appState.allTags = [];
            appState.selectedImageIds.clear();
            await loadAllData();
            applyFilters();
            renderArchiveTab();
            renderTagsTab();
            showToast('초기화되었습니다');
        });
    });

    // Tag detail modal
    document.getElementById('detailCloseBtn').addEventListener('click', closeDetailModal);
    document.getElementById('confirmCancelBtn').addEventListener('click', () => {
        document.getElementById('confirmModal').classList.remove('active');
    });
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
    // Save scroll position
    const mainContent = document.querySelector('.main-content');
    if (appState.currentTab === 'archive') {
        appState.scrollPositions['archive'] = mainContent.scrollTop;
    } else if (appState.currentTab === 'search') {
        appState.scrollPositions['search'] = mainContent.scrollTop;
    }

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabBtn) {
        tabBtn.classList.add('active');
    }

    // Update header
    const titles = {
        search: '검색',
        archive: '보관함',
        tags: '태그',
        settings: '설정'
    };
    document.getElementById('headerTitle').textContent = titles[tabName];

    appState.currentTab = tabName;

    // Render content
    if (tabName === 'search') {
        renderSearchTab();
    } else if (tabName === 'archive') {
        renderArchiveTab();
    } else if (tabName === 'tags') {
        renderTagsTab();
    }

    // Restore scroll position
    setTimeout(() => {
        mainContent.scrollTop = appState.scrollPositions[tabName] || 0;
    }, 0);
}

// ====== Search Tab ======
function renderSearchTab() {
    renderTagChips('recent');
    applyFilters();
}

function renderTagChips(category) {
    const container = document.getElementById('tagChips');
    let tags = [];

    if (category === 'recent') {
        tags = appState.recentTags;
    } else if (category === 'popular') {
        const tagFreq = {};
        appState.allImages.forEach(img => {
            img.tags.forEach(tag => {
                tagFreq[tag] = (tagFreq[tag] || 0) + 1;
            });
        });
        tags = Object.entries(tagFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(entry => entry[0]);
    } else {
        const categoryMap = {
            color: ['흰색', '검정', '회색', '베이지', '브라운', '네이비', '블루', '그린', '올리브', '카키', '레드', '핑크'],
            item: ['가디건', '원피스', '치마', '바지', '코트', '자켓', '니트', '스니커즈', '부츠', '로퍼', '샌들', '가방', '머플러'],
            style: ['꾸안꾸', '꾸꾸꾸']
        };
        tags = categoryMap[category] || [];
    }

    container.innerHTML = tags.map(tag => `
        <button class="tag-chip ${appState.activeSearchTags.includes(tag.toLowerCase()) ? 'selected' : ''}" 
                onclick="toggleSearchTag('${tag}')">
            ${tag}
        </button>
    `).join('');
}

function toggleSearchTag(tag) {
    const lowerTag = tag.toLowerCase();
    const index = appState.activeSearchTags.indexOf(lowerTag);
    
    if (index !== -1) {
        appState.activeSearchTags.splice(index, 1);
    } else {
        appState.activeSearchTags.push(lowerTag);
        recordTagUsage(tag);
    }

    applyFilters();
    renderTagChips(document.querySelector('.tag-category-btn.active').dataset.category);
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase().trim();
    const searchTerms = searchInput ? searchInput.split(/\s+/) : [];

    let filtered = appState.allImages.filter(img => {
        const imageTags = img.tags.map(t => t.toLowerCase());
        
        // Search term matching
        if (searchTerms.length > 0) {
            const hasAllSearchTerms = searchTerms.every(term =>
                imageTags.some(tag => tag.includes(term)) ||
                (img.memo && img.memo.toLowerCase().includes(term))
            );
            if (!hasAllSearchTerms) return false;
        }

        // Tag filtering
        if (appState.activeSearchTags.length > 0) {
            if (appState.useORFilter) {
                return appState.activeSearchTags.some(tag => imageTags.includes(tag));
            } else {
                return appState.activeSearchTags.every(tag => imageTags.includes(tag));
            }
        }

        return true;
    });

    // Sorting
    filtered.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return appState.sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

    appState.filteredImages = filtered;
    renderSearchResults();
}

function renderSearchResults() {
    const grid = document.getElementById('searchResultsGrid');
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

    grid.innerHTML = appState.filteredImages.map(img => `
        <div class="image-card" data-id="${img.id}" onclick="openDetailModal(${img.id})">
            <img src="${img.thumbnail}" alt="image">
            ${img.tags.length > 0 ? `
                <div class="image-card-overlay">
                    ${img.tags.slice(0, 2).map(tag => `<span class="image-card-tag">${tag}</span>`).join('')}
                    ${img.tags.length > 2 ? `<span class="image-card-tag">+${img.tags.length - 2}</span>` : ''}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// ====== Archive Tab ======
function renderArchiveTab() {
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

    grid.innerHTML = sorted.map(img => `
        <div class="image-card ${appState.selectedImageIds.has(img.id) ? 'selected' : ''}" 
             data-id="${img.id}" 
             onclick="handleImageCardClick(event, ${img.id})">
            <img src="${img.thumbnail}" alt="image">
            ${img.tags.length > 0 ? `
                <div class="image-card-overlay">
                    ${img.tags.slice(0, 2).map(tag => `<span class="image-card-tag">${tag}</span>`).join('')}
                    ${img.tags.length > 2 ? `<span class="image-card-tag">+${img.tags.length - 2}</span>` : ''}
                </div>
            ` : ''}
        </div>
    `).join('');
}

function handleImageCardClick(event, imageId) {
    if (appState.isSelectMode) {
        if (appState.selectedImageIds.has(imageId)) {
            appState.selectedImageIds.delete(imageId);
        } else {
            appState.selectedImageIds.add(imageId);
        }
        updateSelectionUI();
        renderArchiveTab();
    } else {
        openDetailModal(imageId);
    }
}

function updateSelectionUI() {
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
function renderTagsTab() {
    const list = document.getElementById('tagsList');
    const sortBy = document.getElementById('tagsSortBy').value;

    let tags = [...appState.allTags];

    if (sortBy === 'frequency') {
        const tagFreq = {};
        appState.allImages.forEach(img => {
            img.tags.forEach(tag => {
                tagFreq[tag] = (tagFreq[tag] || 0) + 1;
            });
        });
        tags.sort((a, b) => (tagFreq[b] || 0) - (tagFreq[a] || 0));
    } else {
        tags.sort();
    }

    list.innerHTML = tags.map(tag => `
        <button class="tag-item" onclick="navigateToSearchWithTag('${tag}')">
            ${tag}
        </button>
    `).join('');
}

function navigateToSearchWithTag(tag) {
    appState.activeSearchTags = [tag.toLowerCase()];
    switchTab('search');
    applyFilters();
}

// ====== Detail Modal ======
async function openDetailModal(imageId) {
    const image = appState.allImages.find(img => img.id === imageId);
    if (!image) return;

    const modal = document.getElementById('imageDetailModal');
    const detailImage = document.getElementById('detailImage');
    const detailTagInput = document.getElementById('detailTagInput');
    const detailMemo = document.getElementById('detailMemo');
    const detailTagChips = document.getElementById('detailTagChips');

    detailImage.src = image.original;
    detailImage.dataset.id = imageId;
    detailTagInput.value = '';
    detailMemo.value = image.memo || '';
    
    detailTagChips.innerHTML = image.tags.map(tag => `
        <div class="tag-chip-selected">
            ${tag}
            <button class="tag-chip-remove-btn" onclick="removeTag('${tag}')">✕</button>
        </div>
    `).join('');

    // Setup autocomplete
    detailTagInput.addEventListener('input', () => {
        const value = detailTagInput.value.toLowerCase();
        const autocomplete = document.getElementById('tagAutocomplete');
        
        if (value) {
            const suggestions = appState.allTags.filter(tag =>
                tag.toLowerCase().includes(value) &&
                !image.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
            );
            
            if (suggestions.length > 0) {
                autocomplete.innerHTML = suggestions.map(tag => `
                    <div class="autocomplete-item" onclick="selectAutocompleteTag('${tag}')">${tag}</div>
                `).join('');
                autocomplete.style.display = 'block';
            } else {
                autocomplete.style.display = 'none';
            }
        } else {
            autocomplete.style.display = 'none';
        }
    });

    detailTagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const tag = detailTagInput.value.trim();
            if (tag && !image.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
                addTagToDetail(tag);
                detailTagInput.value = '';
            }
        }
    });

    modal.classList.add('active');
}

function addTagToDetail(tag) {
    const image = appState.allImages.find(img => img.id === parseInt(document.getElementById('detailImage').dataset.id));
    if (!image) return;

    const trimmedTag = tag.trim();
    if (!trimmedTag || image.tags.map(t => t.toLowerCase()).includes(trimmedTag.toLowerCase())) {
        return;
    }

    image.tags.push(trimmedTag);
    recordTagUsage(trimmedTag);

    const detailTagChips = document.getElementById('detailTagChips');
    const newChip = document.createElement('div');
    newChip.className = 'tag-chip-selected';
    newChip.innerHTML = `
        ${trimmedTag}
        <button class="tag-chip-remove-btn" onclick="removeTag('${trimmedTag}')">✕</button>
    `;
    detailTagChips.appendChild(newChip);

    document.getElementById('tagAutocomplete').style.display = 'none';
}

function selectAutocompleteTag(tag) {
    addTagToDetail(tag);
    document.getElementById('detailTagInput').value = '';
}

function removeTag(tag) {
    const image = appState.allImages.find(img => img.id === parseInt(document.getElementById('detailImage').dataset.id));
    if (!image) return;

    image.tags = image.tags.filter(t => t !== tag);
    
    const detailTagChips = document.getElementById('detailTagChips');
    const chips = detailTagChips.querySelectorAll('.tag-chip-selected');
    chips.forEach(chip => {
        if (chip.textContent.includes(tag)) {
            chip.remove();
        }
    });
}

async function saveImageDetail() {
    const imageId = parseInt(document.getElementById('detailImage').dataset.id);
    const image = appState.allImages.find(img => img.id === imageId);
    if (!image) return;

    const memo = document.getElementById('detailMemo').value;
    image.memo = memo;

    await appState.db.updateImage(image);
    closeDetailModal();
    applyFilters();
    renderArchiveTab();
    showToast('저장되었습니다');
}

function closeDetailModal() {
    document.getElementById('imageDetailModal').classList.remove('active');
}

// ====== Upload ======
async function handleFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showToast('이미지 파일을 선택해주세요');
        return;
    }

    await uploadImages(imageFiles);
}

async function uploadImages(files) {
    const quickSave = document.getElementById('quickSaveCheckbox')?.checked ?? true;
    
    document.getElementById('progressOverlay').style.display = 'flex';

    for (let i = 0; i < files.length; i++) {
        try {
            const file = files[i];
            const dataURL = await ImageProcessor.fileToDataURL(file);
            const thumbnail = await ImageProcessor.generateThumbnail(dataURL);

            const imageData = {
                id: Date.now() + i,
                thumbnail: thumbnail,
                original: dataURL,
                tags: [],
                memo: '',
                createdAt: new Date().toISOString()
            };

            await appState.db.saveImage(imageData);
            appState.allImages.push(imageData);

            const progress = Math.round(((i + 1) / files.length) * 100);
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('progressText').textContent = `${i + 1} / ${files.length}`;
        } catch (error) {
            console.error('Error processing image:', error);
        }
    }

    document.getElementById('progressOverlay').style.display = 'none';
    document.getElementById('addImageModal').classList.remove('active');
    document.getElementById('imageInput').value = '';

    applyFilters();
    renderArchiveTab();
    showToast('저장되었습니다');

    if (!quickSave && appState.allImages.length > 0) {
        const lastImage = appState.allImages[appState.allImages.length - 1];
        setTimeout(() => openDetailModal(lastImage.id), 300);
    }
}

// ====== Modal Helpers ======
function showConfirmModal(text, onConfirm) {
    document.getElementById('confirmText').textContent = text;
    document.getElementById('confirmOkBtn').onclick = () => {
        onConfirm();
        document.getElementById('confirmModal').classList.remove('active');
    };
    document.getElementById('confirmModal').classList.add('active');
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
    document.getElementById('imageCountInfo').textContent = appState.allImages.length + '개';
    document.getElementById('tagCountInfo').textContent = appState.allTags.length + '개';
}

// ====== Initialize ======
document.addEventListener('DOMContentLoaded', initializeApp);
