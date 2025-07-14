// main.js (COM A NOVA LÓGICA DE BUSCA)

// DOM elements
const recipesGrid = document.getElementById('recipesGrid');
const searchInput = document.getElementById('searchInput');
const difficultyFilter = document.getElementById('difficultyFilter');
let categoryFilter; 
const noResults = document.getElementById('noResults');
const recipeCounter = document.getElementById('recipeCounter');
const loadingSpinner = document.getElementById('loadingSpinner');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalPrepTime = document.getElementById('modalPrepTime');
const modalDifficulty = document.getElementById('modalDifficulty');
const modalServings = document.getElementById('modalServings');
const modalIngredients = document.getElementById('modalIngredients');
const modalInstructions = document.getElementById('modalInstructions');
const favoriteBtn = document.getElementById('favoriteBtn');
const shareBtn = document.getElementById('shareBtn');
const printBtn = document.getElementById('printBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const showFavoritesBtn = document.getElementById('showFavoritesBtn');


// Global variables
let allRecipes = [];
let filteredRecipes = [];
let favorites = JSON.parse(localStorage.getItem('favoriteRecipes')) || [];
let showingFavorites = false;

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🍳 Manu\'s Recipes website loaded successfully!');
    showLoading();
    loadRecipes();
});

/**
 * Fetches recipe data from the JSON file and then initializes the app.
 */
async function loadRecipes() {
    try {
        const response = await fetch('receitas.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const recipes = await response.json();
        allRecipes = recipes;
        initializeApp();
    } catch (error) {
        console.error('❌ Failed to load recipes:', error);
        recipesGrid.innerHTML = '<p class="error-message">Falha ao carregar as receitas. Por favor, verifique o console para mais detalhes.</p>';
    } finally {
        hideLoading();
    }
}

/**
 * Initialize the main application
 */
function initializeApp() {
    filteredRecipes = [...allRecipes];
    setupCategoryFilter();
    setupCustomSelects();
    setupEventListeners();
    updateRecipeDisplay();
    updateRecipeCounter();
    addSmoothScrolling();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    searchInput.addEventListener('input', handleFilterChange);
    clearSearchBtn.addEventListener('click', clearSearch);
    showFavoritesBtn.addEventListener('click', toggleShowFavorites);

    modalClose.addEventListener('click', closeRecipeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeRecipeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeRecipeModal();
        }
    });

    favoriteBtn.addEventListener('click', handleFavoriteClick);
    shareBtn.addEventListener('click', handleShareClick);
    printBtn.addEventListener('click', printRecipe);
}

/**
 * Handles changes in search or select filters
 */
function handleFilterChange() {
    if (showingFavorites) {
        showingFavorites = false;
        updateShowFavoritesButton();
    }
    filterRecipes();
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
}

/**
 * =======================================================================
 * LÓGICA PARA OS FILTROS PERSONALIZADOS
 * =======================================================================
 */
function setupCategoryFilter() {
    const container = document.getElementById('categoryFilterContainer');
    if (!container) return;

    const categories = [...new Set(allRecipes.map(recipe => recipe.category).filter(Boolean))];
    
    const optionsHTML = categories.map(category => 
        `<div class="custom-option" data-value="${category.toLowerCase()}">${category}</div>`
    ).join('');

    container.innerHTML = `
        <select id="categoryFilter" class="filter-select-hidden" aria-label="Filtrar por categoria">
            <option value="">Todas as Categorias</option>
            ${categories.map(cat => `<option value="${cat.toLowerCase()}">${cat}</option>`).join('')}
        </select>
        <div class="custom-select-wrapper" id="customSelectCategory">
            <div class="custom-select-trigger" tabindex="0">
                <span>Todas as Categorias</span>
                <i class="fas fa-chevron-down custom-arrow"></i>
            </div>
            <div class="custom-options">
                <div class="custom-option" data-value="">Todas as Categorias</div>
                ${optionsHTML}
            </div>
        </div>
    `;
    categoryFilter = document.getElementById('categoryFilter');
}

