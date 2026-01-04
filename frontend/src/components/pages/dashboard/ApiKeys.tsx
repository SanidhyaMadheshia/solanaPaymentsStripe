import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Check, Eye, EyeOff, Key } from 'lucide-react';
import axios from 'axios';
import { useDashboard , type DashboardContextType} from '../../../context/dashboardContext';

interface ApiKey {
  id: string;
  key_name: string;
  key_prefix: string;
  created_at: string;
}

export default function ApiKeys() {
  const data : DashboardContextType = useDashboard();

  if (data.loading) return <p className="text-gray-400">Loading...</p>;




  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    
  ]);

  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  



useEffect(() => {
  console.log("use Effect is");
  console.log(data);

  if (data.loading) return;
  console.log(data?.userData?.apiKeys);
  if (!data?.userData?.apiKeys) return;


  
  const mapped: ApiKey[] = data.userData.apiKeys.map((k: any) => ({
    id: k.id,
    key_name: k.label ?? k.key_name ?? 'Unnamed key',
    key_prefix:
      (k.preview ??
        (`${k.label.slice(0, 15)}...` ) 
        // k.key_prefix ??
        ).toString(),
    created_at: k.createdAt ?? k.created_at ?? new Date().toISOString(),
  }));

  setApiKeys(mapped);
  console.log("mapped:" , mapped);
}, [data.loading, data.userData]);


  const createApiKey = async () => {
    if (!newKeyName.trim()) return;

    const resData  = await axios.get(
                    `${import.meta.env.VITE_BACKEND_URL}/user/createApiKey`,
                    {
                      headers: {
                          Authorization: localStorage.getItem("jwtToken") || "",
                      },
                      params : {
                        label : `${newKeyName}`
                      }
                    }
                );

    console.log(resData.data);

    const data : {
      ApiKey : string,
      key : {
        label: string | null;
        id: string;
        createdAt: Date;
        userId: string;
        keyHash: string;
        revoked: boolean;
      }
    }= resData.data;



    



    const newKey = {
      id: data.key.id,
      key_name: data.key.label ?? 'Unnamed key',
      key_prefix: data.key.keyHash.slice(0, 15) + '...',
      created_at: data.key.createdAt.toString(),
    };

    setApiKeys((prev) => [newKey, ...prev]);
    setGeneratedKey(data.ApiKey);
    setNewKeyName('');
  };

  const deleteApiKey = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    setApiKeys((prev) => prev.filter((key) => key.id !== id));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
     
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">API Keys</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage your API keys to authenticate requests
          </p>
        </div>
        <button
          onClick={() => setShowNewKeyDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:opacity-90 text-white rounded-lg font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* New Key Dialog */}
      {showNewKeyDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl max-w-md w-full p-6">


            {generatedKey ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">API Key Created</h3>
                  <p className="text-sm text-gray-400">
                    Copy this key now. You won’t be able to see it again.
                  </p>
                </div>

                <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Your API Key</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm text-white font-mono break-all">
                      {generatedKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generatedKey, 'new')}
                      className="p-2 hover:bg-[#1a1a1a] rounded transition-colors"
                    >
                      {copiedId === 'new' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowNewKeyDialog(false);
                    setGeneratedKey('');
                  }}
                  className="w-full py-2 bg-[#1a1a1a] hover:bg-[#242424] text-white rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Create API Key</h3>
                  <p className="text-sm text-gray-400">
                    Give your API key a name to help identify it.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API Key"
                    className="w-full px-4 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#9945FF]"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowNewKeyDialog(false);
                      setNewKeyName('');
                    }}
                    className="flex-1 py-2 bg-[#1a1a1a] hover:bg-[#242424] text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createApiKey}
                    disabled={!newKeyName.trim()}
                    className="flex-1 py-2 bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl overflow-hidden">
        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-[#141414] rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-1">No API keys yet</p>
            <p className="text-sm text-gray-500">
              Create your first API key to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {apiKeys.map((key) => {
              const isRevealed = revealedKeys.has(key.id);
              return (
                <div key={key.id} className="p-4 hover:bg-[#101010] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-medium">{key.key_name}</h3>
                        <span className="px-2 py-1 bg-[#14F195]/10 text-[#14F195] text-xs rounded-full border border-[#14F195]/20">
                          Active
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm text-gray-400 font-mono">
                          {isRevealed
                            ? key.key_prefix.replace('...', '••••••••••••••••••••')
                            : key.key_prefix}
                        </code>
                        <button
                          onClick={() => toggleReveal(key.id)}
                          className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
                        >
                          {isRevealed ? (
                            <EyeOff className="w-3 h-3 text-gray-400" />
                          ) : (
                            <Eye className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(key.key_prefix, key.id)}
                          className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
                        >
                          {copiedId === key.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Created{' '}
                        {new Date(key.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteApiKey(key.id, key.key_name)}
                      className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
