/**
 * Backend API Client.
 */

const API_BASE = '/api';

export async function getRecommendations(payload) {
  const res = await fetch(`${API_BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Server Error' }));
    throw new Error(err.detail || 'Failed to fetch recommendations');
  }
  return res.json();
}

export async function getComparison(productIds, priority = 'value') {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_ids: productIds, priority })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Comparison failed' }));
    throw new Error(err.detail || 'Failed to generate comparison');
  }
  return res.json();
}

export async function getProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/products?${query}`);
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}

export async function updateProductStock(productId, inStock) {
  const res = await fetch(`${API_BASE}/products/${productId}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ in_stock: inStock })
  });
  if (!res.ok) throw new Error('Failed to update stock status');
  return res.json();
}

export async function uploadCatalogCSV(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/admin/catalog/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Failed to upload CSV');
  }
  return res.json();
}

export async function reindexCatalog() {
  const res = await fetch(`${API_BASE}/admin/catalog/reindex`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reindex catalog');
  return res.json();
}

export async function submitFeedback(payload) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to submit feedback');
  return res.json();
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
}