function setupCustomSelects() {
    const customSelectDifficulty = document.getElementById('customSelectDifficulty');
    if (customSelectDifficulty) {
        setupSingleSelect(customSelectDifficulty, document.getElementById('difficultyFilter'));
    }

    const customSelectCategory = document.getElementById('customSelectCategory');
    if (customSelectCategory) {
        setupSingleSelect(customSelectCategory, document.getElementById('categoryFilter'));
    }
}

function setupSingleSelect(selectWrapper, hiddenSelect) {
    const trigger = selectWrapper.querySelector('.custom-select-trigger');
    const options = selectWrapper.querySelectorAll('.custom-option');
    const triggerText = trigger.querySelector('span');

    trigger.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(openSelect => {
            if (openSelect !== selectWrapper) {
                openSelect.classList.remove('open');
            }
        });
        selectWrapper.classList.toggle('open');
    });

    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            triggerText.textContent = option.textContent;
            hiddenSelect.value = option.getAttribute('data-value');
            handleFilterChange();
            selectWrapper.classList.remove('open');
        });
    });
}

window.addEventListener('click', (e) => {
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    });
});

document.addEventListener('keydown', (e) => {
   if (e.key === 'Escape') {
       document.querySelectorAll('.custom-select-wrapper.open').forEach(openSelect => {
           openSelect.classList.remove('open');
       });
   }
});

/**
 * Filter and update recipe display
 */
function filterRecipes() {
    const searchTerm = searchInput.value.toLowerCase();
    const difficulty = difficultyFilter.value.toLowerCase();
    const category = categoryFilter ? categoryFilter.value.toLowerCase() : '';

    filteredRecipes = allRecipes.filter(recipe => {
        if (showingFavorites) {
            return favorites.includes(recipe.name);
        }

        // ===============================================================
        // =========   AQUI ESTÁ A LÓGICA DE BUSCA ATUALIZADA   ==========
        // ===============================================================
        // Agora, a busca verifica se o nome da receita COMEÇA COM o termo digitado.
        const matchesSearch = recipe.name.toLowerCase().startsWith(searchTerm);

        const matchesDifficulty = !difficulty || recipe.difficulty.toLowerCase() === difficulty;
        const matchesCategory = !category || (recipe.category && recipe.category.toLowerCase() === category);
        
        return matchesSearch && matchesDifficulty && matchesCategory;
    });

    updateRecipeDisplay();
    updateRecipeCounter();
}

/**
 * Clear all search and filter inputs
 */
function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';

    // Reset Difficulty Filter
    difficultyFilter.value = '';
    const diffTrigger = document.querySelector('#customSelectDifficulty .custom-select-trigger span');
    if (diffTrigger) diffTrigger.textContent = 'Todas as Dificuldades';
    document.querySelectorAll('#customSelectDifficulty .custom-option').forEach(opt => opt.classList.remove('selected'));

    // Reset Category Filter
    if (categoryFilter) {
        categoryFilter.value = '';
        const catTrigger = document.querySelector('#customSelectCategory .custom-select-trigger span');
        if (catTrigger) catTrigger.textContent = 'Todas as Categorias';
        document.querySelectorAll('#customSelectCategory .custom-option').forEach(opt => opt.classList.remove('selected'));
    }
    
    if (showingFavorites) {
        showingFavorites = false;
        updateShowFavoritesButton();
    }

    filterRecipes();
}

/**
 * Toggle the view to show only favorite recipes
 */
function toggleShowFavorites() {
    showingFavorites = !showingFavorites;
    
    if (showingFavorites) {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';

        difficultyFilter.value = '';
        document.querySelector('#customSelectDifficulty .custom-select-trigger span').textContent = 'Todas as Dificuldades';
        document.querySelectorAll('#customSelectDifficulty .custom-option').forEach(opt => opt.classList.remove('selected'));

        if (categoryFilter) {
            categoryFilter.value = '';
            document.querySelector('#customSelectCategory .custom-select-trigger span').textContent = 'Todas as Categorias';
            document.querySelectorAll('#customSelectCategory .custom-option').forEach(opt => opt.classList.remove('selected'));
        }
    }
    
    updateShowFavoritesButton();
    filterRecipes();
}


