// Global variables
let allCharacters = [];

// DOM elements
const charactersGrid = document.getElementById('characters-grid');
const loadingElement = document.getElementById('loading');
const characterForm = document.getElementById('character-form');
const searchInput = document.getElementById('search-input');
const universeFilter = document.getElementById('universe-filter');
const affiliationFilter = document.getElementById('affiliation-filter');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('🦸‍♂️ MarvelBase frontend starting...');
    
    // Load characters on main page
    if (charactersGrid) {
        loadCharacters();
        setupFilters();
    }
    
    // Setup form on add character page
    if (characterForm) {
        setupForm();
        setupImagePreview();
    }
});

// Load and display characters
async function loadCharacters() {
    console.log('📖 Loading characters from server...');
    try {
        showLoading(true);
        const response = await fetch('/api/characters');
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const characters = await response.json();
        console.log(`✅ Loaded ${characters.length} characters`);
        
        allCharacters = characters;
        displayCharacters(characters);
        showLoading(false);
        
    } catch (error) {
        console.error('❌ Error loading characters:', error);
        showError('Failed to load characters. Is the server running?');
        showLoading(false);
    }
}

// Display characters in grid
function displayCharacters(characters) {
    if (!charactersGrid) return;
    
    if (characters.length === 0) {
        charactersGrid.innerHTML = `
            <div class="no-characters">
                <h3>🦸‍♂️ No characters yet!</h3>
                <p>Be the first to add a Marvel character to the database!</p>
                <a href="add-character.html" class="nav-btn">Add Your First Character</a>
            </div>
        `;
        return;
    }
    
    charactersGrid.innerHTML = characters.map(character => `
        <div class="character-card" data-id="${character.id}">
            <img src="${character.imageUrl || 'https://via.placeholder.com/300x250?text=No+Image'}" 
                 alt="${character.name}" class="character-image"
                 onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">
            
            <div class="character-info">
                <h3 class="character-name">${escapeHtml(character.name)}</h3>
                ${character.realName ? `<p class="character-real-name">${escapeHtml(character.realName)}</p>` : ''}
                
                <p class="character-bio">${escapeHtml(character.bio)}</p>
                
                <div class="character-tags">
                    ${character.affiliation ? `<span class="tag">${escapeHtml(character.affiliation)}</span>` : ''}
                    ${character.universe ? `<span class="tag">${escapeHtml(character.universe)}</span>` : ''}
                    ${character.status ? `<span class="tag status-${character.status.toLowerCase()}">${escapeHtml(character.status)}</span>` : ''}
                </div>
                
                ${character.powers ? `
                    <div class="character-detail">
                        <strong>Powers:</strong> ${escapeHtml(character.powers)}
                    </div>
                ` : ''}
                
                ${character.firstAppearance ? `
                    <div class="character-detail">
                        <strong>First Appearance:</strong> ${escapeHtml(character.firstAppearance)}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    console.log(`📺 Displayed ${characters.length} characters`);
}

// Setup filters
function setupFilters() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterCharacters, 300));
    }
    
    if (universeFilter) {
        universeFilter.addEventListener('change', filterCharacters);
    }
    
    if (affiliationFilter) {
        affiliationFilter.addEventListener('change', filterCharacters);
    }
}

// Filter characters based on search and filters
function filterCharacters() {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const selectedUniverse = universeFilter?.value || '';
    const selectedAffiliation = affiliationFilter?.value || '';
    
    const filteredCharacters = allCharacters.filter(character => {
        const matchesSearch = character.name.toLowerCase().includes(searchTerm) ||
                            (character.realName && character.realName.toLowerCase().includes(searchTerm)) ||
                            character.bio.toLowerCase().includes(searchTerm) ||
                            (character.powers && character.powers.toLowerCase().includes(searchTerm));
        
        const matchesUniverse = !selectedUniverse || character.universe === selectedUniverse;
        const matchesAffiliation = !selectedAffiliation || character.affiliation === selectedAffiliation;
        
        return matchesSearch && matchesUniverse && matchesAffiliation;
    });
    
    console.log(`🔍 Filtered to ${filteredCharacters.length} characters`);
    displayCharacters(filteredCharacters);
}

// Setup character form
function setupForm() {
    characterForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Submitting character form...');
        
        const formData = new FormData(this);
        const submitBtn = this.querySelector('.submit-btn');
        
        // Validate required fields
        const name = formData.get('name');
        const bio = formData.get('bio');
        const image = formData.get('image');
        
        if (!name || !bio) {
            showError('Character name and bio are required!');
            return;
        }
        
        if (!image || image.size === 0) {
            showError('Please upload a character image!');
            return;
        }
        
        // Check file size (5MB limit)
        if (image.size > 5 * 1024 * 1024) {
            showError('Image file must be smaller than 5MB!');
            return;
        }
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding Character to Database...';
        
        try {
            console.log('📤 Sending character data to server...');
            const response = await fetch('/api/characters', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                console.log('✅ Character added successfully:', result.character.name);
                showSuccess(`${result.character.name} added successfully!`);
                this.reset();
                document.getElementById('image-preview').innerHTML = '';
                
                // Redirect to main page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to add character');
            }
            
        } catch (error) {
            console.error('❌ Error adding character:', error);
            showError(`Failed to add character: ${error.message}`);
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Character to Database';
        }
    });
}

// Setup image preview
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
                                📊 ${(file.size/1024/1024).toFixed(2)}MB
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
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // Add styles
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    `;
    
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

// Add CSS animations and styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .preview-container {
        margin-top: 1rem;
        text-align: center;
        padding: 1rem;
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
    }
    
    .preview-image {
        max-width: 200px;
        max-height: 200px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    
    .preview-info {
        margin-top: 0.5rem;
        font-size: 0.85rem;
        color: var(--text-gray);
        line-height: 1.4;
    }
    
    .no-characters {
        grid-column: 1 / -1;
        text-align: center;
        padding: 4rem 2rem;
        background: var(--card-bg);
        border-radius: 15px;
        border: 2px dashed #444;
    }
    
    .no-characters h3 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: var(--marvel-yellow);
    }
    
    .character-detail {
        margin: 0.5rem 0;
        font-size: 0.85rem;
        line-height: 1.4;
    }
    
    .character-detail strong {
        color: var(--marvel-yellow);
    }
    
    .status-active { background: #4CAF50; }
    .status-deceased { background: #f44336; }
    .status-retired { background: #ff9800; }
    .status-missing { background: #9c27b0; }
    .status-unknown { background: #607d8b; }
    
    .message {
        cursor: pointer;
        transition: opacity 0.3s ease;
    }
    
    .message:hover {
        opacity: 0.9;
    }
    
    /* Loading animation */
    .loading {
        text-align: center;
        padding: 3rem;
        font-size: 1.2rem;
        color: var(--text-gray);
        position: relative;
    }
    
    .loading::after {
        content: '';
        width: 40px;
        height: 40px;
        border: 4px solid #444;
        border-top: 4px solid var(--marvel-red);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 1rem auto;
        display: block;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

console.log('✅ MarvelBase frontend initialized successfully!');