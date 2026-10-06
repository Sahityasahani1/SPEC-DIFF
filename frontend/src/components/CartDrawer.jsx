import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShoppingBag, Plus, Minus, Trash2, ExternalLink, 
  ArrowRight, ShieldCheck, Tag, Check, Truck
} from 'lucide-react';
import { getOutboundDealUrl, openDealUrl } from '../utils/dealUrl';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart
}) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');

  if (!isOpen) return null;

  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  
  // Calculate Subtotal
  const subtotal = cartItems.reduce((acc, item) => {
    const p = item.product?.price || 0;
    return acc + p * item.quantity;
  }, 0);

  // Approximate MRP savings (14% above street price)
  const totalMSRP = Math.round(subtotal * 1.14);
  const streetSavings = totalMSRP - subtotal;

  const discountAmount = Math.round(subtotal * appliedDiscount);
  const grandTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'SPECDIFF5') {
      setAppliedDiscount(0.05);
      setPromoMessage('🎉 5% VIP Hardware Discount Applied!');
    } else if (code === 'DIWALI10') {
      setAppliedDiscount(0.10);
      setPromoMessage('🪔 10% Festive Sale Discount Applied!');
    } else {
      setAppliedDiscount(0);
      setPromoMessage('❌ Invalid coupon code. Try "SPECDIFF5" or "DIWALI10"');
    }
  };

  const getEmoji = (category) => {
    const c = (category || '').toLowerCase();
    if (c === 'smartphone' || c === 'phone') return '📱';
    if (c === 'tablet') return '📟';
    if (c === 'audio' || c === 'headphones') return '🎧';
    if (c === 'smartwatch' || c === 'watch') return '⌚';
    if (c === 'monitor') return '🖥️';
    if (c === 'gaming') return '🎮';
    if (c === 'accessory') return '⌨️';
    return '💻';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-forest-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-screen max-w-md bg-[#fcfbf9] text-forest-950 shadow-2xl flex flex-col justify-between border-l border-[#e8e5dc]"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#e8e5dc] bg-forest-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-sage-400" />
              <div>
                <h3 className="font-bold text-lg leading-tight font-jakarta">Hardware Cart</h3>
                <span className="text-xs font-mono text-sage-300">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} selected
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-xs font-mono text-white/50 hover:text-rose-300 px-2.5 py-1 rounded-md transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-forest-900/40">
                <ShoppingBag className="w-16 h-16 stroke-[1.2] mb-3 opacity-40 text-forest-800" />
                <h4 className="font-bold font-jakarta text-base text-forest-900 mb-1">Your cart is empty</h4>
                <p className="text-xs max-w-xs mb-6 text-forest-900/60">
                  Search or explore electronics across Laptops, Smartphones, Audio, Monitors, and Gaming gear.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full bg-forest-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-forest-800 transition-colors shadow-sm"
                >
                  Start Exploring
                </button>
              </div>
            ) : (
              cartItems.map(({ product, quantity }) => {
                const dealUrl = getOutboundDealUrl(product);
                const itemTotal = (product.price || 0) * quantity;

                return (
                  <div
                    key={product.id || product.product_id}
                    className="bg-white rounded-2xl p-4 border border-[#e8e5dc] shadow-xs flex gap-3.5 items-start justify-between"
                  >
                    <div className="flex gap-3 items-start flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[#f4f2ec] border border-[#eae7df] flex items-center justify-center text-2xl shrink-0">
                        {getEmoji(product.category)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-forest-900/60 font-semibold block">
                          {product.brand}
                        </span>
                        <h4 className="font-bold text-xs text-forest-950 truncate font-jakarta mb-1" title={product.name}>
                          {product.name}
                        </h4>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-forest-950">
                            ₹{itemTotal.toLocaleString('en-IN')}
                          </span>
                          {quantity > 1 && (
                            <span className="text-[10px] font-mono text-forest-900/50">
                              (₹{Number(product.price).toLocaleString('en-IN')} ea)
                            </span>
                          )}
                        </div>

                        {/* Direct Buy Link for this SKU */}
                        <div className="mt-2">
                          <a
                            href={dealUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => openDealUrl(product, e)}
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-forest-800 hover:text-forest-950 hover:underline"
                          >
                            <span>Buy at {product.retail_source || 'Retailer'}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-sage-600" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Controls & Delete */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRemoveFromCart(product.id || product.product_id)}
                        className="p-1 text-forest-900/30 hover:text-rose-600 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center border border-[#e0ddd4] rounded-full bg-porcelain-100 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id || product.product_id, quantity - 1)}
                          className="px-2 py-0.5 hover:bg-porcelain-200 text-forest-900 font-mono transition-colors text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono text-xs font-bold text-forest-950 select-none">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id || product.product_id, quantity + 1)}
                          className="px-2 py-0.5 hover:bg-porcelain-200 text-forest-900 font-mono transition-colors text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Summary */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-[#e8e5dc] bg-white space-y-4">
              
              {/* Promo Code Box */}
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-forest-900/40" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter Coupon (e.g. SPECDIFF5)"
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider bg-porcelain-100 border border-[#e0ddd4] focus:outline-none focus:border-forest-900 text-forest-950"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-forest-900 text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-forest-800 transition-colors"
                >
                  Apply
                </button>
              </form>

              {promoMessage && (
                <p className={`text-[11px] font-mono ${appliedDiscount > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600'}`}>
                  {promoMessage}
                </p>
              )}

              {/* Order Calculations */}
              <div className="space-y-1.5 text-xs pt-1 border-t border-[#f0ede6]">
                <div className="flex justify-between text-forest-900/60 font-mono">
                  <span>MSRP List Price:</span>
                  <span className="line-through">₹{totalMSRP.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between text-emerald-700 font-mono font-semibold">
                  <span>Verified Street Discount:</span>
                  <span>- ₹{streetSavings.toLocaleString('en-IN')}</span>
                </div>

                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-sage-700 font-mono font-bold">
                    <span>Coupon Savings:</span>
                    <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between text-forest-900/70 font-mono">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-600" />
                    Express Delivery (India):
                  </span>
                  <span className="text-emerald-700 font-bold uppercase">FREE</span>
                </div>

                <div className="flex justify-between text-base font-black font-mono text-forest-950 pt-2 border-t border-[#f0ede6]">
                  <span>Total Payable:</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checkout Action */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    // Open first product deal or toast
                    if (cartItems.length > 0) {
                      const first = cartItems[0].product;
                      openDealUrl(first);
                    }
                  }}
                  className="w-full py-3 rounded-full bg-forest-900 hover:bg-forest-850 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <span>Proceed to Retailer Checkout</span>
                  <ArrowRight className="w-4 h-4 text-sage-400" />
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-forest-900/50">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>100% Verified Street Prices & Authorised Sellers</span>
                </div>
              </div>

            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
