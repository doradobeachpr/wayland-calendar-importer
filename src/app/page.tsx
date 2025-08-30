"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { CalendarDays, Download, Zap, CheckCircle, AlertCircle, RefreshCw, Calendar } from "lucide-react";
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

interface Event {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  isAllDay: boolean;
  location?: string;
  category?: string;
  department?: string;
  calendarSource: string;
  venue?: string;
  organizerName?: string;
  organizerEmail?: string;
  organizerPhone?: string;
  price?: string;
  tags?: string;
  url?: string; // Original event URL
  importedAt: string;
  updatedAt: string;
}

interface CalendarSource {
  id: string;
  name: string;
  displayName: string;
  description: string;
  isActive: boolean;
  totalEvents?: number;
}

interface ImportProgress {
  currentSource?: string;
  processed: number;
  total: number;
  status: string;
  errors: string[];
  warnings: string[];
}

interface Stats {
  totalEvents: number;
  categories: { name: string; count: number }[];
  departments: { name: string; count: number }[];
  sources: { name: string; count: number }[];
  lastImport: string | null;
}

// Fallback data for when API routes are unavailable
const FALLBACK_SOURCES: CalendarSource[] = [
  {
    id: "wayland-town",
    name: "wayland-town",
    displayName: "Town of Wayland",
    description: "Official Town of Wayland calendar with municipal meetings and events",
    isActive: true,
    totalEvents: 8
  },
  {
    id: "tcan-events",
    name: "tcan-events",
    displayName: "TCAN Events",
    description: "The Center for Arts in Natick - concerts, performances, and cultural events",
    isActive: true,
    totalEvents: 12
  },
  {
    id: "wayland-library",
    name: "wayland-library",
    displayName: "Wayland Library",
    description: "Wayland Free Public Library programs and events",
    isActive: true,
    totalEvents: 6
  },
  {
    id: "wayland-high-athletics",
    name: "wayland-high-athletics",
    displayName: "Wayland High Athletics",
    description: "Wayland High School sports and athletics calendar",
    isActive: true,
    totalEvents: 15
  },
  {
    id: "arts-wayland",
    name: "arts-wayland",
    displayName: "Arts Wayland",
    description: "Arts exhibitions, workshops, and cultural programming",
    isActive: true,
    totalEvents: 7
  },
  {
    id: "wayland-wcpa",
    name: "wayland-wcpa",
    displayName: "Wayland WCPA",
    description: "Wayland Children and Parents Association family events",
    isActive: true,
    totalEvents: 5
  },
  {
    id: "town-planner",
    name: "town-planner",
    displayName: "Town Planner",
    description: "Comprehensive local event listings for Wayland area",
    isActive: true,
    totalEvents: 4
  },
  {
    id: "wayland-high-school",
    name: "wayland-high-school",
    displayName: "Wayland High School",
    description: "Wayland High School academic and athletic events",
    isActive: true,
    totalEvents: 3
  },
  {
    id: "wayland-middle-athletics",
    name: "wayland-middle-athletics",
    displayName: "Wayland Middle Athletics",
    description: "Wayland Middle School sports and athletics calendar",
    isActive: true,
    totalEvents: 4
  },
  {
    id: "patch-community",
    name: "patch-community",
    displayName: "Patch Community",
    description: "Community events and local happenings from Patch",
    isActive: true,
    totalEvents: 3
  }
];

