// Global variables
let allPets = [];

// DOM elements
const petsGrid = document.getElementById('pets-grid');
const loadingElement = document.getElementById('loading');
const petForm = document.getElementById('pet-form');
const searchInput = document.getElementById('search-input');
const breedFilter = document.getElementById('breed-filter');

// Modal elements
const modal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalPetName = document.getElementById('modal-pet-name');
const modalPetInfo = document.getElementById('modal-pet-info');
const modalClose = document.querySelector('.modal-close');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('🐾 PetPost frontend with full image display starting...');
    
    // Load pets on main page
    if (petsGrid) {
        loadPets();
        setupFilters();
        setupModal();
    }
    
    // Setup form on add pet page
    if (petForm) {
        setupForm();
        setupImagePreview();
    }
});

// Load and display pets
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

// Display pets in grid with full images
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
                <img src="${pet.imageUrl || 'https://via.placeholder.com/400x300?text=No+Photo+Available'}" 
                     alt="${escapeHtml(pet.name)}" 
                     class="pet-image"
                     data-pet-id="${pet.id}"
                     loading="lazy"
                     onerror="handleImageError(this)"
                     onload="handleImageLoad(this)"
                     title="Click to view ${escapeHtml(pet.name)}'s details">
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
    
    // Add click handlers to images
    setupImageClickHandlers();
    
    console.log(`📺 Displayed ${pets.length} pets with full image support`);
}

// Handle image loading success
function handleImageLoad(img) {
    console.log(`✅ Image loaded successfully for pet: ${img.alt}`);
    img.style.opacity = '1';
}

// Handle image loading errors
function handleImageError(img) {
    console.log(`❌ Image failed to load for pet: ${img.alt}`);
    img.src = 'https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=🐾+Photo+Not+Available';
    img.alt = 'Photo not available';
    img.style.opacity = '0.7';
}

// Setup image click handlers for modal
function setupImageClickHandlers() {
    const petImages = document.querySelectorAll('.pet-image');
    petImages.forEach(img => {
        img.addEventListener('click', function(e) {
            e.preventDefault();
            const petId = this.getAttribute('data-pet-id');
            const pet = allPets.find(p => p.id === petId);
            if (pet) {
                openModal(pet);
            }
        });
        
        // Add keyboard support
        img.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
        
        // Make images focusable
        img.setAttribute('tabindex', '0');
    });
}

// Setup modal functionality
function setupModal() {
    if (!modal) return;
    
    // Close modal when clicking the X button
    modalClose.addEventListener('click', closeModal);
    
    // Close modal when clicking outside the content
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });
}

// Open modal with pet information and full image
function openModal(pet) {
    if (!modal) return;
    
    // Set pet name
    modalPetName.textContent = pet.name;
    
    // Set pet image with better error handling
    const placeholderUrl = 'https://via.placeholder.com/600x400/4ECDC4/FFFFFF?text=🐾+Photo+Not+Available';
    modalImage.src = pet.imageUrl || placeholderUrl;
    modalImage.alt = `Full size photo of ${pet.name}`;
    
    // Handle modal image loading
    modalImage.onload = function() {
        console.log(`✅ Modal image loaded for ${pet.name}`);
    };
    
    modalImage.onerror = function() {
        console.log(`❌ Modal image failed for ${pet.name}, using placeholder`);
        this.src = placeholderUrl;
        this.alt = 'Photo not available';
    };
    
    // Set detailed pet information
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
    
    // Show modal with animation
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Focus management for accessibility
    modal.setAttribute('aria-hidden', 'false');
    modalClose.focus();
    
    console.log(`🖼️ Opened modal with full image for pet: ${pet.name}`);
}

// Close modal
function closeModal() {
    if (!modal) return;
    
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
    modal.setAttribute('aria-hidden', 'true');
    
    console.log('❌ Modal closed');
}

window.closeModal = closeModal;

// Format date for display
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

// Setup filters
function setupFilters() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterPets, 300));
    }
    
    if (breedFilter) {
        breedFilter.addEventListener('change', filterPets);
    }
}

// Filter pets based on search and breed
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

// Setup pet form
function setupForm() {
    petForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Submitting pet form...');
        
        const formData = new FormData(this);
        const submitBtn = this.querySelector('.submit-btn');
        
        // Validate required fields
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
        
        // Check file size (5MB limit)
        if (image.size > 5 * 1024 * 1024) {
            showError('Image file must be smaller than 5MB!');
            return;
        }
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding Pet to Adoption List...';
        
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
                document.getElementById('image-preview').innerHTML = '';
                
                // Redirect to main page after 3 seconds
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
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Pet to Adoption List';
        }
    });
}

// Setup image preview with full display
function setupImagePreview() {
    const imageInput = document.getElementById('image');
    const previewDiv = document.getElementById('image-preview');
    
    if (imageInput && previewDiv) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    showError('Please select an image file!');
                    this.value = '';
                    return;
                }
                
                // Validate file size
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

// Utility functions
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
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
    
    // Allow manual dismiss by clicking
    messageDiv.addEventListener('click', () => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    });
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Debounce function for search
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

