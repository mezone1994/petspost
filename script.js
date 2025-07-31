let allPets = [];
let isModalOpen = false;
let isMobile = window.innerWidth <= 768;

const petsGrid = document.getElementById('pets-grid');
const loadingElement = document.getElementById('loading');
const petForm = document.getElementById('pet-form');
const searchInput = document.getElementById('search-input');
const breedFilter = document.getElementById('breed-filter');

const modal = document.getElementById('image-modal');
const modalContent = modal?.querySelector('.modal-content');
const modalImage = document.getElementById('modal-image');
const modalPetName = document.getElementById('modal-pet-name');
const modalPetInfo = document.getElementById('modal-pet-info');
const modalCloseButtons = document.querySelectorAll('.modal-close, .modal-close-btn');
const modalBackdrop = modal?.querySelector('.modal-backdrop');

document.addEventListener('DOMContentLoaded', function() {
    console.log('🐾 PetPost with full responsive support starting...');
    
    updateMobileStatus();
    window.addEventListener('resize', debounce(updateMobileStatus, 250));
    
    if (petsGrid) {
        loadPets();
        setupFilters();
        setupModal();
    }
    
    if (petForm) {
        setupForm();
        setupImagePreview();
    }
    
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }
});

function updateMobileStatus() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    
    if (wasMobile !== isMobile) {
        console.log(`📱 Device type changed: ${isMobile ? 'Mobile' : 'Desktop'}`);
        if (allPets.length > 0 && petsGrid) {
            displayPets(allPets);
        }
    }
}

async function loadPets() {
    console.log('📖 Loading pets from server...');
    try {
        showLoading(true);
        const response = await fetch('/api/pets');
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const pets = await response.json();
        console.log(`✅ Loaded ${pets.length} pets`);
        
        allPets = pets;
        displayPets(pets);
        showLoading(false);
        
    } catch (error) {
        console.error('❌ Error loading pets:', error);
        showError('Failed to load pets. Please check if the server is running.');
        showLoading(false);
    }
}

function displayPets(pets) {
    if (!petsGrid) return;
    
    if (pets.length === 0) {
        petsGrid.innerHTML = `
            <div class="no-pets">
                <h3>🐕 No pets available for adoption yet!</h3>
                <p>Be the first to add a lovable pet looking for a home.</p>
                <a href="add-pet.html" class="nav-btn">Add First Pet</a>
            </div>
        `;
        return;
    }
    
    petsGrid.innerHTML = pets.map(pet => `
        <div class="pet-card" data-id="${pet.id}">
            <div class="pet-image-container">
                <img src="${pet.imageUrl || 'https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=🐾+Photo+Not+Available'}" 
                     alt="${escapeHtml(pet.name)}" 
                     class="pet-image"
                     data-pet-id="${pet.id}"
                     loading="lazy"
                     onerror="handleImageError(this)"
                     onload="handleImageLoad(this)"
                     title="View ${escapeHtml(pet.name)}'s details"
                     role="button"
                     tabindex="0">
            </div>
            
            <div class="pet-info">
                <h3 class="pet-name">${escapeHtml(pet.name)}</h3>
                <div class="pet-breed">${escapeHtml(pet.breed)}</div>
                
                <div class="pet-tags">
                    <span class="tag age">${pet.age} ${pet.age === 1 ? 'year' : 'years'} old</span>
                    ${pet.size ? `<span class="tag size">${escapeHtml(pet.size)}</span>` : ''}
                    ${pet.gender ? `<span class="tag gender">${escapeHtml(pet.gender)}</span>` : ''}
                </div>
                
                ${pet.description ? `
                    <p class="pet-description">${escapeHtml(pet.description)}</p>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    setupImageClickHandlers();
    
    console.log(`📺 Displayed ${pets.length} pets with responsive layout`);
}

function handleImageLoad(img) {
    console.log(`✅ Image loaded successfully for pet: ${img.alt}`);
    img.style.opacity = '1';
    img.classList.add('loaded');
}

function handleImageError(img) {
    console.log(`❌ Image failed to load for pet: ${img.alt}`);
    img.src = 'https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=🐾+Photo+Not+Available';
    img.alt = 'Photo not available';
    img.style.opacity = '0.8';
}

function setupImageClickHandlers() {
    const petImages = document.querySelectorAll('.pet-image');
    
    petImages.forEach(img => {
        img.removeEventListener('click', handleImageClick);
        img.removeEventListener('keydown', handleImageKeydown);
        img.removeEventListener('touchstart', handleTouchStart);
        
        img.addEventListener('click', handleImageClick);
        img.addEventListener('keydown', handleImageKeydown);
        
        if ('ontouchstart' in window) {
            img.addEventListener('touchstart', handleTouchStart, { passive: true });
        }
    });
}

function handleImageClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const petId = this.getAttribute('data-pet-id');
    const pet = allPets.find(p => p.id === petId);
    
    if (pet) {
        openModal(pet);
    }
}

function handleImageKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
    }
}

