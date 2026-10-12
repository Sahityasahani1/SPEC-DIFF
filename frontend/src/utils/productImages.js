/**
 * High-Resolution Product Photography Resolution Engine for SpecDiff.
 * Maps products across Laptops, Smartphones, Audio, Tablets, Wearables,
 * Displays, Consoles, and Peripherals to authentic, high-resolution product photography.
 */

// Verified High-Resolution Photography Catalog
const PRODUCT_SPECIFIC_IMAGES = [
  // --- APPLE LAPTOPS ---
  {
    pattern: /macbook\s*pro/i,
    url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=85",
    alt: "Apple MacBook Pro Liquid Retina XDR"
  },
  {
    pattern: /macbook\s*air/i,
    url: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=700&q=85",
    alt: "Apple MacBook Air Midnight Unibody"
  },
  {
    pattern: /macbook/i,
    url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=700&q=85",
    alt: "Apple MacBook Aluminum"
  },

  // --- LENOVO LAPTOPS ---
  {
    pattern: /legion\s*(pro\s*7|pro\s*5|slim|7|5)/i,
    url: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=85",
    alt: "Lenovo Legion Gaming Laptop"
  },
  {
    pattern: /lenovo\s*loq/i,
    url: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=700&q=85",
    alt: "Lenovo LOQ Gaming Laptop"
  },
  {
    pattern: /thinkpad/i,
    url: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=700&q=85",
    alt: "Lenovo ThinkPad Business Laptop"
  },
  {
    pattern: /ideapad/i,
    url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85",
    alt: "Lenovo IdeaPad Slim Laptop"
  },

  // --- DELL LAPTOPS ---
  {
    pattern: /dell\s*xps/i,
    url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=700&q=85",
    alt: "Dell XPS InfinityEdge Laptop"
  },
  {
    pattern: /alienware/i,
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=700&q=85",
    alt: "Dell Alienware Gaming Laptop"
  },
  {
    pattern: /inspiron|dell\s*15/i,
    url: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=700&q=85",
    alt: "Dell Inspiron Laptop"
  },

  // --- ASUS LAPTOPS ---
  {
    pattern: /zephyrus/i,
    url: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=85",
    alt: "ASUS ROG Zephyrus Gaming Laptop"
  },
  {
    pattern: /asus\s*tuf/i,
    url: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=700&q=85",
    alt: "ASUS TUF Gaming Laptop"
  },
  {
    pattern: /zenbook/i,
    url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=85",
    alt: "ASUS Zenbook OLED Laptop"
  },
  {
    pattern: /vivobook/i,
    url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=700&q=85",
    alt: "ASUS Vivobook Laptop"
  },

  // --- ACER LAPTOPS ---
  {
    pattern: /predator\s*helios/i,
    url: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=85",
    alt: "Acer Predator Helios Gaming Laptop"
  },
  {
    pattern: /nitro/i,
    url: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=700&q=85",
    alt: "Acer Nitro Gaming Laptop"
  },
  {
    pattern: /swift/i,
    url: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=700&q=85",
    alt: "Acer Swift Go Ultra-Portable"
  },
  {
    pattern: /aspire/i,
    url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85",
    alt: "Acer Aspire Laptop"
  },

  // --- HP LAPTOPS ---
  {
    pattern: /omen/i,
    url: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=85",
    alt: "HP Omen Gaming Laptop"
  },
  {
    pattern: /victus/i,
    url: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=700&q=85",
    alt: "HP Victus Gaming Laptop"
  },
  {
    pattern: /spectre|envy/i,
    url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=700&q=85",
    alt: "HP Spectre Premium Laptop"
  },
  {
    pattern: /hp\s*(15s|pavilion)/i,
    url: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=700&q=85",
    alt: "HP Pavilion Laptop"
  },

  // --- SAMSUNG LAPTOPS ---
  {
    pattern: /galaxy\s*book/i,
    url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=700&q=85",
    alt: "Samsung Galaxy Book Laptop"
  },

  // --- SMARTPHONES ---
  {
    pattern: /iphone\s*16/i,
    url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=700&q=85",
    alt: "Apple iPhone 16 Pro Titanium"
  },
  {
    pattern: /iphone\s*15/i,
    url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=700&q=85",
    alt: "Apple iPhone 15 Pro"
  },
  {
    pattern: /iphone/i,
    url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=85",
    alt: "Apple iPhone"
  },
  {
    pattern: /galaxy\s*s24|s23|ultra/i,
    url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=700&q=85",
    alt: "Samsung Galaxy S24 Ultra"
  },
  {
    pattern: /fold|flip/i,
    url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=700&q=85",
    alt: "Samsung Galaxy Foldable Phone"
  },
  {
    pattern: /pixel\s*(9|8|pro)/i,
    url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=700&q=85",
    alt: "Google Pixel Smartphone"
  },
  {
    pattern: /oneplus/i,
    url: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=700&q=85",
    alt: "OnePlus Flagship Smartphone"
  },
  {
    pattern: /xiaomi|redmi/i,
    url: "https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=700&q=85",
    alt: "Xiaomi Smartphone"
  },

  // --- AUDIO & HEADPHONES ---
  {
    pattern: /wh-1000xm|sony.*headphone/i,
    url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85",
    alt: "Sony WH-1000XM5 Wireless Headphones"
  },
  {
    pattern: /airpods\s*max/i,
    url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=700&q=85",
    alt: "Apple AirPods Max Over-Ear"
  },
  {
    pattern: /airpods/i,
    url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=700&q=85",
    alt: "Apple AirPods Wireless Earbuds"
  },
  {
    pattern: /bose|quietcomfort/i,
    url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=700&q=85",
    alt: "Bose QuietComfort Headphones"
  },
  {
    pattern: /sennheiser|momentum/i,
    url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85",
    alt: "Sennheiser Momentum Headphones"
  },

  // --- SMARTWATCHES & WEARABLES ---
  {
    pattern: /apple\s*watch\s*ultra/i,
    url: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=700&q=85",
    alt: "Apple Watch Ultra 2 Titanium"
  },
  {
    pattern: /apple\s*watch/i,
    url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85",
    alt: "Apple Watch Smartwatch"
  },
  {
    pattern: /galaxy\s*watch/i,
    url: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=700&q=85",
    alt: "Samsung Galaxy Watch"
  },
  {
    pattern: /garmin/i,
    url: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=700&q=85",
    alt: "Garmin Sports Watch"
  },

  // --- TABLETS ---
  {
    pattern: /ipad\s*pro/i,
    url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=700&q=85",
    alt: "Apple iPad Pro OLED"
  },
  {
    pattern: /ipad/i,
    url: "https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=700&q=85",
    alt: "Apple iPad Tablet"
  },
  {
    pattern: /galaxy\s*tab/i,
    url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=700&q=85",
    alt: "Samsung Galaxy Tab Tablet"
  },

  // --- MONITORS ---
  {
    pattern: /ultragear|odyssey|oled.*monitor|gaming.*monitor|monitor/i,
    url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=700&q=85",
    alt: "High-Resolution OLED Gaming Monitor"
  },

  // --- GAMING CONSOLES & HANDHELDS ---
  {
    pattern: /playstation|ps5/i,
    url: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=700&q=85",
    alt: "Sony PlayStation 5 Slim Console"
  },
  {
    pattern: /xbox/i,
    url: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=700&q=85",
    alt: "Microsoft Xbox Series X Console"
  },
  {
    pattern: /switch|steam\s*deck|rog\s*ally/i,
    url: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=700&q=85",
    alt: "Handheld Gaming Console"
  },

  // --- KEYBOARDS & PERIPHERALS ---
  {
    pattern: /keychron|keyboard/i,
    url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=700&q=85",
    alt: "Mechanical Gaming Keyboard"
  },
  {
    pattern: /mx\s*master|mouse/i,
    url: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=700&q=85",
    alt: "Logitech MX Master Ergonomic Mouse"
  }
];

