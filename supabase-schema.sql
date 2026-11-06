-- ==============================================================================
-- MKART WEBSITE: SUPABASE E-COMMERCE PRODUCTS SCHEMA & SEED DATA (CUSTOMER ONLY)
-- Run this in your Supabase Project Dashboard -> SQL Editor -> Click 'Run'
-- ==============================================================================

-- 1. Create the products table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    selling_price NUMERIC NOT NULL,
    mrp NUMERIC NOT NULL,
    discount_percent INTEGER GENERATED ALWAYS AS (
        CASE WHEN mrp > 0 THEN ROUND(((mrp - selling_price) / mrp) * 100) ELSE 0 END
    ) STORED,
    rating NUMERIC(2,1) DEFAULT 4.5,
    rating_count INTEGER DEFAULT 1,
    badge TEXT DEFAULT 'NEW',
    stock_status TEXT DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock')),
    image TEXT NOT NULL,
    images JSONB DEFAULT '[]'::jsonb,
    highlights JSONB DEFAULT '[]'::jsonb,
    specs JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- In case table already exists, add the images column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow public read-only access for website visitors
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to products') THEN
        CREATE POLICY "Allow public read access to products" 
        ON public.products 
        FOR SELECT 
        USING (true);
    END IF;
END $$;

-- 4. Policy: Allow local admin tool write access
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow local admin writes') THEN
        CREATE POLICY "Allow local admin writes" 
        ON public.products 
        FOR ALL 
        USING (true);
    END IF;
END $$;

-- ==============================================================================
-- SUPABASE STORAGE BUCKET: 'products' (FOR PHOTO UPLOADS)
-- ==============================================================================
-- 5. Create a public storage bucket named 'products'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'products', 
    'products', 
    true, 
    5242880, 
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Storage Policies: Allow public viewing and uploads into 'products' bucket
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access products bucket') THEN
        CREATE POLICY "Public Access products bucket" 
        ON storage.objects FOR SELECT 
        USING (bucket_id = 'products');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow uploads to products bucket') THEN
        CREATE POLICY "Allow uploads to products bucket" 
        ON storage.objects FOR INSERT 
        WITH CHECK (bucket_id = 'products');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow updates to products bucket') THEN
        CREATE POLICY "Allow updates to products bucket" 
        ON storage.objects FOR UPDATE 
        USING (bucket_id = 'products');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow deletes to products bucket') THEN
        CREATE POLICY "Allow deletes to products bucket" 
        ON storage.objects FOR DELETE 
        USING (bucket_id = 'products');
    END IF;
END $$;