function handleTouchStart(e) {
    this.style.transform = 'scale(0.98)';
    setTimeout(() => {
        this.style.transform = '';
    }, 150);
}

function setupModal() {
    if (!modal) return;
    
    modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closeModal);
    }
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (isModalOpen) {
            if (e.key === 'Escape') {
                closeModal();
            }
            trapFocus(e);
        }
    });
    
    modal.addEventListener('wheel', function(e) {
        if (isModalOpen) {
            e.preventDefault();
        }
    }, { passive: false });
    
    if ('ontouchstart' in window) {
        setupTouchGestures();
    }
}

function setupTouchGestures() {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    modalContent?.addEventListener('touchstart', function(e) {
        if (isMobile && e.touches.length === 1) {
            startY = e.touches[0].clientY;
            isDragging = true;
        }
    }, { passive: true });
    
    modalContent?.addEventListener('touchmove', function(e) {
        if (isDragging && isMobile) {
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            if (deltaY > 0) {
                const opacity = Math.max(0.5, 1 - deltaY / 300);
                modal.style.opacity = opacity;
                
                const scale = Math.max(0.9, 1 - deltaY / 1000);
                modalContent.style.transform = `translateY(${deltaY / 3}px) scale(${scale})`;
            }
        }
    }, { passive: true });
    
    modalContent?.addEventListener('touchend', function(e) {
        if (isDragging && isMobile) {
            const deltaY = currentY - startY;
            
            if (deltaY > 100) {
                closeModal();
            } else {
                modal.style.opacity = '';
                modalContent.style.transform = '';
            }
            
            isDragging = false;
        }
    }, { passive: true });
}

function trapFocus(e) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.key === 'Tab') {
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
}

function openModal(pet) {
    if (!modal || isModalOpen) return;
    
    console.log(`🖼️ Opening modal for pet: ${pet.name} (${isMobile ? 'Mobile' : 'Desktop'} mode)`);
    
    modalPetName.textContent = pet.name;
    
    const placeholderUrl = 'https://via.placeholder.com/600x400/4ECDC4/FFFFFF?text=🐾+Photo+Not+Available';
    modalImage.src = pet.imageUrl || placeholderUrl;
    modalImage.alt = `Full size photo of ${pet.name}`;
    
    modalImage.onload = function() {
        console.log(`✅ Modal image loaded for ${pet.name}`);
        this.style.opacity = '1';
    };
    
    modalImage.onerror = function() {
        console.log(`❌ Modal image failed for ${pet.name}, using placeholder`);
        this.src = placeholderUrl;
        this.alt = 'Photo not available';
    };
    
    modalPetInfo.innerHTML = `
        <h4>About ${escapeHtml(pet.name)}</h4>
        
        <p><strong>🐾 Breed:</strong> ${escapeHtml(pet.breed)}</p>
        <p><strong>🎂 Age:</strong> ${pet.age} ${pet.age === 1 ? 'year' : 'years'} old</p>
        ${pet.size ? `<p><strong>📏 Size:</strong> ${escapeHtml(pet.size)}</p>` : ''}
        ${pet.gender ? `<p><strong>⚧ Gender:</strong> ${escapeHtml(pet.gender)}</p>` : ''}
        ${pet.description ? `<p><strong>📝 Description:</strong> ${escapeHtml(pet.description)}</p>` : ''}
        
        <p><strong>📋 Status:</strong> <span style="color: var(--primary-color); font-weight: bold;">Available for adoption</span></p>
        <p><strong>📅 Added:</strong> ${formatDate(pet.createdAt)}</p>
        
        <div class="pet-tags">
            <span class="tag age">${pet.age} ${pet.age === 1 ? 'year' : 'years'} old</span>
            ${pet.size ? `<span class="tag size">${escapeHtml(pet.size)}</span>` : ''}
            ${pet.gender ? `<span class="tag gender">${escapeHtml(pet.gender)}</span>` : ''}
        </div>
        
        <div style="margin-top: 2rem; padding: 1rem; background: var(--light-bg); border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: var(--primary-color); font-weight: bold;">
                💖 Ready to adopt ${escapeHtml(pet.name)}?
            </p>
            <p style="margin: 0.5rem 0 0; font-size: 0.9rem; color: var(--text-light);">
                Contact our adoption team for more information!
            </p>
        </div>
    `;
    
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    
    document.body.style.overflow = 'hidden';
    if (isMobile) {
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    }
    
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
    
    isModalOpen = true;
    const firstCloseButton = modal.querySelector('.modal-close');
    if (firstCloseButton) {
        firstCloseButton.focus();
    }
}

function closeModal() {
    if (!modal || !isModalOpen) return;
    
    console.log('❌ Closing modal');
    
    modal.classList.remove('show');
    
    setTimeout(() => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        document.body.style.overflow = '';
        if (isMobile) {
            document.body.style.position = '';
            document.body.style.width = '';
        }
        
        modal.style.opacity = '';
        if (modalContent) {
            modalContent.style.transform = '';
        }
        
        isModalOpen = false;
    }, 300);
}

