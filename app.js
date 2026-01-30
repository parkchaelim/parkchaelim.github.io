// ====== Database Manager ======
class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbName = 'OutfitArchiveDB';
        this.version = 1;
        this.init();
    }

    init() {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = () => {
            console.error('IndexedDB open failed:', request.error);
        };

        request.onsuccess = () => {
            this.db = request.result;
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('images')) {
                const imageStore = db.createObjectStore('images', { keyPath: 'id' });
                imageStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            if (!db.objectStoreNames.contains('tags')) {
                db.createObjectStore('tags', { keyPath: 'name' });
            }
        };
    }

    async saveImage(imageData) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.add(imageData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getImage(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllImages() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateImage(imageData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.put(imageData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteImage(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async saveTags(tags) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tags'], 'readwrite');
            const store = transaction.objectStore('tags');
            store.clear();

            tags.forEach(tag => {
                store.add({ name: tag });
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getTags() {
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
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images', 'tags'], 'readwrite');
            transaction.objectStore('images').clear();
            transaction.objectStore('tags').clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
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

    static async generateThumbnail(dataURL, maxWidth = 300, maxHeight = 300) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * maxHeight / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = dataURL;
        });
    }
}

// ====== Tag Manager ======
class TagManager {
    constructor(db) {
        this.db = db;
        this.allTags = [];
        this.recentTags = [];
        this.defaultTags = {
            recent: [],
            color: ['흰색', '검정', '회색', '베이지', '브라운', '네이비', '블루', '그린', '올리브', '카키', '레드', '핑크'],
            item: ['가디건', '원피스', '치마', '바지', '코트', '자켓', '니트', '스니커즈', '부츠', '로퍼', '샌들', '가방', '머플러'],
            style: ['꾸안꾸', '꾸꾸꾸']
        };
        this.initTags();
    }

    async initTags() {
        this.allTags = await this.db.getTags();
        
        if (this.allTags.length === 0) {
            const allDefaultTags = [
                ...this.defaultTags.recent,
                ...this.defaultTags.color,
                ...this.defaultTags.item,
                ...this.defaultTags.style
            ];
            this.allTags = allDefaultTags;
            await this.db.saveTags(this.allTags);
        }

        // Load recent tags from localStorage
        this.recentTags = JSON.parse(localStorage.getItem('recentTags') || '[]');
    }

    getFilteredTags(input) {
        const lowerInput = input.toLowerCase();
        return this.allTags.filter(tag => 
            tag.toLowerCase().includes(lowerInput)
        ).slice(0, 10);
    }

    getTagsByCategory(category) {
        if (category === 'recent') {
            return this.recentTags.slice(0, 8);
        }
        return this.defaultTags[category] || [];
    }

    recordTagUsage(tag) {
        const index = this.recentTags.indexOf(tag);
        if (index > -1) {
            this.recentTags.splice(index, 1);
        }
        this.recentTags.unshift(tag);
        this.recentTags = this.recentTags.slice(0, 8);
        localStorage.setItem('recentTags', JSON.stringify(this.recentTags));
    }

    async addTag(tag) {
        const trimmedTag = tag.trim();
        if (!trimmedTag || this.allTags.includes(trimmedTag)) {
            return;
        }
        this.allTags.push(trimmedTag);
        this.allTags.sort();
        await this.db.saveTags(this.allTags);
        this.recordTagUsage(trimmedTag);
    }

    async addMultipleTags(tags) {
        for (const tag of tags) {
            await this.addTag(tag);
        }
    }
}

// ====== Search Manager ======
class SearchManager {
    static parseSearchQuery(query) {
        if (!query.trim()) return [];
        return query.split(/[\s,]+/)
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .map(tag => tag.toLowerCase());
    }

    static filterImages(images, searchTags, useOR = false) {
        if (searchTags.length === 0) return images;

        return images.filter(image => {
            const imageTags = image.tags.map(t => t.toLowerCase());
            
            if (useOR) {
                return searchTags.some(tag => imageTags.includes(tag));
            } else {
                return searchTags.every(tag => imageTags.includes(tag));
            }
        });
    }

    static sortImages(images, sortBy = 'newest') {
        const sorted = [...images];
        sorted.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
        });
        return sorted;
    }
}

// ====== UI Manager ======
class UIManager {
    constructor(db, tagManager) {
        this.db = db;
        this.tagManager = tagManager;
        this.currentImages = [];
        this.filteredImages = [];
        this.currentEditingImage = null;
        this.activeSearchTags = [];
        this.useORFilter = false;
        this.currentSortBy = 'newest';
        this.scrollPosition = {};
        this.selectedImageIds = new Set();
        this.currentCategory = 'recent';
        this.currentTab = 'storage';
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab Navigation
        document.getElementById('storageTab').addEventListener('click', () => {
            this.switchTab('storage');
        });
        document.getElementById('filterTab').addEventListener('click', () => {
            this.switchTab('filter');
        });

        // Search Trigger
        document.getElementById('searchTrigger').addEventListener('click', () => {
            this.switchTab('filter');
        });

        // Quick Add
        document.getElementById('quickAddBtn').addEventListener('click', () => {
            document.getElementById('uploadModal').style.display = 'flex';
        });

        document.getElementById('quickFileInput').addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            e.target.value = '';
        });

        // Grid Selector
        document.querySelectorAll('.grid-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.grid-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const cols = e.target.dataset.cols;
                const grid = document.getElementById('galleryGrid');
                const searchGrid = document.getElementById('searchResultGrid');
                
                grid.className = `gallery-grid gallery-grid-${cols}col`;
                searchGrid.className = `gallery-grid gallery-grid-${cols}col`;
                
                // Save preference
                localStorage.setItem('gridCols', cols);
            });
        });

        // Upload Modal
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('click', () => {
            document.getElementById('quickFileInput').click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary-color)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = 'var(--border-color)';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--border-color)';
            this.handleFiles(e.dataTransfer.files);
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
                this.handleFiles(files);
            }
        });

        // Filter Tab
        document.getElementById('searchInput').addEventListener('input', () => {
            this.updateTagList();
        });

        document.getElementById('searchClose').addEventListener('click', () => {
            this.switchTab('storage');
        });

        document.getElementById('toggleFilterMode').addEventListener('click', () => {
            this.useORFilter = !this.useORFilter;
            this.updateFilterModeText();
            this.applyFilters();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSortBy = e.target.value;
            this.applyFilters();
        });

        // Category Tabs
        document.querySelectorAll('.category-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.dataset.category;
                this.updateTagList();
            });
        });

        // Selection Mode
        document.getElementById('selectAllBtn').addEventListener('click', () => {
            document.querySelectorAll('.image-card-2col').forEach(card => {
                this.selectedImageIds.add(parseInt(card.dataset.id));
                card.classList.add('selected');
            });
            this.updateSelectionUI();
        });

        document.getElementById('deselectAllBtn').addEventListener('click', () => {
            this.selectedImageIds.clear();
            document.querySelectorAll('.image-card-2col').forEach(card => {
                card.classList.remove('selected');
            });
            this.updateSelectionUI();
        });

        document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
            this.showDeleteActionSheet();
        });

        // Edit Modal
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') this.closeEditModal();
        });

        document.querySelector('#editModal .modal-close').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.querySelector('#editModal .btn-back').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('editSaveBtn').addEventListener('click', () => {
            this.saveEditImage();
        });

        document.getElementById('editCancelBtn').addEventListener('click', () => {
            this.closeEditModal();
        });

        // Tag Quick Bar
        document.querySelectorAll('.quick-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.quick-category').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateQuickTags(e.target.dataset.category);
            });
        });

        // Edit Tag Input
        const editTagInput = document.getElementById('editTagInput');
        editTagInput.addEventListener('input', () => {
            this.updateEditTagSuggestions();
        });

        editTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addEditTag(editTagInput.value);
                editTagInput.value = '';
                editTagInput.focus();
            }
        });

        // Upload Modal Close
        document.getElementById('uploadModal').addEventListener('click', (e) => {
            if (e.target.id === 'uploadModal') {
                document.getElementById('uploadModal').style.display = 'none';
            }
        });

        document.querySelector('#uploadModal .modal-close').addEventListener('click', () => {
            document.getElementById('uploadModal').style.display = 'none';
        });

        // Delete Action Sheet
        document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
            this.confirmDeleteSelected();
        });

        document.getElementById('deleteCancel').addEventListener('click', () => {
            document.getElementById('deleteActionSheet').style.display = 'none';
        });
    }

    switchTab(tabName) {
        // Save scroll position
        if (this.currentTab === 'storage') {
            const gallery = document.getElementById('galleryGrid');
            if (gallery && gallery.parentElement) {
                this.scrollPosition['storage'] = gallery.parentElement.scrollTop;
            }
        }

        // Update tabs
        const isStorage = tabName === 'storage';
        document.getElementById('storageTab').classList.toggle('active', isStorage);
        document.getElementById('filterTab').classList.toggle('active', !isStorage);

        document.getElementById('storageTabContent').classList.toggle('active', isStorage);
        document.getElementById('filterTabContent').classList.toggle('active', !isStorage);

        this.currentTab = tabName;

        if (tabName === 'storage') {
            // Restore scroll position
            setTimeout(() => {
                const gallery = document.getElementById('galleryGrid');
                if (gallery && gallery.parentElement) {
                    gallery.parentElement.scrollTop = this.scrollPosition['storage'] || 0;
                }
            }, 0);
        }
    }

    async handleFiles(files) {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showToast('이미지 파일을 선택해주세요.', 'error');
            return;
        }

        document.getElementById('uploadModal').style.display = 'none';
        this.showUploadProgress(0, imageFiles.length);

        for (let i = 0; i < imageFiles.length; i++) {
            try {
                const file = imageFiles[i];
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

                await this.db.saveImage(imageData);
                this.updateUploadProgress(i + 1, imageFiles.length);
            } catch (error) {
                console.error('Error processing image:', error);
            }
        }

        this.hideUploadProgress();
        this.showToast(`저장됨 · 태그 추가하기`);
        await this.loadImages();
    }

    showUploadProgress(current, total) {
        const modal = document.getElementById('uploadProgressModal');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        modal.style.display = 'flex';
        progressFill.style.width = '0%';
        progressText.textContent = `0 / ${total}`;
    }

    updateUploadProgress(current, total) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        const percent = (current / total) * 100;
        progressFill.style.width = percent + '%';
        progressText.textContent = `${current} / ${total}`;
    }

    hideUploadProgress() {
        document.getElementById('uploadProgressModal').style.display = 'none';
    }

    updateTagList() {
        const searchInput = document.getElementById('searchInput').value.trim();
        const tagList = document.getElementById('tagList');
        let tags;

        if (searchInput) {
            tags = this.tagManager.getFilteredTags(searchInput);
        } else {
            tags = this.tagManager.getTagsByCategory(this.currentCategory);
        }

        tagList.innerHTML = tags.map(tag => `
            <div class="tag-chip" data-tag="${tag}">${tag}</div>
        `).join('');

        document.querySelectorAll('#tagList .tag-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const tag = chip.dataset.tag.toLowerCase();
                const index = this.activeSearchTags.indexOf(tag);
                
                if (index > -1) {
                    this.activeSearchTags.splice(index, 1);
                    chip.classList.remove('active');
                } else {
                    this.activeSearchTags.push(tag);
                    chip.classList.add('active');
                }

                this.updateActiveFilters();
                this.applyFilters();
                this.tagManager.recordTagUsage(chip.dataset.tag);
            });

            if (this.activeSearchTags.includes(chip.dataset.tag.toLowerCase())) {
                chip.classList.add('active');
            }
        });
    }

    updateActiveFilters() {
        const container = document.getElementById('activeFilters');
        container.innerHTML = this.activeSearchTags.map(tag => `
            <div class="active-filter-chip">
                ${tag}
                <span class="remove">✕</span>
            </div>
        `).join('');

        document.querySelectorAll('.active-filter-chip').forEach(chip => {
            chip.querySelector('.remove').addEventListener('click', () => {
                const tag = chip.textContent.trim().replace('✕', '').trim();
                const index = this.activeSearchTags.indexOf(tag);
                if (index > -1) {
                    this.activeSearchTags.splice(index, 1);
                }
                this.updateActiveFilters();
                this.updateTagList();
                this.applyFilters();
            });
        });
    }

    updateFilterModeText() {
        const btn = document.getElementById('toggleFilterMode');
        btn.querySelector('#filterModeText').textContent = 
            this.useORFilter ? '하나라도 포함' : '모두 포함';
    }

    applyFilters() {
        const sortBy = document.getElementById('sortBy').value;

        let filtered = SearchManager.filterImages(
            this.currentImages, 
            this.activeSearchTags, 
            this.useORFilter
        );
        filtered = SearchManager.sortImages(filtered, sortBy);

        this.filteredImages = filtered;
        this.updateResultInfo();
        this.renderSearchResults();
    }

    updateResultInfo() {
        const info = document.getElementById('resultInfo');
        const total = this.currentImages.length;
        const filtered = this.filteredImages.length;

        if (this.activeSearchTags.length === 0) {
            info.textContent = `전체 ${total}개`;
        } else {
            info.textContent = `${filtered}개 / 전체 ${total}개`;
        }
    }

    updateQuickTags(category) {
        const tags = this.tagManager.getTagsByCategory(category);
        const container = document.getElementById('quickTagChips');

        container.innerHTML = tags.map(tag => `
            <div class="tag-chip" data-tag="${tag}">${tag}</div>
        `).join('');

        document.querySelectorAll('#quickTagChips .tag-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.addEditTag(chip.dataset.tag);
                this.tagManager.recordTagUsage(chip.dataset.tag);
            });
        });
    }

    updateEditTagSuggestions() {
        const input = document.getElementById('editTagInput').value.trim();
        const suggestionsDiv = document.getElementById('editTagSuggestions');

        if (input.length === 0) {
            suggestionsDiv.classList.remove('active');
            return;
        }

        const suggestions = this.tagManager.getFilteredTags(input);
        const currentTags = Array.from(
            document.querySelectorAll('#editTagList .tag-item')
        ).map(el => el.textContent.trim().replace('✕', '').trim());

        const filtered = suggestions.filter(s => !currentTags.includes(s));

        if (filtered.length === 0) {
            suggestionsDiv.classList.remove('active');
            return;
        }

        suggestionsDiv.innerHTML = filtered.map(tag => 
            `<div class="suggestion-item" data-tag="${tag}">${tag}</div>`
        ).join('');
        suggestionsDiv.classList.add('active');

        document.querySelectorAll('#editTagSuggestions .suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.addEditTag(item.dataset.tag);
                document.getElementById('editTagInput').value = '';
                document.getElementById('editTagInput').focus();
            });
        });
    }

    addEditTag(tag) {
        const trimmedTag = tag.trim();
        if (!trimmedTag) return;

        const existingTags = Array.from(
            document.querySelectorAll('#editTagList .tag-item')
        ).map(el => el.textContent.trim().replace('✕', '').trim());

        if (existingTags.includes(trimmedTag)) return;

        const tagList = document.getElementById('editTagList');
        const tagEl = document.createElement('div');
        tagEl.className = 'tag-item';
        tagEl.innerHTML = `${trimmedTag}<span class="remove">✕</span>`;

        tagEl.querySelector('.remove').addEventListener('click', () => {
            tagEl.remove();
        });

        tagList.appendChild(tagEl);
        document.getElementById('editTagSuggestions').classList.remove('active');
    }

    async openEditModal(imageId) {
        const image = await this.db.getImage(imageId);
        if (!image) return;

        this.currentEditingImage = image;

        document.getElementById('editImage').src = image.original;
        document.getElementById('editMemo').value = image.memo || '';

        const tagList = document.getElementById('editTagList');
        tagList.innerHTML = '';
        image.tags.forEach(tag => {
            const tagEl = document.createElement('div');
            tagEl.className = 'tag-item';
            tagEl.innerHTML = `${tag}<span class="remove">✕</span>`;
            tagEl.querySelector('.remove').addEventListener('click', () => tagEl.remove());
            tagList.appendChild(tagEl);
        });

        document.getElementById('editTagInput').value = '';
        document.getElementById('editTagSuggestions').classList.remove('active');

        // Update quick tags
        this.updateQuickTags('recent');

        document.getElementById('editModal').style.display = 'flex';
        document.getElementById('editTagInput').focus();
    }

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.currentEditingImage = null;
    }

    async saveEditImage() {
        if (!this.currentEditingImage) return;

        const tags = Array.from(
            document.querySelectorAll('#editTagList .tag-item')
        ).map(el => el.textContent.trim().replace('✕', '').trim());

        const memo = document.getElementById('editMemo').value;

        this.currentEditingImage.tags = tags;
        this.currentEditingImage.memo = memo;

        try {
            await this.db.updateImage(this.currentEditingImage);
            await this.tagManager.addMultipleTags(tags);
            this.showToast('저장되었습니다.');
            this.closeEditModal();
            await this.loadImages();
        } catch (error) {
            this.showToast(`저장 실패: ${error.message}`, 'error');
        }
    }

    showDeleteActionSheet() {
        if (this.selectedImageIds.size === 0) {
            this.showToast('선택된 이미지가 없습니다.', 'error');
            return;
        }
        document.getElementById('deleteActionSheet').style.display = 'flex';
    }

    async confirmDeleteSelected() {
        if (this.selectedImageIds.size === 0) return;

        try {
            for (const id of this.selectedImageIds) {
                await this.db.deleteImage(id);
            }
            const count = this.selectedImageIds.size;
            this.showToast(`${count}개 삭제되었습니다.`);
            this.selectedImageIds.clear();
            document.getElementById('deleteActionSheet').style.display = 'none';
            await this.loadImages();
        } catch (error) {
            this.showToast(`삭제 실패: ${error.message}`, 'error');
        }
    }

    async loadImages() {
        try {
            this.currentImages = await this.db.getAllImages();
            this.renderGallery();
            this.updateRecentTags();
            
            // Load saved grid preference
            const savedCols = localStorage.getItem('gridCols') || '3';
            const gridBtn = document.querySelector(`[data-cols="${savedCols}"]`);
            if (gridBtn) {
                document.querySelectorAll('.grid-btn').forEach(b => b.classList.remove('active'));
                gridBtn.classList.add('active');
                
                const grid = document.getElementById('galleryGrid');
                const searchGrid = document.getElementById('searchResultGrid');
                grid.className = `gallery-grid gallery-grid-${savedCols}col`;
                searchGrid.className = `gallery-grid gallery-grid-${savedCols}col`;
            }
        } catch (error) {
            this.showToast(`로드 실패: ${error.message}`, 'error');
        }
    }

    renderGallery() {
        const grid = document.getElementById('galleryGrid');
        const emptyState = document.getElementById('emptyState');

        if (this.currentImages.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        const sorted = SearchManager.sortImages([...this.currentImages], 'newest');

        grid.innerHTML = sorted.map(image => `
            <div class="image-card-2col" data-id="${image.id}">
                <img src="${image.thumbnail}" alt="thumbnail">
                ${image.tags.length > 0 ? `
                    <div class="tag-overlay">
                        ${image.tags.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        ${image.tags.length > 2 ? `<span class="tag">+${image.tags.length - 2}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');

        grid.querySelectorAll('.image-card-2col').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    const id = parseInt(card.dataset.id);
                    if (this.selectedImageIds.has(id)) {
                        this.selectedImageIds.delete(id);
                        card.classList.remove('selected');
                    } else {
                        this.selectedImageIds.add(id);
                        card.classList.add('selected');
                    }
                    this.updateSelectionUI();
                } else {
                    const imageId = parseInt(card.dataset.id);
                    this.openEditModal(imageId);
                }
            });

            if (this.selectedImageIds.has(parseInt(card.dataset.id))) {
                card.classList.add('selected');
            }
        });

        this.updateSelectionUI();
    }

    renderSearchResults() {
        const grid = document.getElementById('searchResultGrid');
        const emptyState = document.getElementById('emptySearchState');

        if (this.filteredImages.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        grid.innerHTML = this.filteredImages.map(image => `
            <div class="image-card-2col" data-id="${image.id}">
                <img src="${image.thumbnail}" alt="thumbnail">
                ${image.tags.length > 0 ? `
                    <div class="tag-overlay">
                        ${image.tags.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        ${image.tags.length > 2 ? `<span class="tag">+${image.tags.length - 2}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');

        grid.querySelectorAll('.image-card-2col').forEach(card => {
            card.addEventListener('click', () => {
                const imageId = parseInt(card.dataset.id);
                this.openEditModal(imageId);
            });
        });
    }

    updateRecentTags() {
        const container = document.getElementById('recentTags');
        const tags = this.tagManager.recentTags.slice(0, 5);

        container.innerHTML = tags.map(tag => `
            <div class="tag-chip" data-tag="${tag}">${tag}</div>
        `).join('');

        document.querySelectorAll('#recentTags .tag-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.switchTab('filter');
                const tag = chip.dataset.tag.toLowerCase();
                if (!this.activeSearchTags.includes(tag)) {
                    this.activeSearchTags.push(tag);
                }
                this.updateActiveFilters();
                this.updateTagList();
                this.applyFilters();
            });
        });
    }

    updateSelectionUI() {
        const count = this.selectedImageIds.size;
        const selectionBar = document.getElementById('selectionBar');
        const selectionCount = document.getElementById('selectionCount');

        if (count > 0) {
            selectionBar.style.display = 'flex';
            selectionCount.textContent = `${count}개 선택`;
        } else {
            selectionBar.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }
}

// ====== Initialize ======
let db, tagManager, ui;

async function initApp() {
    db = new DatabaseManager();
    
    await new Promise(resolve => {
        const checkDb = setInterval(() => {
            if (db.db) {
                clearInterval(checkDb);
                resolve();
            }
        }, 100);
    });

    tagManager = new TagManager(db);
    await new Promise(resolve => {
        setTimeout(resolve, 500);
    });

    ui = new UIManager(db, tagManager);
    await ui.loadImages();
}

document.addEventListener('DOMContentLoaded', initApp);
