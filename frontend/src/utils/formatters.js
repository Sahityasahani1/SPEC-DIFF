/**
 * Indian Rupee and Technical Specification Formatters.
 */

export function formatINR(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Math.round(Number(val));
  return '₹' + num.toLocaleString('en-IN');
}

export function formatRAM(gb) {
  return `${gb} GB RAM`;
}

export function formatStorage(gb) {
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(gb % 1024 === 0 ? 0 : 1)} TB SSD`;
  }
  return `${gb} GB SSD`;
}
