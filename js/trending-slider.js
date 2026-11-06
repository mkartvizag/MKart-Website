/**
 * MKart Trending Gadgets Showcase Engine
 * Auto-rotates up to 4 trending products in the existing promo banner template.
 * Supports Supabase, localStorage, and data/trending.json fallback.
 */

(function () {
    const SUPABASE_CONFIG = {
        url: 'https://qryizrgkzamytqyebmuy.supabase.co',
        anonKey: 'sb_publishable_TYj0vqJF7UYuWS08CwONsQ_C17O8oxD'
    };

    class TrendingSlider {
        constructor() {
            this.container = document.getElementById('trendingPromoBanner');
            this.sliderBox = document.getElementById('trendingImageSlider');
            this.badgeText = document.getElementById('trendingBadgeText');
            this.titleEl = document.getElementById('trendingProductTitle');
            this.priceEl = document.getElementById('trendingProductPrice');
            this.mrpEl = document.getElementById('trendingProductMrp');
            this.discEl = document.getElementById('trendingProductDiscount');
            this.orderBtn = document.getElementById('trendingOrderBtn');
            this.videoBtn = document.getElementById('trendingVideoBtn');
            this.dotsBox = document.getElementById('trendingDots');

            this.items = [];
            this.currentIndex = 0;
            this.timer = null;
            this.intervalMs = 4500;
            this.isPaused = false;

            if (!this.container) return;

            this.bindInteractions();
            this.init();
        }

        bindInteractions() {
            // Pause auto-rotation on mouse enter / touch start
            this.container.addEventListener('mouseenter', () => { this.isPaused = true; });
            this.container.addEventListener('mouseleave', () => { this.isPaused = false; });
            this.container.addEventListener('touchstart', () => { this.isPaused = true; }, { passive: true });
            this.container.addEventListener('touchend', () => { 
                setTimeout(() => { this.isPaused = false; }, 2000); 
            }, { passive: true });

            // Touch swipe gesture support for mobile devices
            let startX = 0;
            this.container.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches.length > 0) {
                    startX = e.touches[0].clientX;
                }
            }, { passive: true });

            this.container.addEventListener('touchend', (e) => {
                if (e.changedTouches && e.changedTouches.length > 0) {
                    const diffX = e.changedTouches[0].clientX - startX;
                    if (Math.abs(diffX) > 40) {
                        if (diffX < 0) this.next();
                        else this.prev();
                        this.restartTimer();
                    }
                }
            }, { passive: true });
        }

        async init() {
            // 1. Try local trending config or file
            let trendingConfig = null;
            try {
                const stored = localStorage.getItem('mkart_trending_config');
                if (stored) trendingConfig = JSON.parse(stored);
            } catch (e) {}

            if (!trendingConfig || !trendingConfig.length) {
                try {
                    const res = await fetch('data/trending.json');
                    if (res.ok) trendingConfig = await res.json();
                } catch (e) {}
            }

            // 2. Fetch products to resolve details
            let allProducts = [];
            if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
                try {
                    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/products?select=*`, {
                        headers: {
                            'apikey': SUPABASE_CONFIG.anonKey,
                            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
                        }
                    });
                    if (res.ok) allProducts = await res.json();
                } catch (e) {}
            }

            if (!allProducts.length) {
                try {
                    const res = await fetch('data/products.json');
                    if (res.ok) allProducts = await res.json();
                } catch (e) {}
            }

            this.buildItems(allProducts, trendingConfig);
        }

        buildItems(products, trendingConfig) {
            if (!products || !products.length) return;

            // Check if products have specs.is_trending or specs.trending_rank
            const supabaseTrending = products
                .filter(p => p.specs && (p.specs.is_trending === true || p.specs.trending_rank > 0))
                .sort((a, b) => (a.specs.trending_rank || 99) - (b.specs.trending_rank || 99));

            let resolved = [];

            if (supabaseTrending.length > 0) {
                resolved = supabaseTrending.slice(0, 4).map(p => ({
                    product: p,
                    badge: (p.specs && p.specs.trending_badge) || "Today's Trending Gadget",
                    video: (p.specs && p.specs.video_url) || "https://www.instagram.com/reel/DbvZprNiFGD/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=="
                }));
            } else if (trendingConfig && trendingConfig.length > 0) {
                resolved = trendingConfig.slice(0, 4).map(cfg => {
                    const p = products.find(item => item.id === cfg.product_id) || products[0];
                    return {
                        product: p,
                        badge: cfg.badge_text || "Today's Trending Gadget",
                        video: cfg.video_url || "https://www.instagram.com/reel/DbvZprNiFGD/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=="
                    };
                });
            } else {
                // Fallback: top 4 products
                resolved = products.slice(0, 4).map(p => ({
                    product: p,
                    badge: p.badge ? `🔥 ${p.badge}` : "Today's Trending Gadget",
                    video: "https://instagram.com/mkartvizag"
                }));
            }

            this.items = resolved;
            this.render();
            this.startTimer();
        }

        render() {
            if (!this.items.length) return;

            // Render Slides
            if (this.sliderBox) {
                this.sliderBox.innerHTML = this.items.map((item, idx) => {
                    const p = item.product;
                    const imgUrl = (Array.isArray(p.images) && p.images[0]) || p.image || 'images/hero-slider/mini-printer.png';
                    return `<img src="${imgUrl}" class="hero-slide ${idx === 0 ? 'active' : ''}" alt="${p.title}" data-index="${idx}">`;
                }).join('');
            }

            // Render Dots
            if (this.dotsBox) {
                if (this.items.length > 1) {
                    this.dotsBox.style.display = 'flex';
                    this.dotsBox.innerHTML = this.items.map((_, idx) => 
                        `<span class="promo-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" title="Product ${idx + 1}"></span>`
                    ).join('');

                    this.dotsBox.querySelectorAll('.promo-dot').forEach(dot => {
                        dot.addEventListener('click', (e) => {
                            const idx = Number(e.currentTarget.getAttribute('data-index'));
                            this.goToSlide(idx);
                            this.restartTimer();
                        });
                    });
                } else {
                    this.dotsBox.style.display = 'none';
                }
            }

            this.updateActiveInfo(0);
        }

        updateActiveInfo(index) {
            if (!this.items[index]) return;
            const item = this.items[index];
            const p = item.product;

            // Badge
            if (this.badgeText) {
                this.badgeText.textContent = item.badge || "Today's Trending Gadget";
            }

            // Title
            if (this.titleEl) {
                this.titleEl.textContent = p.title;
            }

            // Price & MRP & Discount
            const price = Number(p.selling_price || 0);
            const mrp = Number(p.mrp || 0);
            const disc = p.discount_percent || (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

            if (this.priceEl) this.priceEl.textContent = `₹${price.toLocaleString('en-IN')}`;
            if (this.mrpEl) this.mrpEl.textContent = mrp > 0 ? `₹${mrp.toLocaleString('en-IN')}` : '';
            if (this.discEl) {
                if (disc > 0) {
                    this.discEl.style.display = 'inline-block';
                    this.discEl.textContent = `${disc}% OFF`;
                } else {
                    this.discEl.style.display = 'none';
                }
            }

            // WhatsApp Order Now Button
            if (this.orderBtn) {
                const message = `Hi Mkart, I want to order the ${p.title} (₹${price})!`;
                this.orderBtn.href = `https://wa.me/919966258855?text=${encodeURIComponent(message)}`;
            }

            // Video Button
            if (this.videoBtn) {
                const videoLink = item.video || `product.html?id=${encodeURIComponent(p.id)}`;
                this.videoBtn.href = videoLink;
            }

            // Active Slide Image
            if (this.sliderBox) {
                const slides = this.sliderBox.querySelectorAll('.hero-slide');
                slides.forEach((s, idx) => {
                    s.classList.toggle('active', idx === index);
                });
            }

            // Active Dot
            if (this.dotsBox) {
                const dots = this.dotsBox.querySelectorAll('.promo-dot');
                dots.forEach((d, idx) => {
                    d.classList.toggle('active', idx === index);
                });
            }
        }

        goToSlide(index) {
            this.currentIndex = (index + this.items.length) % this.items.length;
            this.updateActiveInfo(this.currentIndex);
        }

        next() {
            if (this.items.length <= 1) return;
            this.goToSlide(this.currentIndex + 1);
        }

        prev() {
            if (this.items.length <= 1) return;
            this.goToSlide(this.currentIndex - 1);
        }

        startTimer() {
            this.stopTimer();
            if (this.items.length <= 1) return;
            this.timer = setInterval(() => {
                if (!this.isPaused) {
                    this.next();
                }
            }, this.intervalMs);
        }

        stopTimer() {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
        }

        restartTimer() {
            this.startTimer();
        }

        refreshWithProducts(products) {
            this.buildItems(products, null);
        }
    }

    // Expose instance and auto-initialize on DOMContentLoaded
    window.TrendingSlider = {
        instance: null,
        init: function () {
            this.instance = new TrendingSlider();
        },
        refreshWithProducts: function (products) {
            if (this.instance) this.instance.refreshWithProducts(products);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.TrendingSlider.init());
    } else {
        window.TrendingSlider.init();
    }
})();
