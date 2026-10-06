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

export async function uploadCatalogCSV(file, adminKey = 'specdiff_admin_secret_key_2026') {
  const formData = new FormData();
  formData.append('file', file);
  const headers = {};
  if (adminKey) headers['X-Admin-Key'] = adminKey;

  const res = await fetch(`${API_BASE}/admin/catalog/upload`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Failed to upload CSV');
  }
  return res.json();
}

export async function getUploadJobStatus(jobId, adminKey = 'specdiff_admin_secret_key_2026') {
  const headers = {};
  if (adminKey) headers['X-Admin-Key'] = adminKey;
  const res = await fetch(`${API_BASE}/admin/catalog/upload/${jobId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch upload job status');
  return res.json();
}

export async function reindexCatalog(adminKey = 'specdiff_admin_secret_key_2026') {
  const headers = {};
  if (adminKey) headers['X-Admin-Key'] = adminKey;
  const res = await fetch(`${API_BASE}/admin/catalog/reindex`, {
    method: 'POST',
    headers
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

export async function sendCopilotMessage(payload) {
  const res = await fetch(`${API_BASE}/copilot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Copilot error' }));
    throw new Error(err.detail || 'Failed to get copilot response');
  }
  return res.json();
}

export async function trackOutboundClick(payload) {
  try {
    const res = await fetch(`${API_BASE}/track/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok ? await res.json() : null;
  } catch (err) {
    console.debug('[AFFILIATE_TRACK] Non-blocking tracking err:', err);
    return null;
  }
}

