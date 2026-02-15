import { useState, useEffect, useCallback } from "react";
import { useWebMCPTool } from "react-webmcp";
import { flights, type Flight } from "../data/flights";
import type { SearchParams } from "../App";

interface Filters {
  stops: number[];
  airlines: string[];
  origins: string[];
  destinations: string[];
  minPrice: number;
  maxPrice: number;
  departureTime: number[];
  arrivalTime: number[];
  flightIds: number[];
}

const defaultFilters: Filters = {
  stops: [],
  airlines: [],
  origins: [],
  destinations: [],
  minPrice: 0,
  maxPrice: 1000,
  departureTime: [0, 1439],
  arrivalTime: [0, 1439],
  flightIds: [],
};

interface FlightResultsProps {
  searchParams: SearchParams;
  setSearchParams: (params: Partial<SearchParams>) => void;
}

export default function FlightResults({
  searchParams,
}: FlightResultsProps) {
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>(flights);
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });
  const [toastMessage, setToastMessage] = useState("");

  // Apply filters whenever they change
  useEffect(() => {
    let result = [...flights];

    if (filters.stops.length > 0)
      result = result.filter((f) => filters.stops.includes(f.stops));
    if (filters.airlines.length > 0)
      result = result.filter((f) => filters.airlines.includes(f.airlineCode));
    if (filters.origins.length > 0)
      result = result.filter((f) => filters.origins.includes(f.origin));
    if (filters.destinations.length > 0)
      result = result.filter((f) =>
        filters.destinations.includes(f.destination),
      );
    if (filters.flightIds.length > 0)
      result = result.filter((f) => filters.flightIds.includes(f.id));

    result = result.filter(
      (f) => f.price >= filters.minPrice && f.price <= filters.maxPrice,
    );

    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    result = result.filter(
      (f) =>
        toMinutes(f.departureTime) >= filters.departureTime[0] &&
        toMinutes(f.departureTime) <= filters.departureTime[1],
    );
    result = result.filter(
      (f) =>
        toMinutes(f.arrivalTime) >= filters.arrivalTime[0] &&
        toMinutes(f.arrivalTime) <= filters.arrivalTime[1],
    );

    setFilteredFlights(result);
  }, [filters]);

  // --- WebMCP Tools (using react-webmcp hooks) ---

  // listFlights tool
  useWebMCPTool({
    name: "listFlights",
    description: "Returns all flights available.",
    inputSchema: {},
    outputSchema: {
      type: "object",
      properties: {
        result: {
          type: "array",
          description: "The list of flights.",
          items: {
            type: "object",
            properties: {
              id: { type: "number", description: "Flight unique identifier." },
              airline: { type: "string", description: "Airline name." },
              origin: { type: "string", description: "Origin airport code." },
              destination: { type: "string", description: "Destination airport code." },
              departureTime: { type: "string", description: "Departure time." },
              arrivalTime: { type: "string", description: "Arrival time." },
              duration: { type: "string", description: "Flight duration." },
              stops: { type: "number", description: "Number of stops." },
              price: { type: "number", description: "Price in USD." },
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: "true" },
    execute: () => flights,
  });

  // setFilters tool
  const setFiltersExecute = useCallback(
    (input: Record<string, unknown>) => {
      setFilters({ ...defaultFilters, ...(input as Partial<Filters>) });
      setToastMessage("Filters updated by AI agent");
      return "Filters successfully updated.";
    },
    [],
  );

  useWebMCPTool({
    name: "setFilters",
    description: "Sets the filters for flights.",
    inputSchema: {
      type: "object",
      properties: {
        stops: {
          type: "array",
          description: "Stop counts to filter by.",
          items: { type: "number" },
        },
        airlines: {
          type: "array",
          description: "Airline IATA codes to filter by.",
          items: { type: "string", pattern: "^[A-Z]{2}$" },
        },
        origins: {
          type: "array",
          description: "Origin airport 3-letter IATA codes.",
          items: { type: "string", pattern: "^[A-Z]{3}$" },
        },
        destinations: {
          type: "array",
          description: "Destination airport 3-letter IATA codes.",
          items: { type: "string", pattern: "^[A-Z]{3}$" },
        },
        minPrice: { type: "number", description: "Minimum price." },
        maxPrice: { type: "number", description: "Maximum price." },
        departureTime: {
          type: "array",
          description: "Departure time range in minutes from midnight (0-1439).",
          items: { type: "number" },
        },
        arrivalTime: {
          type: "array",
          description: "Arrival time range in minutes from midnight (0-1439).",
          items: { type: "number" },
        },
        flightIds: {
          type: "array",
          description: "Flight IDs to filter by.",
          items: { type: "number" },
        },
      },
    },
    annotations: { readOnlyHint: "false" },
    execute: setFiltersExecute,
  });

  // resetFilters tool
  const resetFiltersExecute = useCallback(() => {
    setFilters({ ...defaultFilters });
    setToastMessage("Filters reset by AI agent");
    return "Filters successfully reset.";
  }, []);

  useWebMCPTool({
    name: "resetFilters",
    description: "Resets all filters to their default values.",
    inputSchema: {},
    annotations: { readOnlyHint: "false" },
    execute: resetFiltersExecute,
  });

  // searchFlights tool (also available on results page)
  useWebMCPTool({
    name: "searchFlights",
    description: "Searches for flights with the given parameters.",
    inputSchema: {
      type: "object",
      properties: {
        origin: {
          type: "string",
          description: "Origin IATA code (3 letters).",
          pattern: "^[A-Z]{3}$",
        },
        destination: {
          type: "string",
          description: "Destination IATA code (3 letters).",
          pattern: "^[A-Z]{3}$",
        },
        tripType: {
          type: "string",
          enum: ["one-way", "round-trip"],
          description: "Trip type.",
        },
        outboundDate: {
          type: "string",
          description: "Outbound date (YYYY-MM-DD).",
          format: "date",
        },
        inboundDate: {
          type: "string",
          description: "Inbound date (YYYY-MM-DD).",
          format: "date",
        },
        passengers: {
          type: "number",
          description: "Number of passengers.",
        },
      },
      required: ["origin", "destination", "tripType", "outboundDate", "inboundDate", "passengers"],
    },
    annotations: { readOnlyHint: "false" },
    execute: (input) => {
      const origin = input.origin as string;
      const destination = input.destination as string;
      if (!origin?.match(/^[A-Z]{3}$/))
        return "ERROR: `origin` must be a 3-letter IATA code.";
      if (!destination?.match(/^[A-Z]{3}$/))
        return "ERROR: `destination` must be a 3-letter IATA code.";
      return "A new flight search was started.";
    },
  });

  const isDemoQuery =
    searchParams.origin === "LON" &&
    searchParams.destination === "NYC" &&
    searchParams.tripType === "round-trip";

  return (
    <div className="app">
      {toastMessage && (
        <div className="toast" onClick={() => setToastMessage("")}>
          {toastMessage}
        </div>
      )}
      <header className="header">
        <h2>
          {searchParams.origin} &rarr; {searchParams.destination}
        </h2>
        <span>
          {searchParams.tripType} &middot; {searchParams.passengers} passenger
          {searchParams.passengers > 1 ? "s" : ""}
        </span>
      </header>
      <main className="app-main">
        {isDemoQuery ? (
          <div className="results-container">
            <div className="filter-bar">
              <button
                className="reset-btn"
                onClick={() => setFilters({ ...defaultFilters })}
              >
                Reset Filters
              </button>
              <span className="flight-count">
                {filteredFlights.length} flight{filteredFlights.length !== 1 ? "s" : ""}
              </span>
            </div>
            <ul className="flight-list">
              {filteredFlights.map((flight) => (
                <li key={flight.id} className="flight-card">
                  <div className="flight-airline">{flight.airline}</div>
                  <div className="flight-route">
                    {flight.origin} &rarr; {flight.destination}
                  </div>
                  <div className="flight-times">
                    {flight.departureTime} &ndash; {flight.arrivalTime} (
                    {flight.duration})
                  </div>
                  <div className="flight-meta">
                    {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                  </div>
                  <div className="flight-price">${flight.price}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="no-results">
            <h2>No results found</h2>
            <p>
              This demo supports: LON &rarr; NYC, round-trip.
              <br />
              Your query: {searchParams.origin} &rarr;{" "}
              {searchParams.destination}, {searchParams.tripType}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
