/**
 * MKart Google Sitemap Generator
 * Queries Supabase (or data/products.json) and writes an SEO-optimized sitemap.xml
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SITE_URL = 'https://www.mkartvizag.in';
const SUPABASE_CONFIG = {
    url: 'https://qryizrgkzamytqyebmuy.supabase.co',
    anonKey: 'sb_publishable_TYj0vqJF7UYuWS08CwONsQ_C17O8oxD',
    table: 'products'
};

async function fetchFromSupabase() {
    return new Promise((resolve) => {
        const endpoint = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?select=*&order=created_at.desc`;
        const options = {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
            }
        };

        https.get(endpoint, options, (res) => {
            if (res.statusCode !== 200) {
                return resolve(null);
            }
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    resolve(Array.isArray(data) ? data : null);
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

function loadFromLocalJson() {
    try {
        const filePath = path.join(__dirname, 'data', 'products.json');
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn('Could not read local data/products.json', e.message);
    }
    return [];
}

async function generateSitemap() {
    console.log('Generating Google XML Sitemap for MKart...');
    let products = await fetchFromSupabase();

    if (!products || !products.length) {
        console.log('Falling back to local data/products.json...');
        products = loadFromLocalJson();
    }

    console.log(`Loaded ${products.length} products for sitemap indexing.`);

    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    <!-- Homepage -->
    <url>
        <loc>${SITE_URL}/</loc>
        <lastmod>${today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <!-- Deals & Products Section -->
    <url>
        <loc>${SITE_URL}/#products</loc>
        <lastmod>${today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <!-- Store Catalog -->
    <url>
        <loc>${SITE_URL}/#catalog</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
`;

    products.forEach((p) => {
        const slug = p.slug || (p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const productUrl = `${SITE_URL}/product.html?id=${encodeURIComponent(p.id)}&amp;name=${encodeURIComponent(slug)}`;
        const lastMod = p.updated_at ? p.updated_at.split('T')[0] : today;

        let imgUrl = (p.specs && Array.isArray(p.specs.images) && p.specs.images[0]) || (Array.isArray(p.images) && p.images[0]) || p.image || 'images/category-cases-v2.png';
        if (!imgUrl.startsWith('http')) {
            imgUrl = `${SITE_URL}/${imgUrl.replace(/^\/+/, '')}`;
        }

        xml += `    <!-- Product: ${p.title.replace(/&/g, '&amp;')} -->
    <url>
        <loc>${productUrl}</loc>
        <lastmod>${lastMod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.85</priority>
        <image:image>
            <image:loc>${imgUrl.replace(/&/g, '&amp;')}</image:loc>
            <image:title>${p.title.replace(/&/g, '&amp;')}</image:title>
            <image:caption>Buy ${p.title.replace(/&/g, '&amp;')} at MKart Gajuwaka Vizag</image:caption>
        </image:image>
    </url>
`;
    });

    xml += `</urlset>\n`;

    const outPath = path.join(__dirname, 'sitemap.xml');
    fs.writeFileSync(outPath, xml, 'utf-8');
    console.log(`✅ Successfully generated sitemap.xml with ${products.length + 3} indexed URLs!`);
}

generateSitemap();
