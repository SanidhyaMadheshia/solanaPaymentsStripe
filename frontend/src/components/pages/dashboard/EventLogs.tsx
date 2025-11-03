import { useState, useEffect } from 'react';
import { Activity, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface EventLog {
  id: string;
  event_type: string;
  resource_type: string;
  resource_id?: string;
  description: string;
  created_at: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  'api_key.created': 'text-green-400 bg-green-400/10 border-green-400/20',
  'api_key.deleted': 'text-red-400 bg-red-400/10 border-red-400/20',
  'product.created': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'product.deleted': 'text-red-400 bg-red-400/10 border-red-400/20',
  'product.updated': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'price.created': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'price.deleted': 'text-red-400 bg-red-400/10 border-red-400/20',
  'payment.completed': 'text-green-400 bg-green-400/10 border-green-400/20',
  'payment.failed': 'text-red-400 bg-red-400/10 border-red-400/20',
};

const EVENTS_PER_PAGE = 5;

export default function EventLogs() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventLog[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // 💾 Dummy mock data
  const MOCK_EVENTS: EventLog[] = [
    {
      id: '1',
      event_type: 'api_key.created',
      resource_type: 'api_key',
      description: 'New API key created',
      created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
    {
      id: '2',
      event_type: 'product.created',
      resource_type: 'product',
      description: 'New product "Solana Hoodie" added',
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: '3',
      event_type: 'price.created',
      resource_type: 'product_price',
      description: 'Added Monthly Plan — 0.5 SOL',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: '4',
      event_type: 'payment.completed',
      resource_type: 'payment',
      description: 'Payment of 0.5 SOL completed',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    },
    {
      id: '5',
      event_type: 'api_key.deleted',
      resource_type: 'api_key',
      description: 'Old API key deleted',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ];

  // Simulate data loading
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setEvents(MOCK_EVENTS);
      setFilteredEvents(MOCK_EVENTS);
      setLoading(false);
    }, 600); // fake network delay
  }, []);

  useEffect(() => {
    if (filterType === 'all') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter((e) => e.resource_type === filterType));
    }
    setCurrentPage(1);
  }, [filterType, events]);

  const eventTypes = Array.from(new Set(events.map((e) => e.resource_type)));
  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
  const endIndex = startIndex + EVENTS_PER_PAGE;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  const getEventTypeColor = (eventType: string) =>
    EVENT_TYPE_COLORS[eventType] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';

  const formatEventType = (eventType: string) =>
    eventType
      .split('.')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
          <h2 className="text-2xl font-semibold text-white">Event Logs</h2>
          <p className="text-sm text-gray-400 mt-1">
            Track all activity in your account
          </p>
        </div>
        <button
          onClick={() => setShowFilterDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#242424] text-white rounded-lg transition-colors border border-[#262626]"
        >
          <Filter className="w-4 h-4" />
          Filter
          {filterType !== 'all' && (
            <span className="px-2 py-0.5 bg-[#9945FF]/20 text-[#9945FF] text-xs rounded border border-[#9945FF]/30">
              Active
            </span>
          )}
        </button>
      </div>

      {/* Filter Dialog */}
      {showFilterDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl max-w-md w-full p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Filter Events</h3>
                <p className="text-sm text-gray-400">Show events by resource type</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setFilterType('all');
                    setShowFilterDialog(false);
                  }}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                    filterType === 'all'
                      ? 'bg-[#9945FF]/20 text-white border border-[#9945FF]/30'
                      : 'bg-[#141414] text-gray-300 hover:bg-[#1a1a1a] border border-[#262626]'
                  }`}
                >
                  All Events
                </button>

                {eventTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setFilterType(type);
                      setShowFilterDialog(false);
                    }}
                    className={`w-full px-4 py-3 rounded-lg text-left transition-colors capitalize ${
                      filterType === type
                        ? 'bg-[#9945FF]/20 text-white border border-[#9945FF]/30'
                        : 'bg-[#141414] text-gray-300 hover:bg-[#1a1a1a] border border-[#262626]'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowFilterDialog(false)}
                className="w-full py-2 bg-[#1a1a1a] hover:bg-[#242424] text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event List */}
      <div className="bg-[#0c0c0c] border border-[#262626] rounded-xl overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-[#141414] rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-1">No events yet</p>
            <p className="text-sm text-gray-500">
              Activity will appear here as you use the platform
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#262626]">
              {paginatedEvents.map((event) => (
                <div key={event.id} className="p-4 hover:bg-[#101010] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Activity className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-white font-medium mb-1">{event.description}</p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 text-xs rounded border ${getEventTypeColor(
                                event.event_type
                              )}`}
                            >
                              {formatEventType(event.event_type)}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">
                              {event.resource_type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTimeAgo(event.created_at)}
                        </span>
                      </div>
                      {event.resource_id && (
                        <p className="text-xs text-gray-500 font-mono">
                          ID: {event.resource_id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-[#262626] p-4 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredEvents.length)} of{' '}
                  {filteredEvents.length} events
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-[#1a1a1a] text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-[#1a1a1a] text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
