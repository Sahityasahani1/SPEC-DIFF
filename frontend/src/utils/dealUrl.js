/**
 * Outbound Retailer Deal Link Resolver
 * Ensures deal links always resolve to a working retailer landing page
 * instead of broken/dummy placeholder URLs.
 */
export function getOutboundDealUrl(product) {
  if (!product) return 'https://www.amazon.in';

  const rawUrl = product.product_url || '';

  // If the product has a valid, non-placeholder outbound URL, use it directly
  if (
    rawUrl &&
    !rawUrl.includes('example') &&
    !rawUrl.includes('placeholder') &&
    (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
  ) {
    return rawUrl;
  }

  // Otherwise, construct a high-precision search query for the specific retailer
  const query = encodeURIComponent(`${product.name} ${product.brand || ''}`.trim());
  const retailer = (product.retail_source || '').toLowerCase();

  if (retailer.includes('flipkart')) {
    return `https://www.flipkart.com/search?q=${query}`;
  } else if (retailer.includes('croma')) {
    return `https://www.croma.com/searchB?q=${query}`;
  } else if (retailer.includes('reliance')) {
    return `https://www.reliancedigital.in/search?q=${query}`;
  } else if (retailer.includes('apple')) {
    return `https://www.apple.com/in/shop/buy-iphone`;
  }

  // Default to Amazon India live search
  return `https://www.amazon.in/s?k=${query}`;
}

export function openDealUrl(product, event) {
  if (event) {
    event.stopPropagation();
  }
  const url = getOutboundDealUrl(product);
  window.open(url, '_blank', 'noopener,noreferrer');
}
