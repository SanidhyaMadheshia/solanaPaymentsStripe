import { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import type { ProductPrice } from '../../../lib/types';
import axios from 'axios';
import { useDashboard, type Price } from '../../../context/dashboardContext';

interface ProductPricesProps {
  productId: string;
  onUpdate: () => void;
  productPrices : ProductPrice[]
}

export default function ProductPrices({ productId, onUpdate,productPrices }: ProductPricesProps) {
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPriceDialog, setShowNewPriceDialog] = useState(false);
  const [newPriceLabel, setNewPriceLabel] = useState('');
  const [newPriceAmount, setNewPriceAmount] = useState('');
  const {userData} = useDashboard();

  // simulate loading mock data
  useEffect(() => {
  setLoading(true);

  const timeoutId = setTimeout(() => {
    

    setPrices(productPrices);
    setLoading(false);
  }, 700);

  // ✅ Cleanup to avoid memory leaks if component unmounts
  return () => clearTimeout(timeoutId);
}, [productId]);


  const createPrice = async () => {
  // 🧩 Basic validation
  if (!newPriceLabel.trim() || !newPriceAmount.trim()) return;

  const amount = parseFloat(newPriceAmount);
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
//   model Price {
//   id         String   @id @default(uuid())
//   productId  String
//   product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
//   label      String
//   amount     Decimal  @db.Decimal(20, 8)
//   currency   String   // "SOL" or "USDC"
//   createdAt  DateTime @default(now())
// }
  const {data} : {
        data : {
          id : string ;
          productId : string ;
          label : string;
          amount : number;
          currency : string;
          createdAt : string 
        }
    }= await axios.post(
                    `${import.meta.env.VITE_BACKEND_URL}/user/createPrice`,
                    {
                      productId : productId,
                      priceLabel :  newPriceLabel.trim(),
                      priceAmount : amount 
                    },
                    {
                      headers: {
                          Authorization: localStorage.getItem("jwtToken") || "",
                          "Content-Type" : "application/json"
                      },
                      
                      
                    },
                    
                );
                console.log(data);
                
                

  // 🪙 Create a new ProductPrice object (fully typed)
  const newPrice: ProductPrice = {
    id: data.id,
    product_id: productId,
    user_id: userData?.id!, // ✅ required field for ProductPrice
    label: newPriceLabel.trim(),
    amount,
    currency: 'SOL',
    active: true, // ✅ required field per your ProductPrice type
    created_at: data.createdAt
  };

  // 🧠 Update state
  setPrices((prev) => [newPrice, ...prev]);

  // 🧹 Reset UI states
  setShowNewPriceDialog(false);
  setNewPriceLabel('');
  setNewPriceAmount('');

  // 🔄 Trigger parent update callback if provided
  onUpdate?.();
};


  const deletePrice = (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete "${label}" price?`)) return;
    setPrices((prev) => prev.filter((p) => p.id !== id));
    onUpdate();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-6 h-6 border-2 border-[#9945FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
          Pricing Options
        </h4>
        <button
          onClick={() => setShowNewPriceDialog(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#242424] text-white rounded-lg text-sm transition-colors border border-[#262626]"
        >
          <Plus className="w-3 h-3" />
          Add Price
        </button>
      </div>

      {/* Add Price Dialog */}
      {showNewPriceDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl max-w-md w-full p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Add Price</h3>
                <p className="text-sm text-gray-400">
                  Create a new pricing option for this product
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Label
                </label>
                <input
                  type="text"
                  value={newPriceLabel}
                  onChange={(e) => setNewPriceLabel(e.target.value)}
                  placeholder="e.g., Monthly, Annual, One-time"
                  className="w-full px-4 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#9945FF]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount (SOL)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={newPriceAmount}
                    onChange={(e) => setNewPriceAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#9945FF]"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewPriceDialog(false)}
                  className="flex-1 py-2 bg-[#1a1a1a] hover:bg-[#242424] text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createPrice}
                  disabled={!newPriceLabel.trim() || !newPriceAmount.trim()}
                  className="flex-1 py-2 bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price List */}
      <div className="space-y-2">
        {prices.length === 0 ? (
          <div className="text-center py-8 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
            <p className="text-sm text-gray-500">No prices configured</p>
          </div>
        ) : (
          prices.map((price) => (
            <div
              key={price.id}
              className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] hover:border-[#262626] transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium">{price.label}</span>
                  <span className="px-2 py-0.5 bg-[#14F195]/10 text-[#14F195] text-xs rounded border border-[#14F195]/20">
                    Active
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-white">
                    {price.amount} {price.currency}
                  </span>
                  <span className="text-xs text-gray-500">
                    Created {new Date(price.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => deletePrice(price.id, price.label)}
                className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