const FALLBACK_EVENTS: Event[] = [
  {
    id: 1,
    title: "Board of Selectmen Meeting",
    description: "Regular meeting of the Board of Selectmen",
    startDate: "2025-08-05T19:00:00.000Z",
    startTime: "19:00",
    isAllDay: false,
    location: "Wayland Town Building - Selectmen's Room",
    category: "meeting",
    department: "selectmen",
    calendarSource: "wayland-town",
    venue: "Wayland Town Building",
    organizerName: "Town of Wayland",
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z"
  },
  {
    id: 2,
    title: "Marc Cohn Live Performance",
    description: "Grammy-winning singer-songwriter Marc Cohn performs his greatest hits",
    startDate: "2025-08-08T20:00:00.000Z",
    startTime: "20:00",
    isAllDay: false,
    location: "TCAN Mainstage",
    category: "performance",
    department: "arts",
    calendarSource: "tcan-events",
    venue: "The Center for Arts in Natick",
    organizerName: "TCAN",
    organizerEmail: "info@natickarts.org",
    organizerPhone: "(508) 647-0097",
    price: "$45",
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z"
  },
  {
    id: 3,
    title: "Children's Story Time",
    description: "Weekly story time for children ages 3-6",
    startDate: "2025-08-07T10:30:00.000Z",
    startTime: "10:30",
    isAllDay: false,
    location: "Wayland Free Public Library - Children's Room",
    category: "children",
    department: "library",
    calendarSource: "wayland-library",
    venue: "Wayland Free Public Library",
    organizerName: "Wayland Free Public Library",
    organizerEmail: "info@waylandlibrary.org",
    organizerPhone: "(508) 358-2311",
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z"
  },
  {
    id: 4,
    title: "Varsity Soccer vs. Newton",
    description: "Home soccer game against Newton High School",
    startDate: "2025-08-12T16:00:00.000Z",
    startTime: "16:00",
    isAllDay: false,
    location: "Wayland High School Athletic Fields",
    category: "soccer",
    department: "athletics",
    calendarSource: "wayland-high-athletics",
    venue: "Wayland High School",
    organizerName: "Wayland High School Athletics",
    organizerEmail: "athletics@wayland.k12.ma.us",
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z"
  },
  {
    id: 5,
    title: "Summer Art Exhibition Opening",
    description: "Opening reception for new contemporary art exhibition",
    startDate: "2025-08-15T18:00:00.000Z",
    startTime: "18:00",
    isAllDay: false,
    location: "Arts Wayland Gallery",
    category: "arts",
    department: "arts",
    calendarSource: "arts-wayland",
    venue: "Arts Wayland Gallery",
    organizerName: "Arts Wayland",
    organizerEmail: "theW@artswayland.com",
    organizerPhone: "(774) 421-9211",
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z"
  },
  {
    id: 6,
    title: "Planning Board Public Hearing",
    description: "Public hearing on proposed zoning amendments",
    startDate: "2025-08-12T19:30:00.000Z",
    startTime: "19:30",
    isAllDay: false,
    location: "Wayland Town Building - Planning Board Room",
    category: "hearing",
    department: "planning",
    calendarSource: "wayland-town",
    venue: "Wayland Town Building",
    organizerName: "Wayland Planning Board",
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z"
  },
  {
    id: 7,
    title: "Family Movie Night",
    description: "Family-friendly movie screening with snacks",
    startDate: "2025-08-10T18:30:00.000Z",
    startTime: "18:30",
    isAllDay: false,
    location: "Wayland Town Beach",
    category: "family",
    department: "recreation",
    calendarSource: "wayland-wcpa",
    venue: "Wayland Town Beach",
    organizerName: "Wayland Children and Parents Association",
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z"
  },
  {
    id: 8,
    title: "Book Club Discussion",
    description: "Monthly book club meeting",
    startDate: "2025-08-14T19:00:00.000Z",
    startTime: "19:00",
    isAllDay: false,
    location: "Wayland Free Public Library - Meeting Room",
    category: "literature",
    department: "library",
    calendarSource: "wayland-library",
    venue: "Wayland Free Public Library",
    organizerName: "Wayland Free Public Library",
    organizerEmail: "info@waylandlibrary.org",
    organizerPhone: "(508) 358-2311",
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z"
  },
  {
    id: 9,
    title: "Farmers Market",
    description: "Weekly farmers market with local vendors",
    startDate: "2025-08-16T09:00:00.000Z",
    startTime: "09:00",
    isAllDay: false,
    location: "Framingham Centre Common",
    category: "market",
    department: "community",
    calendarSource: "town-planner",
    venue: "Framingham Centre Common",
    organizerName: "Framingham Farmers Market",
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z"
  },
  {
    id: 10,
    title: "Middle School Soccer vs. Sudbury",
    description: "Home soccer game against Sudbury Middle School",
    startDate: "2025-08-18T15:30:00.000Z",
    startTime: "15:30",
    isAllDay: false,
    location: "Wayland Middle School Athletic Fields",
    category: "soccer",
    department: "athletics",
    calendarSource: "wayland-middle-athletics",
    venue: "Wayland Middle School",
    organizerName: "Wayland Middle School Athletics",
    organizerEmail: "athletics@wayland.k12.ma.us",
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z"
  }
];