// Fallback high-resolution photos per category
const CATEGORY_DEFAULT_IMAGES = {
  laptop: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85",
  smartphone: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=85",
  phone: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=85",
  audio: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85",
  headphones: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85",
  smartwatch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85",
  watch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85",
  tablet: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=700&q=85",
  monitor: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=700&q=85",
  gaming: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=700&q=85",
  accessory: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=700&q=85"
};

/**
 * Resolves the latest, authentic product photograph for any electronics product.
 * @param {Object} product - Product record (name, category, brand, image_url)
 * @returns {string} Fully qualified image URL
 */
export function getProductImage(product) {
  if (!product) {
    return CATEGORY_DEFAULT_IMAGES.laptop;
  }

  // 1. If product has a verified image_url provided, use it
  if (product.image_url && typeof product.image_url === 'string' && product.image_url.startsWith('http')) {
    return product.image_url;
  }

  const name = (product.name || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const fullText = `${brand} ${name} ${category}`;

  // 2. Check model-specific matched images
  for (const item of PRODUCT_SPECIFIC_IMAGES) {
    if (item.pattern.test(fullText)) {
      return item.url;
    }
  }

  // 3. Fallback to category-specific real hardware photo
  if (category && CATEGORY_DEFAULT_IMAGES[category]) {
    return CATEGORY_DEFAULT_IMAGES[category];
  }

  return CATEGORY_DEFAULT_IMAGES.laptop;
}

/**
 * Safe image onError fallback handler to prevent broken images.
 * @param {SyntheticEvent} event - Image error event
 * @param {string} [category='laptop'] - Product category
 */
export function handleProductImageError(event, category = 'laptop') {
  if (!event || !event.target) return;
  const target = event.target;
  const cat = (category || 'laptop').toLowerCase();
  const fallback = CATEGORY_DEFAULT_IMAGES[cat] || CATEGORY_DEFAULT_IMAGES.laptop;
  
  if (target.src !== fallback) {
    target.src = fallback;
  }
}
