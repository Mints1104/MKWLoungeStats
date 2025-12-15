# Mario Kart Lounge Stats

A full-stack web application for viewing and analyzing Mario Kart World player statistics from the Mario Kart Central Lounge API.

## Features

- Player profile lookup with detailed statistics and match history
- Interactive leaderboard with filtering and pagination
- Player comparison tool supporting up to 4 players simultaneously
- Performance visualizations using charts
- Responsive design for mobile and desktop devices

## Technology Stack

### Backend

- Node.js with Express 5.2.0
- Axios for HTTP requests
- CORS middleware for cross-origin support
- In-memory caching with TTL (Time To Live)

### Frontend

- React 19.2.0
- React Router v7.10.1 for navigation
- Recharts 3.5.1 for data visualization
- Vite 7.2.4 for build tooling

### Deployment

- Vercel serverless functions

## Project Structure

```
├── server.js              # Express API server
├── api/
│   └── index.js          # Vercel serverless function entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Utility functions
│   │   └── api/          # API client functions
│   └── public/           # Static assets
└── vercel.json           # Vercel deployment configuration
```

## Installation

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn package manager

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd MKWorldLoungeStats
```

2. Install backend dependencies:

```bash
npm install
```

3. Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

## Development

### Running Locally

1. Start the backend server:

```bash
npm run dev
```

The API server will run on `http://localhost:3000`

2. In a separate terminal, start the frontend development server:

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`

### Building for Production

Build the frontend:

```bash
npm run build
```

This command installs frontend dependencies and creates an optimized production build in `frontend/dist`.

## API Endpoints

### Player Details

```
GET /api/player/details/:name
```

Returns detailed statistics for a specific player.

### Player Leaderboard Lookup

```
GET /api/player/leaderboard/:name
```

Searches the leaderboard and returns a specific player's ranking information.

### Player Comparison

```
GET /api/players/compare?names=player1,player2,player3
```

Compares statistics for multiple players (1-4 players supported).

### Leaderboard

```
GET /api/leaderboard?skip=0&pageSize=50&minMmr=1000&maxMmr=15000&search=text&sortBy=Mmr
```

Returns paginated leaderboard data with optional filtering.

Parameters:

- `skip`: Number of entries to skip (pagination)
- `pageSize`: Number of entries per page (max 100)
- `minMmr`: Minimum MMR filter
- `maxMmr`: Maximum MMR filter
- `search`: Text search filter
- `sortBy`: Sort field (default: Mmr)

## Security Features

- Input validation and sanitization on all endpoints
- Cache size limits to prevent memory exhaustion
- URL encoding for player names to prevent injection attacks
- CORS configuration for secure cross-origin requests
- Error boundary component for graceful error handling

## Deployment

The application is configured for deployment on Vercel:

1. Push code to a Git repository
2. Import the project in Vercel
3. Deploy with default settings

Vercel automatically detects the configuration from `vercel.json` and handles both the API routes and frontend static files.

## Caching Strategy

The application implements an in-memory cache with the following characteristics:

- Default TTL: 60 seconds
- Player details cache: 120 seconds
- Maximum cache size: 1000 entries
- Automatic cache invalidation on errors

## License

ISC

## Data Source

Player statistics are provided by the [Mario Kart Central Lounge API](https://lounge.mkcentral.com/).