const FALLBACK_STATS: Stats = {
  totalEvents: FALLBACK_EVENTS.length,
  categories: [
    { name: "meeting", count: 2 },
    { name: "performance", count: 1 },
    { name: "children", count: 1 },
    { name: "soccer", count: 2 },
    { name: "arts", count: 1 },
    { name: "hearing", count: 1 },
    { name: "family", count: 1 },
    { name: "literature", count: 1 }
  ],
  departments: [
    { name: "selectmen", count: 1 },
    { name: "arts", count: 2 },
    { name: "library", count: 2 },
    { name: "athletics", count: 2 },
    { name: "planning", count: 1 },
    { name: "recreation", count: 1 },
    { name: "community", count: 1 }
  ],
  sources: FALLBACK_SOURCES.map(s => ({ name: s.displayName, count: s.totalEvents || 0 })),
  lastImport: "2025-08-01T12:00:00.000Z"
};

// Client-side CSV generation
function generateCSV(events: Event[]): string {
  const headers = [
    "Title",
    "Description",
    "Start Date",
    "Start Time",
    "End Date",
    "End Time",
    "All Day",
    "Location",
    "Category",
    "Department",
    "Calendar Source",
    "Venue",
    "Organizer Name",
    "Organizer Email",
    "Organizer Phone",
    "Price",
    "URL",
    "Imported At"
  ];

  const csvContent = [
    headers.join(","),
    ...events.map(event => [
      `"${(event.title || "").replace(/"/g, '""')}"`,
      `"${(event.description || "").replace(/"/g, '""')}"`,
      event.startDate ? format(parseISO(event.startDate), "yyyy-MM-dd") : "",
      event.startTime || "",
      event.endDate ? format(parseISO(event.endDate), "yyyy-MM-dd") : "",
      event.endTime || "",
      event.isAllDay ? "Yes" : "No",
      `"${(event.location || "").replace(/"/g, '""')}"`,
      event.category || "",
      event.department || "",
      event.calendarSource || "",
      `"${(event.venue || "").replace(/"/g, '""')}"`,
      `"${(event.organizerName || "").replace(/"/g, '""')}"`,
      event.organizerEmail || "",
      event.organizerPhone || "",
      `"${(event.price || "").replace(/"/g, '""')}"`,
      event.url || "",
      event.importedAt ? format(parseISO(event.importedAt), "yyyy-MM-dd HH:mm:ss") : ""
    ].join(","))
  ].join("\n");

  return csvContent;
}

// Client-side iCal generation
function generateICal(events: Event[]): string {
  const formatDateForICal = (dateString: string): string => {
    return dateString.replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
  };

  const icalEvents = events.map(event => {
    const startDateTime = event.startDate;
    const endDateTime = event.endDate || event.startDate;

    return [
      "BEGIN:VEVENT",
      `UID:${event.id}@wayland-calendar`,
      `DTSTART:${formatDateForICal(startDateTime)}`,
      `DTEND:${formatDateForICal(endDateTime)}`,
      `SUMMARY:${event.title}`,
      event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : "",
      event.location ? `LOCATION:${event.location}` : "",
      event.organizerName ? `ORGANIZER;CN=${event.organizerName}:mailto:${event.organizerEmail || 'noreply@wayland.ma.us'}` : "",
      `CREATED:${formatDateForICal(event.importedAt)}`,
      `LAST-MODIFIED:${formatDateForICal(event.updatedAt)}`,
      "END:VEVENT"
    ].filter(line => line !== "").join("\r\n");
  }).join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wayland Calendar//NONSGML v1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Wayland Area Events",
    "X-WR-CALDESC:Events from multiple Wayland area calendars",
    icalEvents,
    "END:VCALENDAR"
  ].join("\r\n");
}

