import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, AlertTriangle, Database, Power, KeyRound, ShieldCheck, Lock } from 'lucide-react';
import { 
  uploadCatalogCSV, 
  reindexCatalog, 
  getProducts, 
  updateProductStock, 
  getAdminKey, 
  setAdminKey 
} from '../services/api';

export default function AdminDashboard() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [reindexing, setReindexing] = useState(false);
  const [reindexMessage, setReindexMessage] = useState('');
  const [products, setProducts] = useState([]);
  const [loadingProds, setLoadingProds] = useState(true);

  // Admin Key Session Management
  const [adminKey, setAdminKeyState] = useState(() => getAdminKey());
  const [keyInput, setKeyInput] = useState('');
  const [keySuccess, setKeySuccess] = useState(false);

  useEffect(() => {
    loadAllProducts();
  }, []);

  const loadAllProducts = async () => {
    setLoadingProds(true);
    try {
      const data = await getProducts({ limit: 100, in_stock_only: false });
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProds(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadCatalogCSV(file);
      setUploadResult(res);
      loadAllProducts();
    } catch (err) {
      setUploadResult({ status: 'error', errors: [{ row_number: 0, sku: 'FILE', error: err.message }] });
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    setReindexMessage('');
    try {
      const res = await reindexCatalog();
      setReindexMessage(res.message);
    } catch (err) {
      setReindexMessage('Failed to re-index: ' + err.message);
    } finally {
      setReindexing(false);
    }
  };

  const handleToggleStock = async (productId, currentStock) => {
    try {
      await updateProductStock(productId, !currentStock);
      setProducts(products.map(p => p.id === productId ? { ...p, in_stock: !currentStock } : p));
    } catch (err) {
      alert('Error updating stock: ' + err.message);
    }
  };

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setAdminKey(keyInput.trim());
    setAdminKeyState(keyInput.trim());
    setKeyInput('');
    setKeySuccess(true);
    setTimeout(() => setKeySuccess(false), 3000);
  };

  const handleClearKey = () => {
    setAdminKey('');
    setAdminKeyState('');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn">
      
      {/* 0. Admin Authentication & Session Security */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#e8e5dc] shadow-sm font-jakarta">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${adminKey ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {adminKey ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-forest-950 flex items-center gap-2">
                <span>Admin Session Access</span>
                {adminKey ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold uppercase">
                    Authenticated
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold uppercase">
                    Key Required
                  </span>
                )}
              </h3>
              <p className="text-xs text-forest-900/60 mt-0.5">
                {adminKey 
                  ? 'Active session token loaded from browser session storage. Administrative actions are authorized.'
                  : 'Administrative endpoints require a valid ADMIN_API_KEY. Provide your key below to perform catalog actions.'}
              </p>
            </div>
          </div>

          {adminKey ? (
            <button
              type="button"
              onClick={handleClearKey}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
            >
              Clear Session Key
            </button>
          ) : (
            <form onSubmit={handleSaveKey} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="password"
                placeholder="Enter ADMIN_API_KEY..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="px-3.5 py-2 rounded-xl text-xs font-mono border border-[#e2dfd5] bg-[#fbfbf9] text-forest-950 placeholder:text-forest-900/40 focus:outline-none focus:border-sage-500 w-full sm:w-64"
              />
              <button
                type="submit"
                disabled={!keyInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-forest-900 hover:bg-forest-800 disabled:opacity-40 text-white transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                Save Key
              </button>
            </form>
          )}
        </div>
        {keySuccess && (
          <div className="mt-3 text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-xl">
            ✓ Admin API key saved to session storage.
          </div>
        )}
      </div>

      {/* 1. CSV Bulk Catalog Ingestion */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 shadow-xl bg-dark-900/80">
        <h3 className="text-lg font-black text-white flex items-center gap-2 mb-2 tracking-tight">
          <Upload className="w-5 h-5 text-indigo-400" />
          Bulk CSV Catalog Ingestion & Validation
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Upload a standard catalog CSV. Valid rows are atomically upserted and vector-indexed; invalid rows are quarantined with specific line numbers.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-dark-950/40">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload-input"
            />
            <label htmlFor="csv-upload-input" className="cursor-pointer block">
              <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2.5 opacity-80" />
              <span className="text-sm font-semibold text-slate-200 block">
                {file ? file.name : 'Click to select or drag & drop catalog.csv'}
              </span>
              <span className="text-xs text-slate-500 block mt-1 font-mono">
                Headers: id, name, price, ram_gb, storage_gb, processor, gpu, battery_hours...
              </span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating & Indexing...</span>
                </>
              ) : (
                <span>Upload & Ingest Catalog</span>
              )}
            </button>
          </div>
        </form>

        {/* Upload Result Report */}
        {uploadResult && (
          <div className="mt-6 p-4 rounded-2xl border border-white/10 bg-dark-950/80 text-xs space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase">
                Import Status: <span className={uploadResult.status === 'success' ? 'text-emerald-400' : 'text-amber-400'}>{uploadResult.status.toUpperCase()}</span>
              </span>
              <span className="text-slate-400">
                Imported: <strong className="text-white">{uploadResult.imported_count}</strong> | Rejected: <strong className="text-white">{uploadResult.rejected_count}</strong>
              </span>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="mt-3 border border-rose-500/30 rounded-xl overflow-hidden bg-rose-950/20">
                <div className="px-3 py-2 bg-rose-950/50 font-bold text-rose-300">
                  Validation Quarantine Report:
                </div>
                <div className="divide-y divide-rose-500/10 max-h-48 overflow-y-auto">
                  {uploadResult.errors.map((err, idx) => (
                    <div key={idx} className="p-2.5 text-rose-200 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Line {err.row_number} (SKU: {err.sku}):</strong> {err.error}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Manual Re-index & Stock Management */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 shadow-xl bg-dark-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5 mb-5">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
              <Database className="w-5 h-5 text-cyan-400" />
              Live Inventory & Semantic Index Controls
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Toggle stock availability instantly. Out-of-stock laptops are immediately excluded from recommendations.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReindex}
            disabled={reindexing}
            className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin' : ''}`} />
            <span>{reindexing ? 'Re-indexing...' : 'Re-index Vector Engine'}</span>
          </button>
        </div>

        {reindexMessage && (
          <div className="mb-4 p-3 bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 rounded-xl text-xs font-mono">
            {reindexMessage}
          </div>
        )}

        {/* Stock Toggling Table */}
        <div className="border border-white/5 rounded-2xl overflow-x-auto max-h-96 overflow-y-auto bg-dark-950/60">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-dark-950 sticky top-0 border-b border-white/10 font-mono font-bold uppercase text-slate-400">
              <tr>
                <th className="py-2.5 px-4">SKU</th>
                <th className="py-2.5 px-4">Laptop Model</th>
                <th className="py-2.5 px-4">Price</th>
                <th className="py-2.5 px-4">Live Inventory Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="py-2.5 px-4 text-slate-500 text-[11px]">{p.id}</td>
                  <td className="py-2.5 px-4 font-sans font-bold text-slate-200">{p.name}</td>
                  <td className="py-2.5 px-4 font-black text-cyan-400">{p.formatted_price}</td>
                  <td className="py-2.5 px-4 font-sans">
                    <button
                      type="button"
                      onClick={() => handleToggleStock(p.id, p.in_stock)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        p.in_stock
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-500'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-500/40 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-500'
                      }`}
                    >
                      {p.in_stock ? '● In Stock (Disable)' : '○ Out of Stock (Enable)'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
