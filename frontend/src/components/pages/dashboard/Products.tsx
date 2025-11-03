import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Product, ProductPrice } from '../../../lib/types';
import ProductPrices from './ProductsPrice';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [productPrices, setProductPrices] = useState<Record<string, ProductPrice[]>>({});

  // Mock data load
  useEffect(() => {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Premium Subscription',
        description: 'Unlock all premium features.',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Starter Pack',
        description: 'Basic plan for new users.',
        created_at: new Date().toISOString(),
      },
    ];

    const mockPrices: Record<string, ProductPrice[]> = {
      '1': [
        {
          id: 'p1',
          product_id: '1',
          user_id: 'demo-user',
          label: 'Monthly Plan',
          amount: 1999,
          currency: 'USD',
          active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'p2',
          product_id: '1',
          user_id: 'demo-user',
          label: 'Yearly Plan',
          amount: 9999,
          currency: 'USD',
          active: true,
          created_at: new Date().toISOString(),
        },
      ],
      '2': [
        {
          id: 'p3',
          product_id: '2',
          user_id: 'demo-user',
          label: 'Starter Monthly',
          amount: 999,
          currency: 'USD',
          active: true,
          created_at: new Date().toISOString(),
        },
      ],
    };

    setProducts(mockProducts);
    setProductPrices(mockPrices);
    setLoading(false);
  }, []);

  const createProduct = () => {
    if (!newProductName.trim()) return;

    const newProduct = {
      id: crypto.randomUUID(),
      name: newProductName,
      description: newProductDescription,
      created_at: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);
    setNewProductName('');
    setNewProductDescription('');
    setShowNewProductDialog(false);
  };

  const deleteProduct = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleProduct = (productId: string) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      newSet.has(productId) ? newSet.delete(productId) : newSet.add(productId);
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#9945FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Products</h2>
          <p className="text-sm text-gray-400 mt-1">Manage your products and pricing</p>
        </div>
        <button
          onClick={() => setShowNewProductDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:opacity-90 text-white rounded-lg font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Product
        </button>
      </div>

      {/* Create Product Dialog */}
      {showNewProductDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl max-w-md w-full p-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-2">Create Product</h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g., Premium Subscription"
                  className="w-full px-4 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#9945FF]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newProductDescription}
                  onChange={(e) => setNewProductDescription(e.target.value)}
                  placeholder="Describe your product..."
                  rows={3}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#9945FF] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewProductDialog(false)}
                  className="flex-1 py-2 bg-[#1a1a1a] hover:bg-[#242424] text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createProduct}
                  disabled={!newProductName.trim()}
                  className="flex-1 py-2 bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl text-center py-12">
            <div className="w-12 h-12 bg-[#141414] rounded-full flex items-center justify-center mx-auto mb-4">
              <Edit2 className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-1">No products yet</p>
            <p className="text-sm text-gray-500">Create your first product to get started</p>
          </div>
        ) : (
          products.map((product) => {
            const isExpanded = expandedProducts.has(product.id);
            const prices = productPrices[product.id] || [];

            return (
              <div key={product.id} className="bg-[#0c0c0c] border border-[#262626] rounded-xl overflow-hidden">
                <div className="p-4 hover:bg-[#101010] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-medium text-lg">{product.name}</h3>
                        <span className="px-2 py-1 bg-[#14F195]/10 text-[#14F195] text-xs rounded-full border border-[#14F195]/20">
                          Active
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-gray-400 mb-2">{product.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Created {new Date(product.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span>{prices.length} {prices.length === 1 ? 'price' : 'prices'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleProduct(product.id)}
                        className="p-2 hover:bg-[#1a1a1a] text-gray-400 hover:text-white rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id, product.name)}
                        className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#262626] bg-[#080808] p-4">
                    <ProductPrices productId={product.id} onUpdate={() => {}} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