// Client-side download function
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CalendarImporter() {
  const [events, setEvents] = useState<Event[]>([]);
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  // Filtering states
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { toast } = useToast();

  const loadDataFromAPI = useCallback(async () => {
    try {
      const [eventsResponse, sourcesResponse, statsResponse] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/calendar-sources'),
        fetch('/api/stats')
      ]);

      if (eventsResponse.ok && sourcesResponse.ok && statsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const sourcesData = await sourcesResponse.json();
        const statsData = await statsResponse.json();

        setEvents(eventsData.data.events || []);
        setSources(sourcesData.data || []);
        setStats(statsData.data || null);
        setSelectedSources(sourcesData.data?.filter((s: CalendarSource) => s.isActive).map((s: CalendarSource) => s.id) || []);
      } else {
        throw new Error('API responses not ok');
      }
    } catch (error) {
      console.warn("Failed to load data from API, using fallback:", error);
      setApiAvailable(false);
      loadFallbackData();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFallbackData = useCallback(() => {
    setEvents(FALLBACK_EVENTS);
    setSources(FALLBACK_SOURCES);
    setStats(FALLBACK_STATS);
    setSelectedSources(FALLBACK_SOURCES.filter(s => s.isActive).map(s => s.id));

    toast({
      title: "Demo Mode Active",
      description: "Using sample data for demonstration. Some features may be limited.",
      duration: 5000,
    });
  }, [toast]);

  // Check API availability and initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Test API availability
        const testResponse = await fetch('/api/test');
        if (testResponse.ok) {
          setApiAvailable(true);
          await loadDataFromAPI();
        } else {
          throw new Error('API not available');
        }
      } catch (error) {
        console.warn("API not available, using fallback data:", error);
        setApiAvailable(false);
        loadFallbackData();
      }
    };

    initializeData();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Filter events based on current filters
  const filteredEvents = events.filter(event => {
    // Search filter
    if (search && !event.title.toLowerCase().includes(search.toLowerCase()) &&
        !(event.description?.toLowerCase().includes(search.toLowerCase()))) {
      return false;
    }

    // Category filter
    if (categoryFilter && categoryFilter !== "all" && event.category !== categoryFilter) {
      return false;
    }

    // Source filter
    if (sourceFilter && sourceFilter !== "all" && event.calendarSource !== sourceFilter) {
      return false;
    }

    // Date range filter
    if (startDateFilter || endDateFilter) {
      const eventDate = parseISO(event.startDate);

      if (startDateFilter) {
        const startFilter = startOfDay(parseISO(startDateFilter));
        if (isBefore(eventDate, startFilter)) {
          return false;
        }
      }

      if (endDateFilter) {
        const endFilter = endOfDay(parseISO(endDateFilter));
        if (isAfter(eventDate, endFilter)) {
          return false;
        }
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

  // Get unique categories and sources for filters
  const categories = [...new Set(events.map(e => e.category).filter(Boolean))] as string[];
  const sourceOptions = sources.map(s => ({ value: s.id, label: s.displayName }));

  const handleMultiSourceImport = async () => {
    if (selectedSources.length === 0) {
      toast({
        title: "No Sources Selected",
        description: "Please select at least one calendar source to import from.",
        variant: "destructive",
      });
      return;
    }

    if (!apiAvailable) {
      toast({
        title: "Import Unavailable",
        description: "Import functionality requires API access. Currently in demo mode with sample data.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setImportProgress({
      processed: 0,
      total: selectedSources.length,
      status: "Starting import...",
      errors: [],
      warnings: []
    });

    try {
      const response = await fetch('/api/multi-source-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sources: selectedSources }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle SSE response for real-time progress
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              setImportProgress(data);
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // Refresh data after import
      await loadDataFromAPI();

      toast({
        title: "Import Completed!",
        description: `Successfully imported events from ${selectedSources.length} sources.`,
      });

    } catch (error) {
      console.error('Import failed:', error);
      setImportProgress({
        processed: 0,
        total: selectedSources.length,
        status: "Import failed",
        errors: [`Import failed: ${error}`],
        warnings: []
      });

      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setImportProgress(null), 3000);
    }
  };

  const handleExport = async (exportFormat: "csv" | "ical") => {
    try {
      toast({
        title: "Export Started",
        description: `Generating ${exportFormat.toUpperCase()} export with ${filteredEvents.length} events...`,
      });

      const dateStr = format(new Date(), "yyyy-MM-dd");
      let content: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === "csv") {
        content = generateCSV(filteredEvents);
        filename = `wayland-events-${dateStr}.csv`;
        mimeType = "text/csv";
      } else {
        content = generateICal(filteredEvents);
        filename = `wayland-events-${dateStr}.ics`;
        mimeType = "text/calendar";
      }

      downloadFile(content, filename, mimeType);

      toast({
        title: "Export Completed!",
        description: `Successfully exported ${filteredEvents.length} events as ${exportFormat.toUpperCase()}`,
      });

    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const selectAllSources = () => {
    setSelectedSources(sources.filter(s => s.isActive).map(s => s.id));
  };

  const clearSourceSelection = () => {
    setSelectedSources([]);
  };

  const applyDateRange = (range: string) => {
    const today = new Date();

    switch (range) {
      case "today":
        setStartDateFilter(format(today, "yyyy-MM-dd"));
        setEndDateFilter(format(today, "yyyy-MM-dd"));
        break;
      case "next7":
        setStartDateFilter(format(today, "yyyy-MM-dd"));
        setEndDateFilter(format(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
        break;
      case "next30":
        setStartDateFilter(format(today, "yyyy-MM-dd"));
        setEndDateFilter(format(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
        break;
      case "past":
        setStartDateFilter("");
        setEndDateFilter(format(new Date(today.getTime() - 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
        break;
      case "all":
      default:
        setStartDateFilter("");
        setEndDateFilter("");
        break;
    }
    setDateRange(range);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          📅 Multi-Source Calendar Import Tool
        </h1>
        <p className="text-gray-600">
          Import and manage events from multiple Wayland area calendars
        </p>

        {apiAvailable === false && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-800 text-sm">
              <strong>⚠️ Demo Mode:</strong> API routes are currently unavailable. Displaying sample data for demonstration.
              Export functionality works with current data, but import requires API access.
            </p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.categories.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sources</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sources.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Import</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {stats?.lastImport ? format(parseISO(stats.lastImport), "MMM d, yyyy") : "Never"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="events" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">📅 Events</TabsTrigger>
          <TabsTrigger value="import">⚡ Multi-Source Import</TabsTrigger>
          <TabsTrigger value="sources">🏛️ Sources</TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          {/* Search & Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Search & Filter Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <Input
                    placeholder="Search events..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Source</label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      {sourceOptions.map(source => (
                        <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Date Range</label>
                  <Select value={dateRange} onValueChange={applyDateRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="next7">Next 7 days</SelectItem>
                      <SelectItem value="next30">Next 30 days</SelectItem>
                      <SelectItem value="past">Past events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setSourceFilter("all");
                      setDateRange("all");
                      setStartDateFilter("");
                      setEndDateFilter("");
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Export:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport("csv")}
                  disabled={filteredEvents.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport("ical")}
                  disabled={filteredEvents.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  iCal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card>
            <CardHeader>
              <CardTitle>Events ({filteredEvents.length})</CardTitle>
              <CardDescription>
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredEvents.length)} of {filteredEvents.length} events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          {event.url && (
                            <a
                              href={event.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                              title="View original event"
                            >
                              🔗
                            </a>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                        )}

                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                          <span>📅 {format(parseISO(event.startDate), "MMM d, yyyy")}</span>
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
                          <Badge variant="default">
                            {sources.find(s => s.id === event.calendarSource)?.displayName || event.calendarSource}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-xs text-gray-400 ml-4">
                        Imported {format(parseISO(event.importedAt), "MMM d")}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredEvents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Events Found</h3>
                    <p>Try adjusting your search criteria or import events from calendar sources.</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>

                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multi-Source Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
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
                  {sources.map((source) => (
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
                              <span>📊 {source.totalEvents || 0} events</span>
                            </div>
                          </div>
                        </div>

                        <Badge variant={source.isActive ? "default" : "secondary"}>
                          {source.isActive ? "Active" : "Inactive"}
                        </Badge>
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

                    {importProgress.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="text-red-600 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Errors:
                        </p>
                        <ul className="text-red-600 text-xs">
                          {importProgress.errors.map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

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
                  disabled={loading || selectedSources.length === 0 || !apiAvailable}
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
                      {apiAvailable ?
                        `Import from ${selectedSources.length} Source${selectedSources.length !== 1 ? 's' : ''}` :
                        "Import Unavailable (Demo Mode)"
                      }
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Sources</CardTitle>
              <CardDescription>
                Manage calendar sources for event imports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{source.displayName}</h3>
                        <p className="text-gray-600 mt-1">{source.description}</p>

                        <div className="flex gap-4 mt-3 text-sm text-gray-500">
                          <span>📊 {source.totalEvents || 0} events</span>
                          <span>🔗 {source.name}</span>
                        </div>
                      </div>

                      <Badge variant={source.isActive ? "default" : "secondary"}>
                        {source.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  );
}