// =======================================================================
//  O RESTANTE DO CÓDIGO (CREATECARD, MODAL, ETC.) CONTINUA EXATAMENTE IGUAL
// =======================================================================
function createRecipeCard(recipe) {
    const cardElement = document.createElement('div');
    cardElement.className = 'recipe-card';
    cardElement.setAttribute('data-recipe-name', recipe.name);

    const difficultyClass = recipe.difficulty.toLowerCase().replace(' ', '-');
    const isFavorited = favorites.includes(recipe.name);
    const heartIcon = isFavorited ? 'fas fa-heart' : 'far fa-heart';

    cardElement.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.name}" class="recipe-image" loading="lazy">
        <div class="recipe-info">
            <div class="recipe-favorite" role="button" aria-label="Toggle favorite for ${recipe.name}">
                <i class="${heartIcon}" style="color: var(--primary-color); cursor: pointer;"></i>
            </div>
            <h3 class="recipe-name">${recipe.name}</h3>
            <p class="recipe-preview">${recipe.description}</p>
            <div class="recipe-meta">
                <span class="prep-time"><i class="fas fa-clock"></i> ${recipe.prepTime}</span>
                <span class="difficulty ${difficultyClass}">${recipe.difficulty}</span>
                ${recipe.servings ? `<span class="servings"><i class="fas fa-users"></i> ${recipe.servings}</span>` : ''}
            </div>
        </div>
    `;

    cardElement.querySelector('.recipe-favorite i').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(recipe.name);
    });
    cardElement.addEventListener('click', () => openRecipeModal(recipe));
    cardElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openRecipeModal(recipe);
        }
    });

    return cardElement;
}

function updateRecipeDisplay() {
    recipesGrid.innerHTML = '';
    noResults.style.display = filteredRecipes.length === 0 ? 'block' : 'none';

    filteredRecipes.forEach(recipe => {
        const recipeCard = createRecipeCard(recipe);
        recipesGrid.appendChild(recipeCard);
    });

    document.querySelectorAll('.recipe-card').forEach((card, index) => {
        setTimeout(() => card.classList.add('fade-in'), index * 100);
    });
}

function openRecipeModal(recipe) {
    modalImage.src = recipe.image;
    modalImage.alt = recipe.name;
    modalTitle.textContent = recipe.name;
    modalPrepTime.innerHTML = `<i class="fas fa-clock"></i> ${recipe.prepTime}`;

    modalServings.style.display = recipe.servings ? 'inline-block' : 'none';
    if (recipe.servings) {
        modalServings.innerHTML = `<i class="fas fa-users"></i> ${recipe.servings}`;
    }

    const difficultyClass = recipe.difficulty.toLowerCase().replace(' ', '-');
    modalDifficulty.className = `difficulty ${difficultyClass}`;
    modalDifficulty.textContent = recipe.difficulty;

    modalIngredients.innerHTML = recipe.ingredients.map(ing => `<li>${ing}</li>`).join('');
    modalInstructions.innerHTML = recipe.instructions.map(inst => `<li>${inst}</li>`).join('');

    updateModalFavoriteButton(recipe.name);

    favoriteBtn.dataset.recipeName = recipe.name;
    shareBtn.dataset.recipeName = recipe.name;
    printBtn.dataset.recipeName = recipe.name;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
    console.log(`🍽️ Opened recipe: ${recipe.name}`);
}

function closeRecipeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    console.log('✅ Modal closed');
}

function toggleFavorite(recipeName) {
    const index = favorites.indexOf(recipeName);
    if (index > -1) {
        favorites.splice(index, 1);
        showToast(`"${recipeName}" removido dos favoritos!`);
    } else {
        favorites.push(recipeName);
        showToast(`"${recipeName}" adicionado aos favoritos!`);
    }
    localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));

    updateAllFavoriteIcons(recipeName);
    if (modalOverlay.classList.contains('active')) {
        updateModalFavoriteButton(recipeName);
    }
    
    if (showingFavorites) {
        filterRecipes();
    }
}

function updateAllFavoriteIcons(recipeName) {
    document.querySelectorAll(`[data-recipe-name="${recipeName}"] .recipe-favorite i`).forEach(icon => {
        const isFavorited = favorites.includes(recipeName);
        icon.className = isFavorited ? 'fas fa-heart' : 'far fa-heart';
    });
}

function updateModalFavoriteButton(recipeName) {
    const isFavorited = favorites.includes(recipeName);
    const icon = favoriteBtn.querySelector('i');
    const text = favoriteBtn.querySelector('span');

    favoriteBtn.classList.toggle('active', isFavorited);
    icon.className = isFavorited ? 'fas fa-heart' : 'far fa-heart';
    text.textContent = isFavorited ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos';
}

function handleFavoriteClick() {
    const recipeName = favoriteBtn.dataset.recipeName;
    toggleFavorite(recipeName);
}

function handleShareClick() {
    const recipeName = shareBtn.dataset.recipeName;
    const shareData = {
        title: `${recipeName} - Receitas da Manu`,
        text: `Confira esta deliciosa receita: ${recipeName}`,
        url: window.location.href,
    };
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showToast('Receita compartilhada com sucesso!'))
            .catch(() => fallbackShare(shareData.text));
    } else {
        fallbackShare(shareData.text);
    }
}

function fallbackShare(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('Link da receita copiado!'))
        .catch(() => showToast('Não foi possível compartilhar a receita.'));
}

function printRecipe() {
    const recipeName = printBtn.dataset.recipeName;
    const recipe = allRecipes.find(r => r.name === recipeName);
    if (!recipe) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Imprimir Receita - ${recipe.name}</title>
                <style>
                    body { font-family: 'Quicksand', sans-serif; margin: 20px; color: #2d3436; }
                    h1 { color: #ff6b6b; }
                    h2 { color: #4ecdc4; border-bottom: 2px solid #f8f9fa; padding-bottom: 10px; }
                   img { 
                        max-width: 400px;
                        height: auto; 
                        border-radius: 12px; 
                        margin-bottom: 20px;
                    }
                    ul, ol { padding-left: 20px; }
                    li { margin-bottom: 10px; }
                    .no-print {
                        display: block;
                        width: 150px;
                        padding: 12px 20px;
                        background-color: #ff6b6b;
                        color: white;
                        border: none;
                        border-radius: 25px;
                        font-size: 1rem;
                        font-weight: 500;
                        cursor: pointer;
                        text-align: center;
                        transition: background-color 0.3s ease;
                    }

                    .no-print:hover {
                        background-color: #4ecdc4;
                    }

                    @media print {
                        .no-print { 
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>${recipe.name}</h1>
                <img src="${recipe.image}" alt="${recipe.name}">
                <h2>Ingredientes</h2>
                <ul>${recipe.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
                <h2>Modo de Preparo</h2>
                <ol>${recipe.instructions.map(i => `<li>${i}</li>`).join('')}</ol>
                <button class="no-print" onclick="window.print()">Imprimir</button>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
}

function updateShowFavoritesButton() {
    showFavoritesBtn.classList.toggle('active', showingFavorites);
    const text = showFavoritesBtn.querySelector('span');
    text.textContent = showingFavorites ? 'Ver Todas' : 'Ver Favoritos';
}

function updateRecipeCounter() {
    const count = filteredRecipes.length;
    recipeCounter.textContent = count;
    recipeCounter.style.transform = 'scale(1.2)';
    setTimeout(() => {
        recipeCounter.style.transform = 'scale(1)';
    }, 200);
}

function showLoading() {
    loadingSpinner.classList.add('active');
}

function hideLoading() {
    loadingSpinner.classList.remove('active');
}

function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function addSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
        console.warn('⚠️ Image failed to load:', e.target.src);
        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIyMCIgdmlld0JveD0iMCAwIDMyMCAyMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMjIwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0xNDQgODBIMTc2VjExMkgxNDRWODBaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMjggMTI4SDE5MlYxNjBIMTI4VjEyOFoiIGZpbGw9IiNFNUU3RUIiLz4KPC9zdmc+';
        e.target.alt = 'Recipe image not available';
    }
}, true);

const backToTopBtn = document.getElementById('backToTopBtn');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTopBtn.classList.add('active');
    } else {
        backToTopBtn.classList.remove('active');
    }
});

backToTopBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});