window.closeModal = closeModal;

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Unknown';
    }
}

function setupFilters() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterPets, isMobile ? 500 : 300));
        
        if (isMobile) {
            searchInput.addEventListener('focus', function() {
                this.select();
            });
        }
    }
    
    if (breedFilter) {
        breedFilter.addEventListener('change', filterPets);
    }
}

function filterPets() {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const selectedBreed = breedFilter?.value || '';
    
    const filteredPets = allPets.filter(pet => {
        const matchesSearch = pet.name.toLowerCase().includes(searchTerm) ||
                            pet.breed.toLowerCase().includes(searchTerm) ||
                            (pet.description && pet.description.toLowerCase().includes(searchTerm));
        
        let matchesBreed = true;
        if (selectedBreed) {
            if (selectedBreed === 'Dog') {
                matchesBreed = pet.breed.toLowerCase().includes('dog') || 
                              pet.breed.toLowerCase().includes('retriever') ||
                              pet.breed.toLowerCase().includes('terrier') ||
                              pet.breed.toLowerCase().includes('shepherd') ||
                              pet.breed.toLowerCase().includes('poodle') ||
                              pet.breed.toLowerCase().includes('bulldog') ||
                              pet.breed.toLowerCase().includes('spaniel') ||
                              pet.breed.toLowerCase().includes('beagle');
            } else if (selectedBreed === 'Cat') {
                matchesBreed = pet.breed.toLowerCase().includes('cat') || 
                              pet.breed.toLowerCase().includes('persian') ||
                              pet.breed.toLowerCase().includes('siamese') ||
                              pet.breed.toLowerCase().includes('tabby') ||
                              pet.breed.toLowerCase().includes('maine') ||
                              pet.breed.toLowerCase().includes('british') ||
                              pet.breed.toLowerCase().includes('ragdoll');
            }
        }
        
        return matchesSearch && matchesBreed;
    });
    
    console.log(`🔍 Filtered to ${filteredPets.length} pets`);
    displayPets(filteredPets);
}

function setupForm() {
    petForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Submitting pet form...');
        
        const formData = new FormData(this);
        const submitBtn = this.querySelector('.submit-btn');
        
        const name = formData.get('name');
        const age = formData.get('age');
        const breed = formData.get('breed');
        const image = formData.get('image');
        
        if (!name || !age || !breed) {
            showError('Pet name, age, and breed are required!');
            return;
        }
        
        if (!image || image.size === 0) {
            showError('Please upload a photo of the pet!');
            return;
        }
        
        if (image.size > 5 * 1024 * 1024) {
            showError('Image file must be smaller than 5MB!');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding Pet...';
        
        try {
            console.log('📤 Sending pet data to server...');
            const response = await fetch('/api/pets', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                console.log('✅ Pet added successfully:', result.pet.name);
                showSuccess(`${result.pet.name} has been added to the adoption list! 🎉`);
                this.reset();
                
                const previewDiv = document.getElementById('image-preview');
                if (previewDiv) {
                    previewDiv.innerHTML = '';
                }
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            } else {
                throw new Error(result.error || 'Failed to add pet');
            }
            
        } catch (error) {
            console.error('❌ Error adding pet:', error);
            showError(`Failed to add pet: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Pet to Adoption List';
        }
    });
}

function setupImagePreview() {
    const imageInput = document.getElementById('image');
    const previewDiv = document.getElementById('image-preview');
    
    if (imageInput && previewDiv) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (file) {
                if (!file.type.startsWith('image/')) {
                    showError('Please select an image file!');
                    this.value = '';
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    showError('Image file must be smaller than 5MB!');
                    this.value = '';
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewDiv.innerHTML = `
                        <div class="preview-container">
                            <img src="${e.target.result}" alt="Preview" class="preview-image">
                            <p class="preview-info">
                                📸 ${file.name}<br>
                                📊 ${(file.size/1024/1024).toFixed(2)}MB<br>
                                ✅ Image looks great!
                            </p>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                previewDiv.innerHTML = '';
            }
        });
    }
}

function showLoading(show) {
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showSuccess(message) {
    showMessage(message, 'success');
}

function showError(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    console.log(`💬 ${type.toUpperCase()}: ${message}`);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.setAttribute('role', 'alert');
    messageDiv.setAttribute('aria-live', 'polite');
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
    
    messageDiv.addEventListener('click', () => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    });
    
    messageDiv.focus();
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

window.addEventListener('orientationchange', function() {
    setTimeout(() => {
        updateMobileStatus();
        if (isModalOpen && isMobile) {
            modal.style.height = '100vh';
        }
    }, 100);
});

document.addEventListener('touchend', function(e) {
    const now = new Date().getTime();
    const timeSince = now - (window.lastTouchEnd || 0);
    
    if (timeSince < 300 && timeSince > 0) {
        e.preventDefault();
    }
    
    window.lastTouchEnd = now;
}, false);

console.log('✅ PetPost with full responsive and mobile support initialized successfully!');