-- 7. Seed initial products data with up to 6 gallery images
INSERT INTO public.products (id, title, slug, category, brand, selling_price, mrp, rating, rating_count, badge, stock_status, image, images, highlights, specs, description)
VALUES
(
    'mk-cs-01',
    'MagSafe Frosted Matte Shockproof Case',
    'magsafe-frosted-matte-case',
    'Cases & Covers',
    'Apple / Samsung / OnePlus',
    299,
    799,
    4.8,
    142,
    'BESTSELLER',
    'in_stock',
    'images/category-cases-v2.png',
    '["images/category-cases-v2.png", "images/cases.png", "images/category-cases-v2.png"]'::jsonb,
    '["Strong MagSafe Magnetic Ring for wireless charging & car mounts", "Translucent frosted smoke matte back (Anti-fingerprint)", "Military-grade shockproof corner airbags for drop protection"]'::jsonb,
    '{"Material": "Rigid Polycarbonate + Flexible Shockproof TPU", "Compatibility": "iPhone 13 to 16 Pro Max / Galaxy S23-S25 / OnePlus", "Bezel Height": "1.2mm raised screen edge & 0.8mm camera ring", "Warranty": "3 Months Replacement against manufacturing defects", "Colors Available": "Matte Smoke Black, Titanium Blue, Deep Emerald"}'::jsonb,
    'Premium tactical protective case engineered for everyday drop security without adding bulk. Features strong magnetic alignment for MagSafe wireless charging, car holders, and card wallets.'
),
(
    'mk-ch-02',
    '65W GaN Dual-Port Ultra Fast Wall Charger',
    '65w-gan-dual-port-fast-charger',
    'Fast Chargers',
    'MKart Pro',
    599,
    1499,
    4.9,
    218,
    'HOT DEAL',
    'in_stock',
    'images/category-charging-v2.png',
    '["images/category-charging-v2.png", "images/chargers.png", "images/category-charging-v2.png"]'::jsonb,
    '["Next-Gen GaN Technology: 50% smaller with higher energy efficiency", "Dual Ports: 1x 65W USB-C Power Delivery + 1x Quick Charge 3.0 USB-A", "Smart Temperature Management & Over-voltage surge protection"]'::jsonb,
    '{"Total Output": "65W Max Fast Charging", "Port 1 (Type-C)": "5V/3A, 9V/3A, 12V/3A, 15V/3A, 20V/3.25A (65W Max)", "Port 2 (USB-A)": "5V/3A, 9V/2A, 12V/1.5A (18W QC3.0)", "Device Support": "iPhones, Samsung Super Fast Charge, MacBooks, Tablets", "Warranty": "1 Year Replacement Warranty"}'::jsonb,
    'Charge your smartphone from 0% to 70% in just 30 minutes. Powered by Gallium Nitride (GaN) semiconductors for ultra-cool, ultra-compact high-speed power delivery.'
),
(
    'mk-sg-03',
    '9H Privacy Matte Anti-Peeping Tempered Glass',
    '9h-privacy-matte-tempered-glass',
    'Screen Protectors',
    'ArmorGuard',
    149,
    499,
    4.7,
    95,
    'POPULAR',
    'in_stock',
    'images/screen_guards.png',
    '["images/screen_guards.png", "images/category-cases-v2.png"]'::jsonb,
    '["28-degree private viewing angle — blocks side snooping on buses/crowds", "Silky matte anti-glare finish: no sun glare & no fingerprint smudges", "Free precision installation in store at our Gajuwaka branch"]'::jsonb,
    '{"Hardness Rating": "9H Diamond-level Scratch Resistance", "Coating": "Electrolytic Oleophobic Hydrophobic Coating", "Edge Profile": "2.5D Curved Polished Edges (Zero Sharpness)", "Touch Sensitivity": "100% Native Touch Response (Gaming Friendly)", "Installation": "Bubble-Free Alignment (Done Free In-Store)"}'::jsonb,
    'Keep your banking passwords, private chats, and personal data secure from wandering eyes. Only direct screen viewers see crystal clear display; side views see complete black.'
),
(
    'mk-au-04',
    'BassPro Wireless Neckband with 40H Playtime',
    'basspro-wireless-neckband-40h',
    'Audio & Speakers',
    'boAt / Noise / Generic',
    499,
    1699,
    4.6,
    180,
    'VALUE BUY',
    'in_stock',
    'images/category-audio-v2.png',
    '["images/category-audio-v2.png", "images/category-smart-v2.png"]'::jsonb,
    '["40 Hours continuous playback on a single charge", "ASAP Charge: 10 minutes charging gives 10 hours of music", "Dual Mic Environmental Noise Cancellation (ENC) for clear calling"]'::jsonb,
    '{"Drivers": "12mm Neodymium Dynamic Bass Boost Drivers", "Bluetooth": "Bluetooth v5.3 (10m range, Low Latency 50ms Gaming Mode)", "Water Resistance": "IPX5 Sweat & Water Resistant", "Controls": "Inline Volume, Track & Voice Assistant Button", "Warranty": "6 Months Replacement"}'::jsonb,
    'Ergonomic silicone neckband designed for all-day workouts, commute, and business calling with thumping deep bass and crystal clear microphones.'
),
(
    'mk-gd-05',
    'Mini Pocket Bluetooth Thermal Printer (Inkless)',
    'mini-pocket-thermal-printer-inkless',
    'Smart Gadgets',
    'MKart Tech',
    899,
    1999,
    4.8,
    110,
    'TRENDING',
    'in_stock',
    'images/hero-slider/mini-printer.png',
    '["images/hero-slider/mini-printer.png", "images/gadgets.png"]'::jsonb,
    '["100% Inkless Thermal Printing — never buy expensive ink or toner!", "Connects to Android and iPhone via Bluetooth in seconds", "Includes 3 free thermal paper rolls in the box"]'::jsonb,
    '{"Print Technology": "Direct Thermal (203 DPI Black & White)", "Battery": "1200mAh Built-in Rechargeable (USB Type-C Charging)", "Print Width": "57mm Paper Width", "App Functions": "Print Study Notes, To-Do Lists, Photos, Labels, Barcodes", "Dimensions": "8.5 x 8.5 x 4.0 cm (Ultra Compact Pocket Size)"}'::jsonb,
    'The viral pocket printer seen all over Instagram! Perfect for students, shop owners, to-do list lovers, and scrapbooking. No ink required ever.'
),
(
    'mk-sw-06',
    'Smart Watch Ultra 2 with Bluetooth HD Calling',
    'smart-watch-ultra-2-bluetooth-calling',
    'Smart Gadgets',
    'Ultra Series',
    999,
    2999,
    4.7,
    240,
    'HOT DEAL',
    'in_stock',
    'images/category-smart-v2.png',
    '["images/category-smart-v2.png", "images/gadgets.png"]'::jsonb,
    '["Large 2.01-inch HD Infinite Display with smooth touch", "Bluetooth calling directly from your wrist (Built-in mic & speaker)", "Health Tracking: Heart rate, SpO2, sleep monitoring & sports modes"]'::jsonb,
    '{"Display": "2.01 inch IPS HD Display (320x385 pixels)", "Battery Life": "Up to 4-5 Days on single charge (Wireless Magnetic Charger)", "Build": "Titanium-finish zinc alloy casing + Ocean Silicone Strap", "Compatibility": "Compatible with all Android and iOS devices", "Warranty": "6 Months Store Warranty"}'::jsonb,
    'Full-featured flagship look with Bluetooth dialing, call logs, WhatsApp message previews, customizable watch faces, and daily health tracking.'
),
(
    'mk-hd-07',
    'Magnetic 360° Rotating Car Dashboard Mount',
    'magnetic-360-car-dashboard-mount',
    'Holders & Stands',
    'GripMax',
    249,
    699,
    4.6,
    88,
    'BEST VALUE',
    'in_stock',
    'images/category-holders-v2.png',
    '["images/category-holders-v2.png", "images/gadgets.png"]'::jsonb,
    '["6x N52 Neodymium Magnets — phone won''t fall even on speed breakers", "360-degree alloy ball joint for landscape GPS & portrait calling", "Strong industrial 3M VHB adhesive base leaves no residue"]'::jsonb,
    '{"Body Material": "Aircraft-grade Aluminum Alloy + Soft Silicone Pad", "Mount Placement": "Car Dashboard, Windshield, Office Workstation", "Weight Capacity": "Holds phones up to 450 grams securely", "In The Box": "1x Car Mount, 2x Ultra-thin Metal Plates, 1x Extra 3M Pad"}'::jsonb,
    'Effortlessly mount your smartphone with one hand. Sleek metallic design matches any car interior and provides rock-solid phone stabilization for GPS navigation.'
),
(
    'mk-cb-08',
    '100W PD Braided Fast Charging Type-C to Type-C (1.5m)',
    '100w-pd-braided-type-c-cable',
    'Fast Chargers',
    'VoltCraft',
    199,
    599,
    4.9,
    315,
    'ESSENTIAL',
    'in_stock',
    'images/chargers.png',
    '["images/chargers.png", "images/category-charging-v2.png"]'::jsonb,
    '["Supports 100W Power Delivery (5A Max) for Laptops, iPads & Phones", "Double-braided high-density nylon with 25,000+ bend lifespan", "Built-in E-Marker smart chip prevents battery degradation"]'::jsonb,
    '{"Connector Type": "USB-C to USB-C (Reversible)", "Max Power": "100W (20V / 5A)", "Cable Length": "1.5 Meters (Perfect length for car & bed)", "Data Transfer Rate": "480 Mbps high-speed data sync", "Warranty": "6 Months Replacement"}'::jsonb,
    'Never struggle with flimsy cables again. Heavy-duty zinc-alloy connectors with reinforced strain relief ensure ultra-fast and reliable charging for all your USB-C devices.'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    selling_price = EXCLUDED.selling_price,
    mrp = EXCLUDED.mrp,
    rating = EXCLUDED.rating,
    badge = EXCLUDED.badge,
    stock_status = EXCLUDED.stock_status,
    images = EXCLUDED.images,
    highlights = EXCLUDED.highlights,
    specs = EXCLUDED.specs,
    description = EXCLUDED.description,
    updated_at = now();
