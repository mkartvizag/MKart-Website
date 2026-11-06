/**
 * MKart Dedicated Product Details Engine
 * Flipkart-Style Viewing Experience with Supabase Live Sync
 */

const SUPABASE_CONFIG = {
    url: 'https://qryizrgkzamytqyebmuy.supabase.co',
    anonKey: 'sb_publishable_TYj0vqJF7UYuWS08CwONsQ_C17O8oxD',
    table: 'products'
};

class ProductDetailPage {
    constructor() {
        this.productId = this.getProductIdFromURL();
        this.product = null;
        this.allProducts = [];
        this.activeImageIndex = 0;
        this.images = [];

        this.init();
    }

    getProductIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || params.get('slug') || 'mk-cs-01';
    }

    async init() {
        this.showLoading();
        await this.loadProductData();
        if (this.product) {
            this.renderProduct();
            this.renderRelatedProducts();
            this.bindEvents();
        } else {
            this.showNotFound();
        }
    }

    showLoading() {
        const container = document.getElementById('productDetailRoot');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 100px 20px; color: #64748b;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; color: #e60000; margin-bottom: 16px;"></i>
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">Loading product details...</h2>
                    <p>Fetching real-time stock and prices from Gajuwaka store</p>
                </div>
            `;
        }
    }

    showNotFound() {
        const container = document.getElementById('productDetailRoot');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 100px 20px; max-width: 500px; margin: 0 auto;">
                    <i class="fa-solid fa-box-open" style="font-size: 3.5rem; color: #cbd5e1; margin-bottom: 16px;"></i>
                    <h2 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Product Not Found</h2>
                    <p style="color: #64748b; margin-bottom: 24px;">The accessory you are looking for might have been moved or is currently out of stock.</p>
                    <a href="index.html#products" class="btn btn-primary">
                        <i class="fa-solid fa-arrow-left"></i> Back to Store Catalog
                    </a>
                </div>
            `;
        }
    }

    async loadProductData() {
        // 1. Try Supabase
        if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
            try {
                // Fetch current product
                const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?select=*&order=created_at.desc`, {
                    headers: {
                        'apikey': SUPABASE_CONFIG.anonKey,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        this.allProducts = data;
                        this.product = data.find(p => p.id === this.productId || p.slug === this.productId) || data[0];
                        return;
                    }
                }
            } catch (err) {
                console.warn('Supabase fetch failed, falling back to local json', err);
            }
        }

        // 2. Fallback to data/products.json
        try {
            const res = await fetch('data/products.json');
            if (res.ok) {
                this.allProducts = await res.json();
                this.product = this.allProducts.find(p => p.id === this.productId || p.slug === this.productId) || this.allProducts[0];
            }
        } catch (e) {
            console.error('Failed to load local json', e);
        }
    }

    renderProduct() {
        const p = this.product;
        if (!p) return;

        // Images array extraction
        if (p.specs && Array.isArray(p.specs.images) && p.specs.images.length > 0) {
            this.images = p.specs.images;
        } else if (Array.isArray(p.images) && p.images.length > 0) {
            this.images = p.images;
        } else if (p.image) {
            this.images = [p.image];
        } else {
            this.images = ['images/category-cases-v2.png'];
        }

        // Apply Google SEO & OpenGraph Structured Data
        this.updateSEO(p);

        const offerTag = (p.specs && p.specs.offer_tag) || p.offer_tag || '';
        const discount = p.discount_percent || (p.mrp && p.selling_price ? Math.round(((p.mrp - p.selling_price) / p.mrp) * 100) : 0);
        const savingsAmount = (p.mrp && p.selling_price && p.mrp > p.selling_price) ? (p.mrp - p.selling_price) : 0;

        const waText = encodeURIComponent(`Hi MKart Gajuwaka, I would like to order:
Product: ${p.title} (ID: ${p.id})
Category: ${p.category}
Price: ₹${p.selling_price} (MRP: ₹${p.mrp}, ${discount}% OFF)
Please confirm stock availability for store pickup / delivery in Visakhapatnam.`);

        const isStock = p.stock_status === 'in_stock';

        // Filter specs to display (skip images and offer_tag internal properties)
        const cleanSpecs = {};
        if (p.specs && typeof p.specs === 'object') {
            for (const [key, val] of Object.entries(p.specs)) {
                if (key !== 'images' && key !== 'offer_tag') {
                    cleanSpecs[key] = val;
                }
            }
        }
        if (p.brand && !cleanSpecs['Brand']) cleanSpecs['Brand'] = p.brand;
        if (p.category && !cleanSpecs['Category']) cleanSpecs['Category'] = p.category;

        const root = document.getElementById('productDetailRoot');
        if (!root) return;

        root.innerHTML = `
            <!-- Breadcrumbs -->
            <section class="fk-breadcrumb-section" aria-label="Breadcrumbs">
                <div class="container fk-breadcrumb-container">
                    <a href="index.html"><i class="fa-solid fa-house"></i> Home</a>
                    <span class="fk-breadcrumb-sep">/</span>
                    <a href="index.html#products">Deals &amp; Accessories</a>
                    <span class="fk-breadcrumb-sep">/</span>
                    <span style="color: #64748b;">${p.category || 'Accessories'}</span>
                    <span class="fk-breadcrumb-sep">/</span>
                    <span class="fk-breadcrumb-current" title="${p.title}">${p.title}</span>

                    <a href="index.html#products" class="fk-back-link">
                        <i class="fa-solid fa-arrow-left"></i> Back to All Deals
                    </a>
                </div>
            </section>

            <!-- Product Main Section -->
            <section class="fk-detail-section">
                <div class="container fk-detail-grid">

                    <!-- Left: Gallery & Instant Actions -->
                    <div class="fk-detail-gallery-col">
                        <div class="fk-gallery-wrapper">
                            <!-- Thumbnails (Vertical on desktop) -->
                            <div class="fk-gallery-thumbs" id="galleryThumbs" role="tablist" aria-label="Product thumbnails">
                                ${this.images.map((img, idx) => `
                                    <button type="button" 
                                            class="fk-thumb-btn ${idx === 0 ? 'active' : ''}" 
                                            data-index="${idx}"
                                            aria-label="View photo ${idx + 1}"
                                            role="tab"
                                            aria-selected="${idx === 0 ? 'true' : 'false'}">
                                        <img src="${img}" alt="${p.title} photo ${idx + 1}" loading="lazy">
                                    </button>
                                `).join('')}
                            </div>

                            <!-- Main Viewport -->
                            <div class="fk-main-image-viewport" id="mainImageViewport">
                                <div class="fk-gallery-badge-overlay">
                                    ${p.badge ? `<span class="fk-badge-large"><i class="fa-solid fa-bolt"></i> ${p.badge}</span>` : ''}
                                    ${discount > 0 ? `<span class="fk-discount-badge-large">${discount}% OFF</span>` : ''}
                                </div>
                                <img id="mainHeroImage" 
                                     src="${this.images[0]}" 
                                     alt="${p.title}" 
                                     fetchpriority="high"
                                     width="440" 
                                     height="440">
                            </div>
                        </div>

                        <!-- Flipkart CTAs directly under Image -->
                        <div class="fk-detail-actions">
                            <a href="https://wa.me/919966258855?text=${waText}" 
                               target="_blank" 
                               rel="noopener" 
                               class="fk-btn-buy-wa"
                               aria-label="Order on WhatsApp">
                                <i class="fa-brands fa-whatsapp"></i> ORDER ON WHATSAPP
                            </a>
                            <a href="tel:+919966258855" 
                               class="fk-btn-call-store"
                               aria-label="Call store to reserve">
                                <i class="fa-solid fa-phone"></i> CALL TO RESERVE
                            </a>
                        </div>

                        <!-- Trust Strip -->
                        <div class="fk-trust-strip">
                            <div class="fk-trust-item">
                                <i class="fa-solid fa-shield-halved"></i>
                                <span>100% Genuine Mobile Accessories Guaranteed</span>
                            </div>
                            <div class="fk-trust-item">
                                <i class="fa-solid fa-screwdriver-wrench"></i>
                                <span>Free In-Store Fitting &amp; Alignment at Gajuwaka</span>
                            </div>
                            <div class="fk-trust-item">
                                <i class="fa-solid fa-truck-fast"></i>
                                <span>Instant Gajuwaka Pickup or Express Vizag Delivery</span>
                            </div>
                            <div class="fk-trust-item">
                                <i class="fa-solid fa-rotate-left"></i>
                                <span>Store Check &amp; Instant Replacement Support</span>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Product Information & Specifications -->
                    <div class="fk-detail-info-col">

                        <div class="fk-detail-header-meta">
                            <span class="fk-category-pill">${p.category || 'Accessories'}</span>
                            <span class="fk-stock-pill ${isStock ? 'fk-stock-in' : 'fk-stock-out'}">
                                <i class="fa-solid ${isStock ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                                ${isStock ? 'In Stock • Ready for Pickup' : 'Out of Stock'}
                            </span>
                            ${p.brand ? `<span style="font-size: 0.85rem; color: #64748b; font-weight: 600;">Brand: <strong style="color: #0f172a;">${p.brand}</strong></span>` : ''}
                        </div>

                        <h1 class="fk-detail-title">${p.title}</h1>

                        <!-- Ratings Row -->
                        <div class="fk-detail-rating-row">
                            <span class="fk-green-rating-chip">
                                <span>${p.rating || '4.8'}</span>
                                <i class="fa-solid fa-star"></i>
                            </span>
                            <span class="fk-rating-count-text">
                                ${p.rating_count || 120} Ratings &amp; Verified Reviews
                            </span>
                            <span class="fk-assured-tag">
                                <i class="fa-solid fa-certificate"></i> MKart Assured Store Quality
                            </span>
                        </div>

                        <!-- Price Section (Flipkart Signature) -->
                        <div class="fk-detail-price-box">
                            <span class="fk-special-price-label"><i class="fa-solid fa-tag"></i> Special Store Offer Price</span>
                            <div class="fk-price-numbers-row">
                                <span class="fk-detail-selling-price">₹${Number(p.selling_price).toLocaleString('en-IN')}</span>
                                ${p.mrp ? `<span class="fk-detail-mrp">₹${Number(p.mrp).toLocaleString('en-IN')}</span>` : ''}
                                ${discount > 0 ? `<span class="fk-detail-discount-percent">${discount}% off</span>` : ''}
                            </div>
                            ${savingsAmount > 0 ? `
                                <div style="font-size: 0.88rem; color: #16a34a; font-weight: 700;">
                                    <i class="fa-solid fa-piggy-bank"></i> You Save ₹${savingsAmount.toLocaleString('en-IN')} directly on this purchase!
                                </div>
                            ` : ''}
                            <span class="fk-tax-note">Inclusive of all local taxes • Free store installation included</span>
                        </div>

                        <!-- Available Offers (Flipkart Style) -->
                        <div class="fk-offers-card">
                            <div class="fk-offers-title">
                                <i class="fa-solid fa-gift text-red"></i> Available Store Offers
                            </div>
                            <ul class="fk-offers-list">
                                ${offerTag ? `
                                    <li class="fk-offer-item">
                                        <i class="fa-solid fa-circle-check"></i>
                                        <div><span class="fk-offer-highlight">Featured Deal:</span> ${offerTag}</div>
                                    </li>
                                ` : ''}
                                <li class="fk-offer-item">
                                    <i class="fa-solid fa-circle-check"></i>
                                    <div><span class="fk-offer-highlight">Walk-In Special:</span> Get instant ₹30 off when you pay via UPI / Cash in-store at Gajuwaka.</div>
                                </li>
                                <li class="fk-offer-item">
                                    <i class="fa-solid fa-circle-check"></i>
                                    <div><span class="fk-offer-highlight">Combo Deal:</span> Buy any Case + Tempered Glass together and get flat ₹50 combo discount.</div>
                                </li>
                                <li class="fk-offer-item">
                                    <i class="fa-solid fa-circle-check"></i>
                                    <div><span class="fk-offer-highlight">Free Fitting:</span> Free bubble-free machine application by technician at our shop.</div>
                                </li>
                            </ul>
                        </div>

                        <!-- Delivery / Pincode Availability Checker -->
                        <div class="fk-delivery-card">
                            <div class="fk-delivery-header">
                                <i class="fa-solid fa-location-dot text-red"></i> Check Delivery &amp; Store Pickup
                            </div>
                            <div class="fk-pincode-form">
                                <input type="text" 
                                       id="pincodeInput" 
                                       class="fk-pincode-input" 
                                       placeholder="Enter 6-digit Pincode" 
                                       value="530026" 
                                       maxlength="6">
                                <button type="button" id="pincodeCheckBtn" class="fk-pincode-btn">Check</button>
                            </div>
                            <div class="fk-delivery-status" id="deliveryStatusBox">
                                <div><i class="fa-solid fa-circle-check"></i> <strong>Available for Pickup in 15 mins</strong> at Gajuwaka Main Road Shop</div>
                                <div class="fk-delivery-sub">Express Doorstep Delivery available across Visakhapatnam within 24 Hours.</div>
                            </div>
                        </div>

                        <!-- Key Highlights -->
                        ${Array.isArray(p.highlights) && p.highlights.length > 0 ? `
                            <div class="fk-highlights-card">
                                <h3 class="fk-section-subhead"><i class="fa-solid fa-list-check"></i> Key Highlights</h3>
                                <ul class="fk-highlights-list">
                                    ${p.highlights.map(h => `
                                        <li>
                                            <i class="fa-solid fa-check"></i>
                                            <span>${h}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}

                        <!-- Specifications Table (Flipkart 2-Column Table) -->
                        <div class="fk-specs-card">
                            <h3 class="fk-section-subhead"><i class="fa-solid fa-sliders"></i> Product Specifications</h3>
                            <table class="fk-specs-table">
                                <tbody>
                                    ${Object.entries(cleanSpecs).map(([key, val]) => `
                                        <tr>
                                            <td class="fk-spec-key">${key}</td>
                                            <td class="fk-spec-val">${val}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- Description -->
                        ${p.description ? `
                            <div class="fk-description-card">
                                <h3 class="fk-section-subhead" style="margin-top: 0;"><i class="fa-solid fa-circle-info"></i> Product Description</h3>
                                <p>${p.description}</p>
                            </div>
                        ` : ''}

                        <!-- Store Visit Box -->
                        <div class="fk-store-card">
                            <div class="fk-store-info-left">
                                <div class="fk-store-title"><i class="fa-solid fa-shop text-red"></i> Buy In-Store at Gajuwaka</div>
                                <div class="fk-store-sub">Shop No: 5, Indira Nagar, Old Gajuwaka, Visakhapatnam - 530026 (Opp Sree Kanya Theater Road)</div>
                                <div class="fk-store-sub">Timings: <strong>9:00 AM - 10:00 PM</strong> (Open All 7 Days)</div>
                            </div>
                            <a href="https://www.google.com/maps?cid=11779441657733689820" target="_blank" rel="noopener" class="fk-store-btn">
                                <i class="fa-solid fa-diamond-turn-right text-red"></i> Get Store Directions
                            </a>
                        </div>

                    </div>
                </div>
            </section>

            <!-- Similar / Related Products Section -->
            <section class="fk-related-section">
                <div class="container">
                    <h2 class="fk-related-title">Similar Accessories &amp; Popular Deals</h2>
                    <div class="fk-related-grid" id="relatedProductsGrid">
                        <!-- Populated dynamically -->
                    </div>
                </div>
            </section>

            <!-- Sticky Bottom Action Bar for Mobile View -->
            <div class="fk-mobile-bottom-bar" id="mobileBottomBar">
                <div class="fk-mobile-bottom-price">
                    <span class="fk-mobile-amount">₹${Number(p.selling_price).toLocaleString('en-IN')}</span>
                    ${discount > 0 ? `<span class="fk-mobile-discount">${discount}% OFF</span>` : ''}
                </div>
                <div class="fk-mobile-bottom-buttons">
                    <a href="tel:+919966258855" class="fk-mobile-btn-call" aria-label="Call store">
                        <i class="fa-solid fa-phone"></i> Call
                    </a>
                    <a href="https://wa.me/919966258855?text=${waText}" target="_blank" rel="noopener" class="fk-mobile-btn-wa" aria-label="Order on WhatsApp">
                        <i class="fa-brands fa-whatsapp"></i> Buy Now
                    </a>
                </div>
            </div>
        `;
    }

    renderRelatedProducts() {
        const grid = document.getElementById('relatedProductsGrid');
        if (!grid || !this.allProducts.length) return;

        // Find items in same category, or other popular accessories
        const currentCategory = this.product ? this.product.category : '';
        let related = this.allProducts.filter(p => p.id !== this.productId && p.category === currentCategory);
        if (related.length < 4) {
            const others = this.allProducts.filter(p => p.id !== this.productId && p.category !== currentCategory);
            related = [...related, ...others].slice(0, 4);
        } else {
            related = related.slice(0, 4);
        }

        grid.innerHTML = related.map(item => {
            const discount = item.discount_percent || (item.mrp && item.selling_price ? Math.round(((item.mrp - item.selling_price) / item.mrp) * 100) : 0);
            const imgs = (item.specs && Array.isArray(item.specs.images) && item.specs.images.length > 0)
                ? item.specs.images
                : (Array.isArray(item.images) && item.images.length > 0 ? item.images : (item.image ? [item.image] : ['images/category-cases-v2.png']));
            const cover = imgs[0];

            return `
                <article class="fk-product-card" style="margin-bottom: 0;">
                    <div class="fk-card-badge-container">
                        ${item.badge ? `<span class="fk-badge fk-badge-${item.badge.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${item.badge}</span>` : ''}
                        ${discount > 0 ? `<span class="fk-discount-pill">${discount}% OFF</span>` : ''}
                    </div>

                    <a href="product.html?id=${encodeURIComponent(item.id)}" class="fk-card-image-box" style="text-decoration:none; display:flex;">
                        <img src="${cover}" alt="${item.title}" loading="lazy">
                    </a>

                    <div class="fk-card-body">
                        <div class="fk-category-row">
                            <span class="fk-category-tag">${item.category || 'Accessory'}</span>
                            <div class="fk-rating-badge">
                                <span>${item.rating || '4.8'}</span>
                                <i class="fa-solid fa-star"></i>
                            </div>
                        </div>

                        <h3 class="fk-product-title">
                            <a href="product.html?id=${encodeURIComponent(item.id)}" style="color:inherit; text-decoration:none;">
                                ${item.title}
                            </a>
                        </h3>

                        <div class="fk-price-box">
                            <div class="fk-price-primary">
                                <span class="fk-currency">₹</span><span class="fk-amount">${Number(item.selling_price).toLocaleString('en-IN')}</span>
                            </div>
                            ${item.mrp ? `
                                <div class="fk-price-mrp">
                                    <span class="fk-mrp-val">₹${Number(item.mrp).toLocaleString('en-IN')}</span>
                                </div>
                            ` : ''}
                        </div>

                        <div class="fk-card-actions">
                            <a href="product.html?id=${encodeURIComponent(item.id)}" class="fk-btn-specs" style="text-decoration:none; text-align:center;">
                                View Deal
                            </a>
                            <a href="https://wa.me/919966258855?text=${encodeURIComponent(`Hi MKart, I would like to order: ${item.title} (₹${item.selling_price})`)}" 
                               target="_blank" 
                               rel="noopener" 
                               class="fk-btn-whatsapp" 
                               style="text-decoration:none; text-align:center;">
                                <i class="fa-brands fa-whatsapp"></i> Buy
                            </a>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    bindEvents() {
        // Thumbnail switcher on click or hover
        const thumbBtns = document.querySelectorAll('.fk-thumb-btn');
        const heroImg = document.getElementById('mainHeroImage');

        thumbBtns.forEach(btn => {
            const handleSwitch = (e) => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                if (this.images[idx]) {
                    thumbBtns.forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-selected', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-selected', 'true');
                    if (heroImg) {
                        heroImg.src = this.images[idx];
                    }
                }
            };

            btn.addEventListener('click', handleSwitch);
            btn.addEventListener('mouseenter', handleSwitch);
        });

        // Pincode validation button
        const checkBtn = document.getElementById('pincodeCheckBtn');
        const pinInput = document.getElementById('pincodeInput');
        const statusBox = document.getElementById('deliveryStatusBox');

        if (checkBtn && pinInput && statusBox) {
            checkBtn.addEventListener('click', () => {
                const pin = pinInput.value.trim();
                if (!/^\d{6}$/.test(pin)) {
                    statusBox.innerHTML = `
                        <div style="color: #b91c1c; font-weight: 700;">
                            <i class="fa-solid fa-triangle-exclamation"></i> Please enter a valid 6-digit Indian PIN code.
                        </div>
                    `;
                    return;
                }

                if (pin.startsWith('530')) {
                    statusBox.innerHTML = `
                        <div><i class="fa-solid fa-circle-check"></i> <strong>Direct Store Pickup in 15 Mins</strong> at MKart Gajuwaka (${pin})</div>
                        <div class="fk-delivery-sub">Same-Day Express Delivery available in Visakhapatnam area. Cash on delivery &amp; UPI accepted.</div>
                    `;
                } else {
                    statusBox.innerHTML = `
                        <div style="color: #0f172a;"><i class="fa-solid fa-truck"></i> <strong>Standard Courier Delivery to ${pin}</strong>: Delivery in 2-3 business days.</div>
                        <div class="fk-delivery-sub">Message us on WhatsApp to get direct parcel dispatch details.</div>
                    `;
                }
            });
        }
    }

    updateSEO(p) {
        const slug = p.slug || (p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const canonicalUrl = `https://www.mkartvizag.in/product.html?id=${encodeURIComponent(p.id)}&name=${encodeURIComponent(slug)}`;
        
        // Dynamic Page Title
        const pageTitle = `${p.title} - Price ₹${p.selling_price} | MKart Gajuwaka Vizag`;
        document.title = pageTitle;
        const pageTitleEl = document.getElementById('pageTitle');
        if (pageTitleEl) pageTitleEl.textContent = pageTitle;

        // Meta Description
        const desc = p.description 
            ? `${p.title} at ₹${p.selling_price} (MRP ₹${p.mrp || p.selling_price}). ${p.description.slice(0, 130)}... In-store pickup & delivery in Vizag.`
            : `Buy ${p.title} at lowest price ₹${p.selling_price} in Gajuwaka, Visakhapatnam. Genuine quality, 1-click WhatsApp order & store warranty at MKart.`;
        
        const metaDesc = document.getElementById('metaDescription');
        if (metaDesc) metaDesc.setAttribute('content', desc);

        // Keywords
        const keywords = `${p.title}, buy ${p.title} vizag, ${p.category || 'mobile accessories'} gajuwaka, ${p.brand || 'phone accessories'} store vizag, mobile shop gajuwaka, mkart vizag`;
        const metaKw = document.getElementById('metaKeywords');
        if (metaKw) metaKw.setAttribute('content', keywords);

        // Canonical Link
        const canLink = document.getElementById('canonicalLink');
        if (canLink) canLink.setAttribute('href', canonicalUrl);

        // Primary Image (absolute URL for Google & WhatsApp previews)
        let mainImg = (this.images && this.images[0]) || 'images/category-cases-v2.png';
        if (!mainImg.startsWith('http')) {
            mainImg = `https://www.mkartvizag.in/${mainImg.replace(/^\/+/, '')}`;
        }

        // OpenGraph Meta Tags
        const ogTitle = document.getElementById('ogTitle');
        if (ogTitle) ogTitle.setAttribute('content', pageTitle);
        const ogDesc = document.getElementById('ogDescription');
        if (ogDesc) ogDesc.setAttribute('content', desc);
        const ogImg = document.getElementById('ogImage');
        if (ogImg) ogImg.setAttribute('content', mainImg);
        const ogUrl = document.getElementById('ogUrl');
        if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
        const ogPrice = document.getElementById('ogPriceAmount');
        if (ogPrice) ogPrice.setAttribute('content', String(p.selling_price));

        // Twitter Card Meta Tags
        const twTitle = document.getElementById('twitterTitle');
        if (twTitle) twTitle.setAttribute('content', pageTitle);
        const twDesc = document.getElementById('twitterDescription');
        if (twDesc) twDesc.setAttribute('content', desc);
        const twImg = document.getElementById('twitterImage');
        if (twImg) twImg.setAttribute('content', mainImg);

        // Schema.org JSON-LD Structured Data for Google Rich Snippets
        const schemaEl = document.getElementById('productSchemaJson');
        if (schemaEl) {
            const schemaData = {
                "@context": "https://schema.org/",
                "@type": "Product",
                "name": p.title,
                "image": this.images.map(img => img.startsWith('http') ? img : `https://www.mkartvizag.in/${img.replace(/^\/+/, '')}`),
                "description": p.description || p.title,
                "sku": p.id,
                "mpn": p.id,
                "brand": {
                    "@type": "Brand",
                    "name": p.brand || "MKart"
                },
                "category": p.category || "Mobile Accessories",
                "offers": {
                    "@type": "Offer",
                    "url": canonicalUrl,
                    "priceCurrency": "INR",
                    "price": p.selling_price,
                    "priceValidUntil": "2027-12-31",
                    "itemCondition": "https://schema.org/NewCondition",
                    "availability": p.stock_status === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                    "seller": {
                        "@type": "LocalBusiness",
                        "name": "MKart Mobile Accessories & Gadgets",
                        "telephone": "+91-9966258855",
                        "url": "https://www.mkartvizag.in/",
                        "address": {
                            "@type": "PostalAddress",
                            "streetAddress": "Shop No: 5, Indira Nagar, Old Gajuwaka",
                            "addressLocality": "Visakhapatnam",
                            "addressRegion": "Andhra Pradesh",
                            "postalCode": "530026",
                            "addressCountry": "IN"
                        }
                    }
                },
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": String(p.rating || "4.8"),
                    "reviewCount": String(p.rating_count || "142"),
                    "bestRating": "5",
                    "worstRating": "1"
                }
            };
            schemaEl.textContent = JSON.stringify(schemaData, null, 2);
        }
    }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new ProductDetailPage();
});
