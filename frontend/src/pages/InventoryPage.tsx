import { useEffect, useState } from 'react';
import { Plus, Link2, Package } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/utils';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [catalogLink, setCatalogLink] = useState('');
  const [form, setForm] = useState({ name: '', price: 0, stockQty: 0, imageUrl: '' });

  useEffect(() => {
    api.getProducts().then(setProducts).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createProduct(form);
    setShowCreate(false);
    setForm({ name: '', price: 0, stockQty: 0, imageUrl: '' });
    api.getProducts().then(setProducts);
  };

  const handleShare = async () => {
    const result = await api.generateCatalog();
    setCatalogLink(`${window.location.origin}/catalog/${result.shareToken}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 mt-1">{products.length} products</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleShare} className="btn-secondary flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Share Catalog
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {catalogLink && (
        <div className="card bg-brand-50 border-brand-200">
          <p className="text-sm font-medium text-brand-800">Shareable Catalog Link:</p>
          <div className="flex items-center gap-2 mt-2">
            <input type="text" value={catalogLink} readOnly className="input bg-white flex-1" />
            <button
              onClick={() => navigator.clipboard.writeText(catalogLink)}
              className="btn-primary text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Add Product</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Product Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Price (₦)</label>
                <input
                  type="number"
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="input"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Stock Quantity</label>
              <input
                type="number"
                value={form.stockQty}
                onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Add Product</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No products yet</p>
          <p className="text-sm mt-1">Add your first product to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product: any) => (
            <div key={product.id} className="card hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Package className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <h3 className="font-semibold text-gray-900">{product.name}</h3>
              <p className="text-lg font-bold text-brand-600 mt-1">{formatCurrency(product.price)}</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-sm ${product.stockQty > 0 ? 'text-gray-500' : 'text-expense'}`}>
                  {product.stockQty > 0 ? `${product.stockQty} in stock` : 'Out of stock'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
