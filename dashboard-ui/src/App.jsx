import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import SpacesList from './components/SpacesList';
import SpaceCard from './components/SpaceCard';

export default function App() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch spaces data
  const fetchSpaces = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/spaces');
      const data = await response.json();

      // Transform API response to match component expectations
      const transformedSpaces = (data.spaces || []).map(space => ({
        ...space,
        id: space.slug, // Use slug as ID
        tasksCount: space.taskCounts?.total || 0,
        docsCount: space.docCount || 0,
      }));

      setSpaces(transformedSpaces);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch spaces on component mount
  useEffect(() => {
    fetchSpaces();
  }, []);

  // Filter spaces by status
  const getSpacesByStatus = (status) => {
    if (status === 'all') return spaces;
    return spaces.filter(space => space.status === status);
  };

  // Format last refresh time
  const formatRefreshTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Get space counts
  const activeCount = spaces.filter(s => s.status === 'active').length;
  const archivedCount = spaces.filter(s => s.status === 'archived').length;
  const pausedCount = spaces.filter(s => s.status === 'paused').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Spaces Dashboard</h1>
              <p className="text-slate-300 text-sm mt-2">
                Last refreshed: {formatRefreshTime(lastRefresh)}
              </p>
            </div>
            <Button
              onClick={fetchSpaces}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              size="lg"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="all" className="flex items-center gap-2">
              All Spaces
              <span className="ml-2 px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded-full font-semibold">
                {spaces.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              Active
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                {activeCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              Archived
              <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-semibold">
                {archivedCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="paused" className="flex items-center gap-2">
              Paused
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">
                {pausedCount}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* All Spaces Tab */}
          <TabsContent value="all">
            <div className="bg-white rounded-lg shadow-md p-6">
              {spaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {spaces.map(space => (
                    <SpaceCard key={space.id} space={space} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No spaces available</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Active Spaces Tab */}
          <TabsContent value="active">
            <div className="bg-white rounded-lg shadow-md p-6">
              {getSpacesByStatus('active').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getSpacesByStatus('active').map(space => (
                    <SpaceCard key={space.id} space={space} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No active spaces</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Archived Spaces Tab */}
          <TabsContent value="archived">
            <div className="bg-white rounded-lg shadow-md p-6">
              {getSpacesByStatus('archived').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getSpacesByStatus('archived').map(space => (
                    <SpaceCard key={space.id} space={space} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No archived spaces</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Paused Spaces Tab */}
          <TabsContent value="paused">
            <div className="bg-white rounded-lg shadow-md p-6">
              {getSpacesByStatus('paused').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getSpacesByStatus('paused').map(space => (
                    <SpaceCard key={space.id} space={space} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No paused spaces</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
