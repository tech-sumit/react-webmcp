import React, { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebMCPTool } from "react-webmcp";
import type { SearchParams } from "../App";

interface FlightSearchProps {
  searchParams: SearchParams;
  setSearchParams: (params: Partial<SearchParams>) => void;
}

export default function FlightSearch({
  searchParams,
  setSearchParams,
}: FlightSearchProps) {
  const navigate = useNavigate();
  const [completedRequestId, setCompletedRequestId] = useState<string | null>(
    null,
  );

  // Signal tool completion back to the dispatchAndWait helper
  useEffect(() => {
    if (completedRequestId) {
      window.dispatchEvent(
        new CustomEvent(`tool-completion-${completedRequestId}`),
      );
      setCompletedRequestId(null);
    }
  }, [completedRequestId]);

  // Register the searchFlights tool using the react-webmcp hook
  const searchExecute = useCallback(
    (input: Record<string, unknown>) => {
      return new Promise<string>((resolve, reject) => {
        const origin = input.origin as string;
        const destination = input.destination as string;

        if (!origin?.match(/^[A-Z]{3}$/)) {
          resolve(
            "ERROR: `origin` must be a 3 letter city or airport IATA code.",
          );
          return;
        }
        if (!destination?.match(/^[A-Z]{3}$/)) {
          resolve(
            "ERROR: `destination` must be a 3 letter city or airport IATA code.",
          );
          return;
        }

        const requestId = Math.random().toString(36).substring(2, 15);
        const completionEvent = `tool-completion-${requestId}`;

        const timeout = setTimeout(() => {
          window.removeEventListener(completionEvent, onComplete);
          reject(new Error("Timed out waiting for UI to update"));
        }, 5000);

        const onComplete = () => {
          clearTimeout(timeout);
          window.removeEventListener(completionEvent, onComplete);
          resolve("A new flight search was started.");
        };

        window.addEventListener(completionEvent, onComplete);

        const params = new URLSearchParams();
        params.append("origin", origin);
        params.append("destination", destination);
        params.append("tripType", (input.tripType as string) || "one-way");
        params.append(
          "outboundDate",
          (input.outboundDate as string) || new Date().toISOString().split("T")[0],
        );
        params.append(
          "inboundDate",
          (input.inboundDate as string) || "",
        );
        params.append("passengers", String(input.passengers || 1));

        navigate(`/results?${params.toString()}`);
        setCompletedRequestId(requestId);
      });
    },
    [navigate],
  );

  useWebMCPTool({
    name: "searchFlights",
    description: "Searches for flights with the given parameters.",
    inputSchema: {
      type: "object",
      properties: {
        origin: {
          type: "string",
          description:
            "City or airport IATA code for the origin. Prefer city IATA codes when a specific airport is not provided. Example: 'LON' for 'London'",
          pattern: "^[A-Z]{3}$",
          minLength: 3,
          maxLength: 3,
        },
        destination: {
          type: "string",
          description:
            "City or airport IATA code for the destination. Prefer city IATA codes when a specific airport is not provided. Example: 'NYC' for 'New York'",
          pattern: "^[A-Z]{3}$",
          minLength: 3,
          maxLength: 3,
        },
        tripType: {
          type: "string",
          enum: ["one-way", "round-trip"],
          description: 'The trip type. Can be "one-way" or "round-trip".',
        },
        outboundDate: {
          type: "string",
          description: "The outbound date in YYYY-MM-DD format.",
          format: "date",
        },
        inboundDate: {
          type: "string",
          description: "The inbound date in YYYY-MM-DD format.",
          format: "date",
        },
        passengers: {
          type: "number",
          description: "The number of passengers.",
        },
      },
      required: [
        "origin",
        "destination",
        "tripType",
        "outboundDate",
        "inboundDate",
        "passengers",
      ],
    },
    annotations: { readOnlyHint: false },
    execute: searchExecute,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.append("origin", searchParams.origin);
    params.append("destination", searchParams.destination);
    params.append("tripType", searchParams.tripType);
    params.append("outboundDate", searchParams.outboundDate);
    params.append("inboundDate", searchParams.inboundDate);
    params.append("passengers", String(searchParams.passengers));
    navigate(`/results?${params.toString()}`);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setSearchParams({
      [name]: name === "passengers" ? parseInt(value, 10) : value,
    });
  };

  return (
    <div className="app">
      <main className="app-main">
        <div className="search-form-container">
          <h1>Flight Search</h1>
          <p className="subtitle">
            Powered by <code>react-webmcp</code> — try using the Model Context
            Tool Inspector extension!
          </p>
          <form onSubmit={handleSubmit} className="flight-search-form">
            <div className="form-group">
              <label htmlFor="origin">Origin</label>
              <input
                type="text"
                id="origin"
                name="origin"
                placeholder="e.g. LON"
                value={searchParams.origin}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="destination">Destination</label>
              <input
                type="text"
                id="destination"
                name="destination"
                placeholder="e.g. NYC"
                value={searchParams.destination}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="outboundDate">Outbound Date</label>
              <input
                type="date"
                id="outboundDate"
                name="outboundDate"
                value={searchParams.outboundDate}
                onChange={handleChange}
              />
            </div>
            {searchParams.tripType === "round-trip" && (
              <div className="form-group">
                <label htmlFor="inboundDate">Inbound Date</label>
                <input
                  type="date"
                  id="inboundDate"
                  name="inboundDate"
                  value={searchParams.inboundDate}
                  onChange={handleChange}
                />
              </div>
            )}
            <div className="form-group">
              <label>Trip Type</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="tripType"
                    value="one-way"
                    checked={searchParams.tripType === "one-way"}
                    onChange={handleChange}
                  />{" "}
                  One-way
                </label>
                <label>
                  <input
                    type="radio"
                    name="tripType"
                    value="round-trip"
                    checked={searchParams.tripType === "round-trip"}
                    onChange={handleChange}
                  />{" "}
                  Round-trip
                </label>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="passengers">Number of Passengers</label>
              <input
                type="number"
                id="passengers"
                name="passengers"
                min="1"
                value={searchParams.passengers}
                onChange={handleChange}
              />
            </div>
            <button type="submit" className="search-flights-button">
              Search Flights
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
