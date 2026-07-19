# 📂 StadiumIQ — Project Structure & File Map

This document details the complete file structure, description of directories, and file relationships for the StadiumIQ smart stadium platform.

---

## 🗺️ Project Directory Tree

```
c4/ (Root Directory)
│
├── index.html                   # Entry point for the frontend user interface
├── styles.css                   # Main stylesheet for the application (custom dark sports theme)
├── app.js                       # Frontend bootstrapper and page layout controller
├── README.md                    # GitHub documentation
├── structure.md                 # Detailed architectural and file layout guide (this file)
│
├── js/                          # Frontend Logic Directory (ES Modules)
│   ├── api.js                   # Handles fetch requests to the Express backend API
│   ├── assistant.js             # Logic for the Gemini AI Chatbot, quick prompts, and chat transcripts
│   ├── crowd.js                 # Controls the interactive stadium heatmap & AI suggestions list
│   ├── navigation.js            # Handles multi-floor selector & route step generation
│   ├── transport.js             # Implements travel predictions & transit option capacity bars
│   ├── sustainability.js        # Plots environmental charts & carbon timeline graphs
│   ├── operations.js            # Manages incident logs and AI-generated volunteer task dispatching
│   └── utils.js                 # Shared helpers (animated metrics, toast indicators, input sanitation)
│
└── backend/                     # Backend API & Simulation Layer (Node.js/Express)
    ├── package.json             # Backend metadata, npm scripts, and library dependencies
    ├── server.js                # Core Express setup (middlewares, CORS, Helmet security, Rate limits)
    ├── .env                     # Local configuration parameters (API key, server port)
    ├── .env.example             # Template for setup parameters
    │
    └── routes/                  # Express Sub-routers (API routes for modular endpoints)
        ├── ai.js                # Feeds data into Google Gemini model via Generative AI SDK
        ├── crowd.js             # Simulates real-time density trackers in stadium sections
        ├── navigation.js        # Simulates indoor path metadata & accessibility guidelines
        ├── transport.js         # Stores transit route timetables
        ├── sustainability.js    # Stores renewable energy data & carbon usage charts
        └── operations.js        # Handles venue ticketing & incident logging
```

---

## 🔗 File Relationships & Data Flow

```mermaid
graph TD
    %% Frontend Components
    subgraph Frontend [c4/ Root & js/]
        HTML[index.html] -->|Loads| CSS[styles.css]
        HTML -->|Loads| AppJS[app.js]
        AppJS -->|Imports & Init| AsstJS[js/assistant.js]
        AppJS -->|Imports & Init| CrowdJS[js/crowd.js]
        AppJS -->|Imports & Init| NavJS[js/navigation.js]
        AppJS -->|Imports & Init| TransJS[js/transport.js]
        AppJS -->|Imports & Init| SustJS[js/sustainability.js]
        AppJS -->|Imports & Init| OpsJS[js/operations.js]
        
        AsstJS -->|Uses API wrapper| API[js/api.js]
        CrowdJS -->|Uses API wrapper| API
        NavJS -->|Uses API wrapper| API
        TransJS -->|Uses API wrapper| API
        SustJS -->|Uses API wrapper| API
        OpsJS -->|Uses API wrapper| API
    end

    %% Backend Server
    subgraph Backend [backend/]
        API -->|HTTP Fetch requests| Server[server.js]
        Server -->|Express router delegation| Routes[routes/]
        Routes -->|Route /api/ai| AIRoutes[routes/ai.js]
        Routes -->|Route /api/crowd| CrowdRoutes[routes/crowd.js]
        Routes -->|Route /api/navigation| NavRoutes[routes/navigation.js]
        Routes -->|Route /api/transport| TransRoutes[routes/transport.js]
        Routes -->|Route /api/sustainability| SustRoutes[routes/sustainability.js]
        Routes -->|Route /api/operations| OpsRoutes[routes/operations.js]
        
        %% AI Integration
        AIRoutes -->|Fetches suggestions & chats| GeminiSDK[@google/generative-ai]
        GeminiSDK -->|API Request| GoogleGemini[Google Gemini API]
    end
```

---

## 🛠️ File Descriptions

### Frontend Layer
1. **`index.html`**: Structured using HTML5 semantic components (`<header>`, `<main>`, `<aside>`, `<nav>`). Provides skip links for screen readers and controls for language/theme settings.
2. **`styles.css`**: Complete style token map (variables, sizing grid, glassmorphic card classes, responsive layouts).
3. **`app.js`**: Binds click handlers to nav links, initializes modules dynamically on first visit, and runs backend health checks.
4. **`js/api.js`**: Direct fetch mappings. Checks status and handles backend connection failures cleanly by fallback flags.
5. **`js/assistant.js`**: Binds chat inputs, stores context history, streams characters, and processes text-to-file downloads.
6. **`js/crowd.js`**: Maps percentage values to grid areas in the dashboard container to display high-traffic corridors.
7. **`js/navigation.js`**: Handles ground-level and upper-deck layout configurations and loads step-by-step route descriptions.
8. **`js/transport.js`**: Provides shuttle lists and estimates transit durations during game hours.
9. **`js/sustainability.js`**: Maps energy, water, and trash recycling metrics and draws custom SVG/CSS carbon charts.
10. **`js/operations.js`**: Renders dynamic incident management tickets and interfaces with the Gemini API to draft task guidelines.
11. **`js/utils.js`**: Shared module containing visual toast alerts and cubic-bezier counter easing.

### Backend Layer
1. **`backend/server.js`**: Configures port settings, JSON parsers, CORS handlers, and API request loggers.
2. **`backend/routes/ai.js`**: Implements system prompts tailored by user role and stadium location, passing them to the Gemini SDK.
3. **`backend/routes/crowd.js`**: Generates section capacities, density alerts, and inflow trends dynamically.
4. **`backend/routes/navigation.js`**: Stores coordinate points and maps routes for stadium gates, sections, restrooms, and emergency exits.
5. **`backend/routes/transport.js`**: Simulates shuttle departures, passenger loads, and calculates travel times.
6. **`backend/routes/sustainability.js`**: Prepares logs for green energy levels and carbon emissions over a 12-hour period.
7. **`backend/routes/operations.js`**: Exposes ticketing routes for incident tickets, staff allocations, and operational timelines.
