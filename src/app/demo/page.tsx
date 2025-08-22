"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Zap, CheckCircle, AlertCircle, Download } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  startTime?: string;
  location?: string;
  category?: string;
  calendarSource: string;
  venue?: string;
  organizerName?: string;
  price?: string;
}

interface CalendarSource {
  id: string;
  displayName: string;
  description: string;
  isActive: boolean;
  totalEvents: number;
}

interface ImportProgress {
  currentSource?: string;
  processed: number;
  total: number;
  status: string;
  errors: string[];
  warnings: string[];
}

// Sample data for demonstration
const sampleSources: CalendarSource[] = [
  {
    id: "wayland-town",
    displayName: "Town of Wayland",
    description: "Official Town of Wayland calendar with municipal meetings and events",
    isActive: true,
    totalEvents: 15
  },
  {
    id: "tcan-events",
    displayName: "TCAN Events",
    description: "The Center for Arts in Natick - concerts, performances, and cultural events",
    isActive: true,
    totalEvents: 24
  },
  {
    id: "wayland-library",
    displayName: "Wayland Library",
    description: "Wayland Free Public Library programs and events",
    isActive: true,
    totalEvents: 12
  },
  {
    id: "wayland-high-athletics",
    displayName: "Wayland High Athletics",
    description: "Wayland High School sports and athletics calendar",
    isActive: true,
    totalEvents: 18
  },
  {
    id: "arts-wayland",
    displayName: "Arts Wayland",
    description: "Arts exhibitions, workshops, and cultural programming",
    isActive: true,
    totalEvents: 9
  }
];

const sampleEvents: Event[] = [
  {
    id: 1,
    title: "Board of Selectmen Meeting",
    description: "Monthly town meeting for municipal business",
    startDate: "2025-08-05",
    startTime: "19:00",
    location: "Wayland Town Building",
    category: "government",
    calendarSource: "wayland-town",
    venue: "Wayland Town Building",
    organizerName: "Town of Wayland"
  },
  {
    id: 2,
    title: "Marc Cohn Live Performance",
    description: "Grammy-winning singer-songwriter Marc Cohn performs live",
    startDate: "2025-08-08",
    startTime: "20:00",
    location: "TCAN Mainstage",
    category: "performance",
    calendarSource: "tcan-events",
    venue: "The Center for Arts in Natick",
    organizerName: "TCAN",
    price: "$45"
  },
  {
    id: 3,
    title: "Children's Story Time",
    description: "Weekly story time for children ages 3-6",
    startDate: "2025-08-07",
    startTime: "10:30",
    location: "Wayland Free Public Library - Children's Room",
    category: "children",
    calendarSource: "wayland-library",
    venue: "Wayland Free Public Library",
    organizerName: "Wayland Free Public Library"
  },
  {
    id: 4,
    title: "Varsity Soccer vs. Newton",
    description: "Home soccer game against Newton High School",
    startDate: "2025-08-12",
    startTime: "16:00",
    location: "Wayland High School Athletic Fields",
    category: "soccer",
    calendarSource: "wayland-high-athletics",
    venue: "Wayland High School",
    organizerName: "Wayland High School Athletics"
  },
  {
    id: 5,
    title: "Summer Art Exhibition Opening",
    description: "Opening reception for new contemporary art exhibition",
    startDate: "2025-08-15",
    startTime: "18:00",
    location: "Arts Wayland Gallery",
    category: "arts",
    calendarSource: "arts-wayland",
    venue: "Arts Wayland Gallery",
    organizerName: "Arts Wayland"
  }
];

