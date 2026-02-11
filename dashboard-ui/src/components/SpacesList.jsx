import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SpacesList() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("http://localhost:3274/api/spaces");

      if (!response.ok) {
        throw new Error(`Failed to fetch spaces: ${response.statusText}`);
      }

      const data = await response.json();
      setSpaces(data);
    } catch (err) {
      setError(err.message || "An error occurred while fetching spaces");
      console.error("Error fetching spaces:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "enabled":
        return "default";
      case "inactive":
      case "disabled":
        return "secondary";
      case "error":
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleSpaceClick = (space) => {
    setSelectedSpace(space);
  };

  const handleCloseDetails = () => {
    setSelectedSpace(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading spaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Error Loading Spaces</CardTitle>
            <CardDescription className="text-red-700">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchSpaces} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Spaces</h1>
          <p className="text-slate-600">Manage and view all your available spaces</p>
        </div>

        {/* Spaces Grid */}
        {spaces.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center min-h-64">
              <p className="text-slate-500 text-lg">No spaces available</p>
              <p className="text-slate-400 text-sm mt-2">Create a new space to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((space) => (
              <Card
                key={space.id || space.slug}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => handleSpaceClick(space)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        {space.label || space.slug || space.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {space.description || space.purpose || "No description available"}
                      </CardDescription>
                    </div>
                  </div>
                  {space.status && (
                    <div className="mt-4">
                      <Badge variant={getStatusBadgeVariant(space.status)}>
                        {space.status}
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {space.slug && (
                      <div>
                        <span className="text-slate-500">Slug:</span>
                        <span className="ml-2 text-slate-700 font-mono">{space.slug}</span>
                      </div>
                    )}
                    {space.type && (
                      <div>
                        <span className="text-slate-500">Type:</span>
                        <span className="ml-2 text-slate-700">{space.type}</span>
                      </div>
                    )}
                    {space.owner && (
                      <div>
                        <span className="text-slate-500">Owner:</span>
                        <span className="ml-2 text-slate-700">{space.owner}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal/Expandable View */}
      {selectedSpace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl">
                    {selectedSpace.label || selectedSpace.slug || selectedSpace.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {selectedSpace.description || selectedSpace.purpose || "No description available"}
                  </CardDescription>
                </div>
                <button
                  onClick={handleCloseDetails}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              {selectedSpace.status && (
                <div className="mt-4">
                  <Badge variant={getStatusBadgeVariant(selectedSpace.status)}>
                    {selectedSpace.status}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Space Details */}
              <div className="grid grid-cols-2 gap-4">
                {selectedSpace.id && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">ID</h3>
                    <p className="text-sm text-slate-600 mt-1 font-mono">{selectedSpace.id}</p>
                  </div>
                )}
                {selectedSpace.slug && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Slug</h3>
                    <p className="text-sm text-slate-600 mt-1 font-mono">{selectedSpace.slug}</p>
                  </div>
                )}
                {selectedSpace.type && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Type</h3>
                    <p className="text-sm text-slate-600 mt-1">{selectedSpace.type}</p>
                  </div>
                )}
                {selectedSpace.owner && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Owner</h3>
                    <p className="text-sm text-slate-600 mt-1">{selectedSpace.owner}</p>
                  </div>
                )}
              </div>

              {/* Additional metadata */}
              {selectedSpace.metadata && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Metadata</h3>
                  <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedSpace.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Display all space properties */}
              {Object.keys(selectedSpace).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">All Properties</h3>
                  <div className="bg-slate-50 p-3 rounded text-xs overflow-auto max-h-40">
                    <pre>{JSON.stringify(selectedSpace, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Close button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCloseDetails}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
