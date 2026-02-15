export interface Flight {
  id: number;
  airline: string;
  airlineCode: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: number;
}

export const flights: Flight[] = [
  {
    id: 1,
    airline: "British Airways",
    airlineCode: "BA",
    origin: "LHR",
    destination: "JFK",
    departureTime: "09:00",
    arrivalTime: "12:30",
    duration: "8h 30m",
    stops: 0,
    price: 650,
  },
  {
    id: 2,
    airline: "Delta Air Lines",
    airlineCode: "DL",
    origin: "LHR",
    destination: "JFK",
    departureTime: "11:15",
    arrivalTime: "14:45",
    duration: "8h 30m",
    stops: 0,
    price: 580,
  },
  {
    id: 3,
    airline: "United Airlines",
    airlineCode: "UA",
    origin: "LHR",
    destination: "EWR",
    departureTime: "14:00",
    arrivalTime: "17:20",
    duration: "8h 20m",
    stops: 0,
    price: 520,
  },
  {
    id: 4,
    airline: "Virgin Atlantic",
    airlineCode: "VS",
    origin: "LHR",
    destination: "JFK",
    departureTime: "10:30",
    arrivalTime: "13:55",
    duration: "8h 25m",
    stops: 0,
    price: 720,
  },
  {
    id: 5,
    airline: "American Airlines",
    airlineCode: "AA",
    origin: "LHR",
    destination: "JFK",
    departureTime: "16:00",
    arrivalTime: "19:30",
    duration: "8h 30m",
    stops: 0,
    price: 610,
  },
  {
    id: 6,
    airline: "Norwegian",
    airlineCode: "DY",
    origin: "LGW",
    destination: "JFK",
    departureTime: "08:00",
    arrivalTime: "11:45",
    duration: "8h 45m",
    stops: 0,
    price: 350,
  },
  {
    id: 7,
    airline: "Spirit Airlines",
    airlineCode: "NK",
    origin: "LHR",
    destination: "JFK",
    departureTime: "08:49",
    arrivalTime: "07:05",
    duration: "22h 16m",
    stops: 1,
    price: 380,
  },
  {
    id: 8,
    airline: "Lufthansa",
    airlineCode: "LH",
    origin: "LHR",
    destination: "JFK",
    departureTime: "06:30",
    arrivalTime: "14:00",
    duration: "12h 30m",
    stops: 1,
    price: 480,
  },
  {
    id: 9,
    airline: "Air France",
    airlineCode: "AF",
    origin: "LHR",
    destination: "JFK",
    departureTime: "07:15",
    arrivalTime: "15:30",
    duration: "13h 15m",
    stops: 1,
    price: 450,
  },
  {
    id: 10,
    airline: "KLM",
    airlineCode: "KL",
    origin: "LHR",
    destination: "JFK",
    departureTime: "12:00",
    arrivalTime: "21:45",
    duration: "14h 45m",
    stops: 1,
    price: 420,
  },
];

export const airports: Record<string, string> = {
  LHR: "London Heathrow",
  LGW: "London Gatwick",
  STN: "London Stansted",
  JFK: "New York JFK",
  EWR: "Newark Liberty",
  LGA: "New York LaGuardia",
};