export default function DemoPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set all sources as selected by default
    setSelectedSources(sampleSources.filter(s => s.isActive).map(s => s.id));
  }, []);

  const handleMultiSourceImport = async () => {
    if (selectedSources.length === 0) {
      toast({
        title: "No Sources Selected",
        description: "Please select at least one calendar source to import from.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setEvents([]); // Clear existing events

    // Simulate the multi-source import process
    const totalSteps = selectedSources.length;
    let processed = 0;

    for (const sourceId of selectedSources) {
      const source = sampleSources.find(s => s.id === sourceId);
      if (!source) continue;

      // Update progress
      setImportProgress({
        currentSource: source.displayName,
        processed,
        total: totalSteps,
        status: `Scraping ${source.displayName}...`,
        errors: [],
        warnings: []
      });

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Add events from this source
      const sourceEvents = sampleEvents.filter(e => e.calendarSource === sourceId);
      setEvents(prev => [...prev, ...sourceEvents]);

      processed++;

      // Update progress
      setImportProgress({
        currentSource: source.displayName,
        processed,
        total: totalSteps,
        status: `Imported ${sourceEvents.length} events from ${source.displayName}`,
        errors: [],
        warnings: sourceId === "wayland-town" ? ["Some town events may be behind authentication"] : []
      });

      // Small delay before next source
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Final completion
    setImportProgress({
      processed: totalSteps,
      total: totalSteps,
      status: `Completed! Imported ${events.length + sampleEvents.filter(e => selectedSources.includes(e.calendarSource)).length} events from ${selectedSources.length} sources.`,
      errors: [],
      warnings: []
    });

    setLoading(false);

    // Clear progress after a moment
    setTimeout(() => {
      setImportProgress(null);
    }, 3000);

    toast({
      title: "Import Completed!",
      description: `Successfully imported events from ${selectedSources.length} sources.`,
    });
  };

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const selectAllSources = () => {
    setSelectedSources(sampleSources.filter(s => s.isActive).map(s => s.id));
  };

  const clearSourceSelection = () => {
    setSelectedSources([]);
  };

  const handleExport = (format: "csv" | "ical") => {
    // Simulate export functionality
    toast({
      title: "Export Started",
      description: `Exporting ${events.length} events as ${format.toUpperCase()}`,
    });

    // Simulate download
    setTimeout(() => {
      toast({
        title: "Export Completed",
        description: `Events exported successfully as ${format.toUpperCase()}`,
      });
    }, 1500);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🚀 Multi-Source Calendar Import Demo
        </h1>
        <p className="text-gray-600">
          Live demonstration of importing events from multiple Wayland area calendars
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-sm">
            <strong>📋 Demo Mode:</strong> This page demonstrates the multi-source import functionality
            with simulated data and real-time progress tracking. All features shown here work
            identically in the full production environment.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imported Events</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Sources</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sampleSources.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Sources</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedSources.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Source Import */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Multi-Source Calendar Import
          </CardTitle>
          <CardDescription>
            Select multiple calendar sources to import events simultaneously
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Source Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Select Calendar Sources</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllSources}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSourceSelection}>
                  Clear All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sampleSources.map((source) => (
                <div
                  key={source.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedSources.includes(source.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => toggleSourceSelection(source.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedSources.includes(source.id)}
                      />
                      <div>
                        <h4 className="font-medium">{source.displayName}</h4>
                        <p className="text-sm text-gray-600 mt-1">{source.description}</p>

                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>📊 {source.totalEvents} events</span>
                        </div>
                      </div>
                    </div>

                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Import Progress */}
          {importProgress && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="font-medium">Import in Progress</span>
              </div>

              <Progress
                value={(importProgress.processed / importProgress.total) * 100}
                className="mb-2"
              />

              <div className="text-sm space-y-1">
                <p><strong>Status:</strong> {importProgress.status}</p>
                {importProgress.currentSource && (
                  <p><strong>Current Source:</strong> {importProgress.currentSource}</p>
                )}
                <p><strong>Progress:</strong> {importProgress.processed} / {importProgress.total}</p>

                {importProgress.warnings.length > 0 && (
                  <div className="mt-3">
                    <p className="text-amber-600 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Warnings:
                    </p>
                    <ul className="text-amber-600 text-xs">
                      {importProgress.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleMultiSourceImport}
              disabled={loading || selectedSources.length === 0}
              size="lg"
              className="px-8"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Import from {selectedSources.length} Source{selectedSources.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Imported Events ({events.length})</CardTitle>
              <CardDescription>
                Events successfully imported from selected calendar sources
              </CardDescription>
            </div>
            {events.length > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport("csv")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport("ical")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  iCal
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    {event.description && (
                      <p className="text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                      <span>📅 {format(new Date(event.startDate), "MMM d, yyyy")}</span>
                      {event.startTime && (
                        <span>🕐 {event.startTime}</span>
                      )}
                      {event.location && <span>📍 {event.location}</span>}
                      {event.venue && event.venue !== event.location && <span>🏢 {event.venue}</span>}
                      {event.price && <span>💰 {event.price}</span>}
                      {event.organizerName && <span>👤 {event.organizerName}</span>}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {event.category && (
                        <Badge variant="secondary">{event.category}</Badge>
                      )}
                      <Badge variant="default" className="capitalize">
                        {sampleSources.find(s => s.id === event.calendarSource)?.displayName || event.calendarSource}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {events.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Events Imported Yet</h3>
                <p>Select calendar sources above and click "Import" to see events appear here.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
