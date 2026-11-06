/**
 * MKart E-Commerce Product Catalog Engine
 * Supports Supabase REST API with automated fallback to data/products.json
 */

// ============================================================================
// SUPABASE CONFIGURATION
// Replace these with your actual Supabase project URL and public anon key
// ============================================================================
const SUPABASE_CONFIG = {
    url: 'https://qryizrgkzamytqyebmuy.supabase.co',
    anonKey: 'sb_publishable_TYj0vqJF7UYuWS08CwONsQ_C17O8oxD',
    table: 'products'
};

class ProductCatalog {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.activeCategory = 'All';
        this.searchQuery = '';
        this.sortBy = 'featured';
        this.selectedProduct = null;

        this.initElements();
        this.bindEvents();
        this.fetchProducts();
    }

    initElements() {
        this.gridEl = document.getElementById('productsGrid');
        this.countEl = document.getElementById('productResultsCount');
        this.searchInput = document.getElementById('productSearchInput');
        this.sortSelect = document.getElementById('productSortSelect');
        this.categoryPills = document.querySelectorAll('.category-pill');
        this.quickSheet = document.getElementById('mobileQuickSheet');
        this.sheetBody = document.getElementById('sheetDynamicContent');

        const closeSheetBtn = document.getElementById('closeSheetBtn');
        if (closeSheetBtn && this.quickSheet) {
            closeSheetBtn.addEventListener('click', () => this.quickSheet.close());
        }

        // Setup light-dismiss fallback for <dialog closedby="any">
        if (this.quickSheet && !('closedBy' in HTMLDialogElement.prototype)) {
            this.quickSheet.addEventListener('click', (event) => {
                if (event.target !== this.quickSheet) return;
                const rect = this.quickSheet.getBoundingClientRect();
                const isContent = (
                    rect.top <= event.clientY &&
                    event.clientY <= rect.top + rect.height &&
                    rect.left <= event.clientX &&
                    event.clientX <= rect.left + rect.width
                );
                if (!isContent) {
                    this.quickSheet.close();
                }
            });
        }
    }

    bindEvents() {
        // Search filter
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim().toLowerCase();
                this.applyFilters();
            });
        }

        // Sort filter
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applyFilters();
            });
        }

        // Category pills
        this.categoryPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                this.categoryPills.forEach(p => p.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.activeCategory = target.getAttribute('data-category');
                this.applyFilters();
            });
        });
    }

    async fetchProducts() {
        this.renderLoading();

        // 1. Try Supabase REST API if credentials are provided
        if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
            try {
                const endpoint = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?select=*&order=created_at.desc`;
                const response = await fetch(endpoint, {
                    headers: {
                        'apikey': SUPABASE_CONFIG.anonKey,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data) && data.length > 0) {
                        this.products = data;
                        this.updateCategoryCounts();
                        this.applyFilters();
                        if (window.TrendingSlider) {
                            window.TrendingSlider.refreshWithProducts(this.products);
                        }
                        return;
                    }
                }
            } catch (err) {
                console.warn('Supabase fetch failed, falling back to local dataset:', err);
            }
        }

        // 2. Fallback to local products.json
        try {
            const res = await fetch('data/products.json');
            if (!res.ok) throw new Error('Failed to load local products.json');
            this.products = await res.json();
            this.updateCategoryCounts();
            this.applyFilters();
            if (window.TrendingSlider) {
                window.TrendingSlider.refreshWithProducts(this.products);
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.renderError();
        }
    }

    updateCategoryCounts() {
        if (!this.categoryPills || !this.categoryPills.length) return;
        this.categoryPills.forEach(pill => {
            const cat = pill.getAttribute('data-category');
            const count = cat === 'All'
                ? this.products.length
                : this.products.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase()).length;

            let badge = pill.querySelector('.cat-count-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'cat-count-badge';
                pill.appendChild(badge);
            }
            badge.textContent = count;
        });
    }

    applyFilters() {
        let result = [...this.products];

        // 1. Category Filter
        if (this.activeCategory && this.activeCategory !== 'All') {
            result = result.filter(item => 
                (item.category || '').toLowerCase() === this.activeCategory.toLowerCase()
            );
        }

        // 2. Search Query Filter
        if (this.searchQuery) {
            result = result.filter(item => {
                const titleMatch = (item.title || '').toLowerCase().includes(this.searchQuery);
                const descMatch = (item.description || '').toLowerCase().includes(this.searchQuery);
                const brandMatch = (item.brand || '').toLowerCase().includes(this.searchQuery);
                const categoryMatch = (item.category || '').toLowerCase().includes(this.searchQuery);
                return titleMatch || descMatch || brandMatch || categoryMatch;
            });
        }

        // 3. Sorting
        if (this.sortBy === 'price-low') {
            result.sort((a, b) => Number(a.selling_price) - Number(b.selling_price));
        } else if (this.sortBy === 'price-high') {
            result.sort((a, b) => Number(b.selling_price) - Number(a.selling_price));
        } else if (this.sortBy === 'discount') {
            result.sort((a, b) => Number(b.discount_percent || 0) - Number(a.discount_percent || 0));
        } else if (this.sortBy === 'rating') {
            result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        }

        this.filteredProducts = result;
        this.render();
    }

    renderLoading() {
        if (!this.gridEl) return;
        this.gridEl.innerHTML = `
            <div class="products-loading-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Loading latest deals & accessories from store...</p>
            </div>
        `;
    }

    renderError() {
        if (!this.gridEl) return;
        this.gridEl.innerHTML = `
            <div class="products-error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Unable to load products right now. Please message us directly on WhatsApp for stock availability.</p>
                <a href="https://wa.me/919966258855" target="_blank" rel="noopener" class="btn btn-primary mt-2">
                    <i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp
                </a>
            </div>
        `;
    }

    render() {
        if (this.countEl) {
            this.countEl.textContent = `Showing ${this.filteredProducts.length} product${this.filteredProducts.length === 1 ? '' : 's'}`;
        }

        if (!this.gridEl) return;

        if (this.filteredProducts.length === 0) {
            this.gridEl.innerHTML = `
                <div class="products-empty-state">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <h3>No matching accessories found</h3>
                    <p>Looking for a specific model? Message us and we'll check our store stock right away.</p>
                    <a href="https://wa.me/919966258855?text=Hi%20MKart%2C%20do%20you%20have%20stock%20for%3A%20${encodeURIComponent(this.searchQuery || 'accessory')}" target="_blank" rel="noopener" class="btn btn-outline mt-2">
                        <i class="fa-brands fa-whatsapp"></i> Ask Store on WhatsApp
                    </a>
                </div>
            `;
            return;
        }

        this.gridEl.innerHTML = this.filteredProducts.map(product => {
            const discount = product.discount_percent || (product.mrp && product.selling_price ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) : 0);
            const waText = encodeURIComponent(`Hi MKart, I would like to order:
Product: ${product.title} (ID: ${product.id})
Offer Price: ₹${product.selling_price} (MRP: ₹${product.mrp})
Please confirm availability for Gajuwaka pickup / delivery.`);

            const slug = product.slug || (product.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const detailUrl = `product.html?id=${encodeURIComponent(product.id)}&name=${encodeURIComponent(slug)}`;

            // Support images from product.specs.images, product.images, or product.image
            const imageList = (product.specs && Array.isArray(product.specs.images) && product.specs.images.length > 0)
                ? product.specs.images
                : (Array.isArray(product.images) && product.images.length > 0 ? product.images : (product.image ? [product.image] : ['images/category-cases-v2.png']));
            const cardImg = imageList[0] || 'images/category-cases-v2.png';

            const offerTag = (product.specs && product.specs.offer_tag) || product.offer_tag || '';

            const highlightsList = Array.isArray(product.highlights) 
                ? product.highlights.slice(0, 2).map(h => `<li><i class="fa-solid fa-circle-check"></i> ${h}</li>`).join('') 
                : '';

            return `
                <article class="fk-product-card" data-id="${product.id}">
                    <div class="fk-card-badge-container">
                        ${product.badge ? `<span class="fk-badge fk-badge-${product.badge.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${product.badge}</span>` : ''}
                        ${discount > 0 ? `<span class="fk-discount-pill">${discount}% OFF</span>` : ''}
                    </div>

                    <div class="fk-card-image-box" onclick="window.mkartCatalog.handleCardClick('${product.id}', event)" style="cursor: pointer;" aria-label="View ${product.title}">
                        <img src="${cardImg}" alt="${product.title}" loading="lazy">
                    </div>

                    <div class="fk-card-body">
                        <div class="fk-category-row">
                            <span class="fk-category-tag">${product.category || 'Accessories'}</span>
                            <div class="fk-rating-badge">
                                <span>${product.rating || '4.8'}</span>
                                <i class="fa-solid fa-star"></i>
                                <span class="fk-reviews-count">(${product.rating_count || '100+'})</span>
                            </div>
                        </div>

                        ${offerTag ? `<div class="fk-offer-tag"><i class="fa-solid fa-gift"></i> ${offerTag}</div>` : ''}

                        <h3 class="fk-product-title" onclick="window.mkartCatalog.handleCardClick('${product.id}', event)" style="cursor: pointer;">
                            ${product.title}
                        </h3>

                        ${highlightsList ? `<ul class="fk-card-highlights">${highlightsList}</ul>` : ''}

                        <div class="fk-price-box">
                            <div class="fk-price-primary">
                                <span class="fk-currency">₹</span><span class="fk-amount">${Number(product.selling_price).toLocaleString('en-IN')}</span>
                            </div>
                            ${product.mrp ? `
                                <div class="fk-price-mrp">
                                    <span class="fk-mrp-label">MRP</span>
                                    <span class="fk-mrp-val">₹${Number(product.mrp).toLocaleString('en-IN')}</span>
                                </div>
                            ` : ''}
                        </div>

                        <div class="fk-stock-pill">
                            <i class="fa-solid fa-store"></i> In Stock • Gajuwaka Store
                        </div>

                        <div class="fk-card-actions">
                            <button type="button" class="fk-btn-specs" onclick="window.mkartCatalog.openQuickSheet('${product.id}')" title="Quick View">
                                <i class="fa-solid fa-eye"></i> Quick View
                            </button>
                            <a href="https://wa.me/919966258855?text=${waText}" target="_blank" rel="noopener" class="fk-btn-whatsapp" title="Instant Order via WhatsApp">
                                <i class="fa-brands fa-whatsapp"></i> Order Now
                            </a>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    handleCardClick(productId, event) {
        if (window.innerWidth <= 768) {
            if (event) event.preventDefault();
            this.openQuickSheet(productId);
        } else {
            const p = this.products.find(item => item.id === productId);
            const slug = p ? (p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')) : '';
            window.open(`product.html?id=${encodeURIComponent(productId)}&name=${encodeURIComponent(slug)}`, '_blank');
        }
    }

    openQuickSheet(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || !this.quickSheet || !this.sheetBody) return;

        this.renderSheetContent(product);
        this.quickSheet.showModal();
    }

    renderSheetContent(product) {
        const discount = product.discount_percent || (product.mrp && product.selling_price ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) : 0);
        const slug = product.slug || (product.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const detailUrl = `product.html?id=${encodeURIComponent(product.id)}&name=${encodeURIComponent(slug)}`;
        
        const waText = encodeURIComponent(`Hi MKart Gajuwaka! I would like to order:
Product: ${product.title} (ID: ${product.id})
Special Price: ₹${product.selling_price} (MRP: ₹${product.mrp}, ${discount}% OFF)
Please confirm stock for Gajuwaka store pickup / delivery in Vizag.`);

        let imageList = [];
        if (product.specs && Array.isArray(product.specs.images) && product.specs.images.length > 0) {
            imageList = product.specs.images.slice(0, 6);
        } else if (Array.isArray(product.images) && product.images.length > 0) {
            imageList = product.images.slice(0, 6);
        } else if (product.image) {
            imageList = [product.image];
        } else {
            imageList = ['images/category-cases-v2.png'];
        }

        const mainImage = imageList[0];
        const offerTag = (product.specs && product.specs.offer_tag) || product.offer_tag || '';
        const highlights = Array.isArray(product.highlights) && product.highlights.length > 0
            ? product.highlights.slice(0, 3)
            : [];

        this.sheetBody.innerHTML = `
            <!-- Top Preview: Image + Meta -->
            <div class="sheet-top-preview">
                <div class="sheet-img-box">
                    <img id="sheetHeroImg" src="${mainImage}" alt="${product.title}">
                </div>
                <div class="sheet-top-meta">
                    <span class="sheet-category-badge">${product.category || 'Accessories'}</span>
                    <h2 id="sheetProductTitle" class="sheet-product-title">${product.title}</h2>
                    <div class="sheet-price-row">
                        <span class="sheet-selling-price">₹${Number(product.selling_price).toLocaleString('en-IN')}</span>
                        ${product.mrp ? `<span class="sheet-mrp">₹${Number(product.mrp).toLocaleString('en-IN')}</span>` : ''}
                        ${discount > 0 ? `<span class="sheet-discount-pill">${discount}% OFF</span>` : ''}
                    </div>
                </div>
            </div>

            <!-- Multi-Image Thumbnails (if > 1) -->
            ${imageList.length > 1 ? `
                <div class="sheet-thumbs-strip" role="tablist" aria-label="Product photos">
                    ${imageList.map((img, idx) => `
                        <button type="button" 
                                class="sheet-thumb-item ${idx === 0 ? 'active' : ''}" 
                                onclick="window.mkartCatalog.switchSheetImage('${img}', this)"
                                aria-label="Photo ${idx + 1}">
                            <img src="${img}" alt="Thumb ${idx + 1}" loading="lazy">
                        </button>
                    `).join('')}
                </div>
            ` : ''}

            <!-- Special Offer Tag -->
            ${offerTag ? `
                <div class="sheet-offer-box">
                    <i class="fa-solid fa-gift"></i>
                    <span><strong>Store Offer:</strong> ${offerTag}</span>
                </div>
            ` : ''}

            <!-- Key Features / Highlights -->
            ${highlights.length > 0 ? `
            <ul class="sheet-highlights">
                ${highlights.map(h => `
                    <li>
                        <i class="fa-solid fa-circle-check"></i>
                        <span>${h}</span>
                    </li>
                `).join('')}
            </ul>
            ` : ''}

            <!-- Store Stock Pill -->
            <div style="font-size: 0.8rem; font-weight: 700; color: #16a34a; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-store"></i> In Stock • Gajuwaka Main Road Shop (Ready for Pickup)
            </div>

            <!-- Sheet Bottom Action Buttons -->
            <div class="sheet-actions-wrapper">
                <a href="https://wa.me/919966258855?text=${waText}" target="_blank" rel="noopener" class="sheet-btn-buy-wa">
                    <i class="fa-brands fa-whatsapp" style="font-size: 1.25rem;"></i> ORDER NOW
                </a>
                <div class="sheet-secondary-row">
                    <a href="tel:+919966258855" class="sheet-btn-call">
                        <i class="fa-solid fa-phone"></i> Call Store
                    </a>
                    <a href="${detailUrl}" target="_blank" class="sheet-btn-view-full">
                        Full Specs <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        `;
    }

    switchSheetImage(imgSrc, btnEl) {
        const hero = document.getElementById('sheetHeroImg');
        if (hero) hero.src = imgSrc;
        const allThumbs = document.querySelectorAll('.sheet-thumb-item');
        allThumbs.forEach(t => t.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
    }

    openModal(productId) {
        this.openQuickSheet(productId);
    }
}

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.mkartCatalog = new ProductCatalog();
});
