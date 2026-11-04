/**
 * Backend API Client for SpecDiff / SmartPick.
 * Supports configurable VITE_API_URL environment variable for Vercel and production deployments.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/**
 * Normalizes FastAPI and HTTP error payloads into human-readable messages.
 * Formats 422 validation arrays into clean "field: reason" strings.
 */
async function parseErrorResponse(res, fallback = 'Operation failed') {
  try {
    const data = await res.json();
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        return data.detail
          .map(d => {
            const field = Array.isArray(d.loc) ? d.loc.filter(x => x !== 'body').join('.') : '';
            return field ? `${field}: ${d.msg}` : d.msg;
          })
          .join('; ');
      }
      if (typeof data.detail === 'string') {
        return data.detail;
      }
    }
    if (data?.message) return data.message;
  } catch {
    // Response was not JSON
  }
  return `${fallback} (HTTP ${res.status}: ${res.statusText || 'Error'})`;
}

/**
 * Handles network failures and disconnections with friendly guidance.
 */
function handleFetchError(err, fallback = 'Network request failed') {
  if (err instanceof TypeError && (err.message.toLowerCase().includes('fetch') || err.message.toLowerCase().includes('network'))) {
    return new Error('Could not connect to SpecDiff backend server. Please verify the API is running and reachable.');
  }
  return err instanceof Error ? err : new Error(fallback);
}

export async function getRecommendations(payload) {
  try {
    const res = await fetch(`${API_BASE}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to fetch recommendations');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Failed to fetch hardware recommendations');
  }
}

export async function getComparison(productIds, priority = 'value') {
  try {
    const res = await fetch(`${API_BASE}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: productIds, priority })
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Comparison failed');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Failed to generate hardware comparison');
  }
}

export async function getProducts(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/products?${query}`);
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to load catalog products');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Failed to connect to catalog service');
  }
}

export function getAdminKey() {
  return sessionStorage.getItem('specdiff_admin_key') || '';
}

export function setAdminKey(key) {
  if (key) {
    sessionStorage.setItem('specdiff_admin_key', key.trim());
  } else {
    sessionStorage.removeItem('specdiff_admin_key');
  }
}

export async function updateProductStock(productId, inStock, adminKey = null) {
  try {
    const key = adminKey || getAdminKey();
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['X-Admin-Key'] = key;

    const res = await fetch(`${API_BASE}/products/${productId}/stock`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ in_stock: inStock })
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to update stock status');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Failed to update stock');
  }
}

export async function uploadCatalogCSV(file, adminKey = null) {
  try {
    const key = adminKey || getAdminKey();
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (key) headers['X-Admin-Key'] = key;

    const res = await fetch(`${API_BASE}/admin/catalog/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'CSV upload failed');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'CSV upload error');
  }
}

export async function getUploadJobStatus(jobId, adminKey = null) {
  try {
    const key = adminKey || getAdminKey();
    const headers = {};
    if (key) headers['X-Admin-Key'] = key;
    const res = await fetch(`${API_BASE}/admin/catalog/upload/${jobId}`, { headers });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to fetch upload status');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Failed to check upload status');
  }
}

export async function reindexCatalog(adminKey = null) {
  try {
    const key = adminKey || getAdminKey();
    const headers = {};
    if (key) headers['X-Admin-Key'] = key;

    const res = await fetch(`${API_BASE}/admin/catalog/reindex`, {
      method: 'POST',
      headers
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to reindex catalog');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Reindexing error');
  }
}

export async function submitFeedback(payload) {
  try {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to submit feedback');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Feedback submission error');
  }
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
}

export async function sendCopilotMessage(payload) {
  try {
    const res = await fetch(`${API_BASE}/copilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Copilot failed to respond');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'AI Copilot service unreachable');
  }
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

// Price Drop Alerts & Watchlist Services
export async function createPriceAlert(payload) {
  try {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to create price alert');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Price alert error');
  }
}

export async function getPriceAlerts(email = '') {
  try {
    const url = email ? `${API_BASE}/alerts?email=${encodeURIComponent(email)}` : `${API_BASE}/alerts`;
    const res = await fetch(url);
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to fetch price alerts');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Price alerts error');
  }
}

export async function deletePriceAlert(alertId, email = '') {
  try {
    const url = email 
      ? `${API_BASE}/alerts/${alertId}?email=${encodeURIComponent(email)}` 
      : `${API_BASE}/alerts/${alertId}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to delete alert');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Alert deletion error');
  }
}

export async function getTriggeredAlerts(limit = 10) {
  try {
    const res = await fetch(`${API_BASE}/alerts/notifications?limit=${limit}`);
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to fetch notifications');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Notifications error');
  }
}

export async function simulateAlertTrigger(alertId, adminKey = null) {
  try {
    const key = adminKey || getAdminKey();
    const headers = {};
    if (key) headers['X-Admin-Key'] = key;

    const res = await fetch(`${API_BASE}/alerts/simulate-trigger/${alertId}`, {
      method: 'POST',
      headers
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to simulate price drop');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Simulation error');
  }
}

export async function addToWatchlist(payload) {
  try {
    const res = await fetch(`${API_BASE}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to add to watchlist');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Watchlist error');
  }
}

export async function getWatchlist(userIdentifier = 'default_user') {
  try {
    const res = await fetch(`${API_BASE}/watchlist?user_identifier=${encodeURIComponent(userIdentifier)}`);
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to fetch watchlist');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Watchlist error');
  }
}

export async function removeFromWatchlist(identifier, userIdentifier = 'default_user') {
  try {
    const res = await fetch(`${API_BASE}/watchlist/${identifier}?user_identifier=${encodeURIComponent(userIdentifier)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const msg = await parseErrorResponse(res, 'Failed to remove from watchlist');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    throw handleFetchError(err, 'Watchlist removal error');
  }
}
