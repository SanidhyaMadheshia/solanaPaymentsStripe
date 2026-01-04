import { useEffect, useState } from 'react';
import { Key, Package, Zap } from 'lucide-react';
import ApiKeys from './ApiKeys';
import Products from './Products';
import EventLogs from './EventLogs';
import { useAuth } from '@clerk/clerk-react';
import { useDashboard } from '../../../context/dashboardContext';

type TabType = 'Configure' | 'products' | 'events';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('Configure');
  const { isLoaded, isSignedIn } = useAuth();
  const { userData, loading } = useDashboard();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      window.location.href = "/signup";
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!loading && userData) {
      console.log("Dashboard data:", userData);
    }
  }, [loading, userData]);

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'Configure' as TabType, label: 'Configure', icon: Key },
    { id: 'products' as TabType, label: 'Products', icon: Package },
    // { id: 'events' as TabType, label: 'Event Logs', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <div className="border-b border-[#262626] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#00FFA3] rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Solana Pay</h1>
                <p className="text-xs text-gray-400">Developer Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-[#262626] mb-8">
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
                    isActive ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#9945FF] via-[#14F195] to-[#00FFA3]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'Configure' && <ApiKeys />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'events' && <EventLogs />}
        </div>
      </div>
    </div>
  );
}
