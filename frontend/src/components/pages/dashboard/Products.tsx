import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Currency } from 'lucide-react';
import type { Product, ProductPrice } from '../../../lib/types';
import ProductPrices from './ProductsPrice';
import axios from 'axios';
import { useDashboard, type DashboardContextType , type Product as ProductType, type Price as PriceType} from '../../../context/dashboardContext';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [productPrices, setProductPrices] = useState<Record<string, ProductPrice[]>>({});
  const data : DashboardContextType = useDashboard();
  // Mock data load
  useEffect(() => {
    console.log("use Effect is");
    console.log(data);  

    if (data.loading) return;
    console.log(data?.userData?.products);
    if (!data?.userData?.apiKeys) return;
//     export type Price = {
//   id: string;
//   product_id: string;
//   amount: number;
//   currency: string;
//   interval: 'month' | 'year';
// };
// export interface ProductPrice {
//   id: string;
//   product_id: string;
//   user_id: string;
//   label: string;
//   amount: number;
//   currency: string;
//   active: boolean;
//   created_at: string;
// }
    const mappedProducts: Product[] = data.userData.products.map((p : ProductType )=> {
      return {

        id: p.id,
        name: p.name,
        description: p.description ? p.description : "",
        created_at: p.createdAt.toString(),
        prices: p.prices.map((price : PriceType) : ProductPrice=> {
            return {
              id : price.id,
              product_id : p.id,
              amount : parseFloat(price.amount),
              currency : price.currency,
              user_id : data.userData?.id!,
              label : price.label,
              active : true,
              created_at : price.createdAt.toString()
            }
        })

      }
    });

    const mappedPrices: Record<string, ProductPrice[]> = mappedProducts.reduce(
      (acc, product) => {
        acc[product.id] = product.prices ? product.prices : [];
        return acc;
      },
      {} as Record<string, ProductPrice[]>
    );

    setProducts(mappedProducts);
    setProductPrices(mappedPrices);
    setLoading(false);
  }, [data.loading, data.userData]);

  const createProduct = async  () => {
    if (!newProductName.trim()) return;
    const {data} : {
        data : {
            name: string;
            id: string;
            createdAt: Date;
            userId: string;
            description: string | null;
            image: string | null;
        }
    }= await axios.post(
                    `${import.meta.env.VITE_BACKEND_URL}/user/createProduct`,
                    {
                      productName : newProductName,
                      productDescription : newProductDescription
                    },
                    {
                      headers: {
                          Authorization: localStorage.getItem("jwtToken") || "",
                          "Content-Type" : "application/json"
                      },
                      
                      
                    },
                    
                );
    console.log("new Product data :", data);


    const newProduct = {
      id: data.id,
      name: data.name,
      description: data.description ?data.description  : "no description",
      created_at: data.createdAt.toISOString(),
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
                    <ProductPrices productId={product.id} productPrices={productPrices[product.id]} onUpdate={() => {}} />
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
