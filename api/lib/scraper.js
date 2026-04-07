import cheerio from 'cheerio';

const TIMEOUT_MS = 8000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': USER_AGENT,
        ...options.headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return resp;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function searchCharterWorld(criteria) {
  try {
    // Build search URL with query parameters
    const params = new URLSearchParams();
    params.append('sub', 'yacht-charter');
    params.append('charter_search', '1');

    if (criteria.yachtType) {
      params.append('type', criteria.yachtType);
    }
    if (criteria.yachtSize) {
      params.append('size', criteria.yachtSize);
    }
    if (criteria.destination) {
      params.append('region', criteria.destination);
    }

    const url = `https://www.charterworld.com/index.html?${params.toString()}`;
    console.log('Scraping CharterWorld:', url);

    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      console.warn('CharterWorld returned status:', resp.status);
      return [];
    }

    const html = await resp.text();
    const $ = cheerio.load(html);

    const yachts = [];

    // Parse yacht cards - adjust selectors based on actual HTML structure
    $('.yacht-card, .yacht-item, [data-yacht], .charter-yacht').each((idx, el) => {
      try {
        const nameEl = $(el).find('.yacht-name, h2, h3, [data-name]').first();
        const typeEl = $(el).find('.yacht-type, .type, [data-type]').first();
        const lengthEl = $(el).find('.length, .size, [data-length]').first();
        const locationEl = $(el).find('.location, .destination, [data-location]').first();
        const rateEl = $(el).find('.rate, .price, .cost, [data-rate]').first();
        const imgEl = $(el).find('img').first();
        const linkEl = $(el).find('a').first();

        const name = nameEl.text().trim();
        if (!name) return;

        yachts.push({
          name,
          type: typeEl.text().trim() || 'Motor Yacht',
          length: lengthEl.text().trim() || '',
          location: locationEl.text().trim() || criteria.destination || '',
          rate: rateEl.text().trim() || '',
          imageUrl: imgEl.attr('src') || '',
          sourceUrl: linkEl.attr('href') || '',
          source: 'CharterWorld',
        });
      } catch (e) {
        // Skip malformed cards
      }
    });

    console.log(`Found ${yachts.length} yachts on CharterWorld`);
    return yachts;
  } catch (err) {
    console.error('CharterWorld scraper error:', err.message);
    return [];
  }
}

export async function searchYachtCharterFleet(criteria) {
  try {
    // Build search URL
    const params = new URLSearchParams();

    if (criteria.yachtType) {
      params.append('type', criteria.yachtType);
    }
    if (criteria.yachtSize) {
      params.append('size', criteria.yachtSize);
    }
    if (criteria.destination) {
      params.append('destination', criteria.destination);
    }

    const url = `https://www.yachtcharterfleet.com/luxury-charter-yacht-search/?${params.toString()}`;
    console.log('Scraping YachtCharterFleet:', url);

    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      console.warn('YachtCharterFleet returned status:', resp.status);
      return [];
    }

    const html = await resp.text();
    const $ = cheerio.load(html);

    const yachts = [];

    // Parse yacht cards - adjust selectors based on actual HTML structure
    $('.yacht-card, .yacht-item, .charter-listing, [data-yacht]').each((idx, el) => {
      try {
        const nameEl = $(el).find('.yacht-name, h2, h3, [data-name]').first();
        const typeEl = $(el).find('.yacht-type, .type, [data-type]').first();
        const lengthEl = $(el).find('.length, .size, [data-length]').first();
        const locationEl = $(el).find('.location, .destination, [data-location]').first();
        const rateEl = $(el).find('.rate, .price, .cost, [data-rate]').first();
        const imgEl = $(el).find('img').first();
        const linkEl = $(el).find('a').first();

        const name = nameEl.text().trim();
        if (!name) return;

        yachts.push({
          name,
          type: typeEl.text().trim() || 'Motor Yacht',
          length: lengthEl.text().trim() || '',
          location: locationEl.text().trim() || criteria.destination || '',
          rate: rateEl.text().trim() || '',
          imageUrl: imgEl.attr('src') || '',
          sourceUrl: linkEl.attr('href') || '',
          source: 'YachtCharterFleet',
        });
      } catch (e) {
        // Skip malformed cards
      }
    });

    console.log(`Found ${yachts.length} yachts on YachtCharterFleet`);
    return yachts;
  } catch (err) {
    console.error('YachtCharterFleet scraper error:', err.message);
    return [];
  }
}
