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

            // Images store
            if (!db.objectStoreNames.contains('images')) {
                const imageStore = db.createObjectStore('images', { keyPath: 'id' });
                imageStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Tags store
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

    async exportData() {
        const images = await this.getAllImages();
        const tags = await this.getTags();
        return {
            version: this.version,
            exportDate: new Date().toISOString(),
            images,
            tags
        };
    }

    async importData(data, merge = false) {
        if (!merge) {
            await this.clearAll();
        }

        for (const image of data.images) {
            try {
                await this.saveImage(image);
            } catch (e) {
                console.warn('Error importing image:', e);
            }
        }

        const existingTags = await this.getTags();
        const allTags = [...new Set([...existingTags, ...data.tags])];
        await this.saveTags(allTags);
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
        this.defaultTags = [
            '꾸안꾸', '꾸꾸꾸',
            '가디건', '원피스', '치마', '바지', '코트', '자켓', '니트', 
            '스니커즈', '부츠', '로퍼', '샌들', '가방', '머플러',
            '흰색', '검정', '회색', '베이지', '브라운', '네이비', '블루', 
            '그린', '올리브', '카키', '레드', '핑크'
        ];
        this.initTags();
    }

    async initTags() {
        this.allTags = await this.db.getTags();
        
        if (this.allTags.length === 0) {
            this.allTags = [...this.defaultTags];
            await this.db.saveTags(this.allTags);
        }
    }

    getFilteredTags(input) {
        const lowerInput = input.toLowerCase();
        return this.allTags.filter(tag => 
            tag.toLowerCase().includes(lowerInput)
        ).slice(0, 8);
    }

    async addTag(tag) {
        const trimmedTag = tag.trim();
        if (!trimmedTag || this.allTags.includes(trimmedTag)) {
            return;
        }
        this.allTags.push(trimmedTag);
        this.allTags.sort();
        await this.db.saveTags(this.allTags);
    }

    async removeTag(tag) {
        this.allTags = this.allTags.filter(t => t !== tag);
        await this.db.saveTags(this.allTags);
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
        this.pendingImageData = null;
        this.activeSearchTags = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            fileInput.value = '';
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

        // Search
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        const filterMode = document.getElementById('filterMode');
        const sortBy = document.getElementById('sortBy');

        searchInput.addEventListener('input', () => {
            this.updateClearButton();
            this.applyFilters();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.updateClearButton();
            this.applyFilters();
        });

        filterMode.addEventListener('change', () => this.applyFilters());
        sortBy.addEventListener('change', () => this.applyFilters());

        // Export/Import
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
            e.target.value = '';
        });

        // Modal events
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') this.closeEditModal();
        });
        document.getElementById('tagModal').addEventListener('click', (e) => {
            if (e.target.id === 'tagModal') this.closeTagModal();
        });

        const editModalClose = document.querySelector('#editModal .modal-close');
        const tagModalClose = document.querySelector('#tagModal .modal-close');

        editModalClose.addEventListener('click', () => this.closeEditModal());
        tagModalClose.addEventListener('click', () => this.closeTagModal());

        document.getElementById('editSaveBtn').addEventListener('click', () => this.saveEditImage());
        document.getElementById('editDeleteBtn').addEventListener('click', () => this.deleteEditImage());
        document.getElementById('editCancelBtn').addEventListener('click', () => this.closeEditModal());

        document.getElementById('tagModalSaveBtn').addEventListener('click', () => this.saveNewImageTags());
        document.getElementById('tagModalSkipBtn').addEventListener('click', () => this.skipImageTags());

        // Tag input in edit modal
        const editTagInput = document.getElementById('editTagInput');
        editTagInput.addEventListener('input', () => this.updateEditTagSuggestions());
        editTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addEditTag(editTagInput.value);
                editTagInput.value = '';
                editTagInput.focus();
            }
        });

        // Tag input in tag modal
        const tagModalInput = document.getElementById('tagModalInput');
        tagModalInput.addEventListener('input', () => this.updateTagModalSuggestions());
        tagModalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addModalTag(tagModalInput.value);
                tagModalInput.value = '';
                tagModalInput.focus();
            }
        });
    }

    async handleFiles(files) {
        if (files.length === 0) return;

        for (let file of files) {
            if (!file.type.startsWith('image/')) continue;

            try {
                const dataURL = await ImageProcessor.fileToDataURL(file);
                const thumbnail = await ImageProcessor.generateThumbnail(dataURL);

                this.pendingImageData = {
                    original: dataURL,
                    thumbnail: thumbnail,
                    filename: file.name
                };

                this.openTagModal();
            } catch (error) {
                this.showToast(`이미지 처리 실패: ${error.message}`, 'error');
            }
        }
    }

    openTagModal() {
        document.getElementById('tagModal').style.display = 'flex';
        document.getElementById('tagModalInput').focus();
        document.getElementById('tagModalList').innerHTML = '';
        document.getElementById('tagModalInput').value = '';
    }

    closeTagModal() {
        document.getElementById('tagModal').style.display = 'none';
        this.pendingImageData = null;
    }

    async saveNewImageTags() {
        if (!this.pendingImageData) return;

        const tags = Array.from(
            document.querySelectorAll('#tagModalList .tag-item')
        ).map(el => el.textContent.trim().replace('✕', '').trim());

        const imageData = {
            id: Date.now(),
            thumbnail: this.pendingImageData.thumbnail,
            original: this.pendingImageData.original,
            tags: tags,
            memo: '',
            createdAt: new Date().toISOString()
        };

        try {
            await this.db.saveImage(imageData);
            await this.tagManager.addMultipleTags(tags);
            this.showToast('이미지가 추가되었습니다.');
            this.closeTagModal();
            await this.loadImages();
        } catch (error) {
            this.showToast(`저장 실패: ${error.message}`, 'error');
        }
    }

    skipImageTags() {
        if (!this.pendingImageData) return;

        const imageData = {
            id: Date.now(),
            thumbnail: this.pendingImageData.thumbnail,
            original: this.pendingImageData.original,
            tags: [],
            memo: '',
            createdAt: new Date().toISOString()
        };

        this.db.saveImage(imageData).then(() => {
            this.showToast('이미지가 추가되었습니다.');
            this.closeTagModal();
            this.loadImages();
        }).catch(error => {
            this.showToast(`저장 실패: ${error.message}`, 'error');
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

    updateTagModalSuggestions() {
        const input = document.getElementById('tagModalInput').value.trim();
        const suggestionsDiv = document.getElementById('tagModalSuggestions');

        if (input.length === 0) {
            suggestionsDiv.classList.remove('active');
            return;
        }

        const suggestions = this.tagManager.getFilteredTags(input);
        const currentTags = Array.from(
            document.querySelectorAll('#tagModalList .tag-item')
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

        document.querySelectorAll('#tagModalSuggestions .suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.addModalTag(item.dataset.tag);
                document.getElementById('tagModalInput').value = '';
                document.getElementById('tagModalInput').focus();
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
            document.getElementById('editTagSuggestions').classList.remove('active');
        });

        tagList.appendChild(tagEl);
        document.getElementById('editTagSuggestions').classList.remove('active');
    }

    addModalTag(tag) {
        const trimmedTag = tag.trim();
        if (!trimmedTag) return;

        const existingTags = Array.from(
            document.querySelectorAll('#tagModalList .tag-item')
        ).map(el => el.textContent.trim().replace('✕', '').trim());

        if (existingTags.includes(trimmedTag)) return;

        const tagList = document.getElementById('tagModalList');
        const tagEl = document.createElement('div');
        tagEl.className = 'tag-item';
        tagEl.innerHTML = `${trimmedTag}<span class="remove">✕</span>`;

        tagEl.querySelector('.remove').addEventListener('click', () => {
            tagEl.remove();
            document.getElementById('tagModalSuggestions').classList.remove('active');
        });

        tagList.appendChild(tagEl);
        document.getElementById('tagModalSuggestions').classList.remove('active');
    }

    async openEditModal(imageId) {
        const image = await this.db.getImage(imageId);
        if (!image) return;

        this.currentEditingImage = image;

        document.getElementById('editImage').src = image.original;
        document.getElementById('editDate').textContent = 
            new Date(image.createdAt).toLocaleString('ko-KR');
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

        document.getElementById('editModal').style.display = 'flex';
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
            this.showToast('이미지가 저장되었습니다.');
            this.closeEditModal();
            await this.loadImages();
        } catch (error) {
            this.showToast(`저장 실패: ${error.message}`, 'error');
        }
    }

    async deleteEditImage() {
        if (!this.currentEditingImage) return;

        if (confirm('정말로 삭제하시겠습니까?')) {
            try {
                await this.db.deleteImage(this.currentEditingImage.id);
                this.showToast('이미지가 삭제되었습니다.');
                this.closeEditModal();
                await this.loadImages();
            } catch (error) {
                this.showToast(`삭제 실패: ${error.message}`, 'error');
            }
        }
    }

    async loadImages() {
        try {
            this.currentImages = await this.db.getAllImages();
            this.applyFilters();
        } catch (error) {
            this.showToast(`이미지 로드 실패: ${error.message}`, 'error');
        }
    }

    applyFilters() {
        const searchInput = document.getElementById('searchInput').value;
        const useOR = document.getElementById('filterMode').checked;
        const sortBy = document.getElementById('sortBy').value;

        const searchTags = SearchManager.parseSearchQuery(searchInput);
        this.activeSearchTags = searchTags;

        let filtered = SearchManager.filterImages(this.currentImages, searchTags, useOR);
        filtered = SearchManager.sortImages(filtered, sortBy);

        this.filteredImages = filtered;
        this.renderGallery();
        this.updateQuickFilterTags();
    }

    updateQuickFilterTags() {
        const allTags = new Set();
        this.currentImages.forEach(img => {
            img.tags.forEach(tag => allTags.add(tag));
        });

        const container = document.getElementById('tagQuickFilter');
        container.innerHTML = '';

        Array.from(allTags).sort().forEach(tag => {
            const isActive = this.activeSearchTags.includes(tag.toLowerCase());
            const chip = document.createElement('div');
            chip.className = `tag-chip ${isActive ? 'active' : ''}`;
            chip.innerHTML = `${tag}<span class="remove">✕</span>`;

            chip.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove')) {
                    this.removeQuickTag(tag);
                } else {
                    this.toggleQuickTag(tag);
                }
            });

            container.appendChild(chip);
        });
    }

    toggleQuickTag(tag) {
        const searchInput = document.getElementById('searchInput');
        const lowerTag = tag.toLowerCase();
        const searchTags = SearchManager.parseSearchQuery(searchInput.value);

        const index = searchTags.indexOf(lowerTag);
        if (index > -1) {
            searchTags.splice(index, 1);
        } else {
            searchTags.push(lowerTag);
        }

        searchInput.value = searchTags.join(', ');
        this.updateClearButton();
        this.applyFilters();
    }

    removeQuickTag(tag) {
        const container = document.getElementById('tagQuickFilter');
        const chips = container.querySelectorAll('.tag-chip');
        chips.forEach(chip => {
            if (chip.textContent.includes(tag)) {
                chip.remove();
            }
        });
    }

    updateClearButton() {
        const clearBtn = document.getElementById('clearSearchBtn');
        const searchInput = document.getElementById('searchInput');
        if (searchInput.value.trim()) {
            clearBtn.classList.add('active');
        } else {
            clearBtn.classList.remove('active');
        }
    }

    renderGallery() {
        const grid = document.getElementById('galleryGrid');
        const emptyState = document.getElementById('emptyState');

        if (this.filteredImages.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        grid.innerHTML = this.filteredImages.map(image => `
            <div class="image-card" data-id="${image.id}">
                <img src="${image.thumbnail}" alt="thumbnail" class="image-card-image">
                <div class="image-card-info">
                    <div class="image-card-date">
                        ${new Date(image.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                    <div class="image-card-tags">
                        ${image.tags.map(tag => `
                            <span class="image-card-tag">${tag}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.image-card').forEach(card => {
            card.addEventListener('click', () => {
                const imageId = parseInt(card.dataset.id);
                this.openEditModal(imageId);
            });

            card.querySelectorAll('.image-card-tag').forEach(tag => {
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const searchInput = document.getElementById('searchInput');
                    searchInput.value = tag.textContent;
                    this.updateClearButton();
                    this.applyFilters();
                });
            });
        });
    }

    async exportData() {
        try {
            const data = await this.db.exportData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `outfit-archive-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('데이터가 내보내졌습니다.', 'success');
        } catch (error) {
            this.showToast(`내보내기 실패: ${error.message}`, 'error');
        }
    }

    async importData(file) {
        if (!file) return;

        try {
            const text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsText(file);
            });

            const data = JSON.parse(text);
            const merge = confirm('기존 데이터와 병합하시겠습니까?\n(취소 시 기존 데이터가 덮어씌워집니다)');
            
            await this.db.importData(data, merge);
            await this.tagManager.initTags();
            await this.loadImages();
            this.showToast('데이터가 가져와졌습니다.', 'success');
        } catch (error) {
            this.showToast(`가져오기 실패: ${error.message}`, 'error');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ====== Initialize App ======
let db, tagManager, ui;

async function initApp() {
    db = new DatabaseManager();
    
    // Wait for db to be ready
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
        setTimeout(resolve, 500); // Wait for tag init
    });

    ui = new UIManager(db, tagManager);
    await ui.loadImages();
}

document.addEventListener('DOMContentLoaded', initApp);
