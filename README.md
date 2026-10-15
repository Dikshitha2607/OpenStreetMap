# OpenStreetMap UX and Functionality Enhancement
A simple route-planning web application built to explore ways of making route search more understandable and convenient for everyday users.

## About the Project
OpenStreetMap provides geographical data and supports a wide range of mapping applications. However, route-planning experiences can sometimes be confusing for users who are unfamiliar with routing terminology or who struggle to find a location using its name.
This project was developed as part of the **Full Stack Development (MAI412-2)** course for the MSc Artificial Intelligence and Machine Learning programme at CHRIST University.
The aim is to address a few common usability challenges through an independent route-planning prototype inspired by the OpenStreetMap experience. Rather than modifying the official OpenStreetMap website, the project demonstrates practical improvements in location search, route selection and travel information.

## Problem Statement
The project focuses on four usability challenges:
1. **Technical routing terminology:** Routing engines and their technical names can be confusing for users who simply want to plan a journey.
2. **Difficult location searches:** Misspelled or incomplete place names can make it harder to find the intended destination.
3. **Unclear travel durations:** Time values without appropriate units or readable formatting can be difficult to interpret.
4. **Long-distance walking routes:** Walking routes between distant cities may produce impractical journey estimates or fail to return a route. Users should be made aware of the distance before proceeding.

## Objectives
- Make route planning straightforward for everyday users.
- Improve location search through useful place suggestions.
- Validate user inputs before attempting to calculate a route.
- Present distance and travel duration in an easy-to-understand format.
- Provide a clear warning before calculating unusually long walking routes.
- Maintain a responsive interface that works across desktop and mobile screens.
- Handle search and routing errors with helpful messages.

## Features

### 1. Location Search and Suggestions
Users can enter a starting point and destination and search for matching places. The application uses Photon to retrieve location results.
Available suggestions display relevant place information such as locality, city or country when provided by the service. Users select a result to confirm the location before calculating a route.
The search process is user-triggered rather than sending a request after every keystroke.

### 2. Input Validation

The application checks for missing locations and invalid search states before attempting route calculation.
It also handles situations such as empty inputs, searches with no matching results and network or service errors. Clear feedback helps users understand what needs to be corrected.

### 3. Multiple Travel Modes
Users can choose between three travel modes:
- **Car**
- **Bike**
- **Walk**
The selected mode determines which Valhalla routing profile is used to calculate the route.

### 4. Distance and Travel Duration

Route results display the calculated distance and estimated travel duration. Time values are formatted into readable units rather than being shown as ambiguous raw numbers.
These are routing estimates and should not be treated as live traffic predictions.

### 5. Long-Distance Walking Warning

Walking between distant locations may not be practical for many users. When a walking route exceeds 50 km, the application displays a warning before proceeding.
Users can decide whether to continue with the request. The application does not silently change the selected travel mode.

### 6. Route and Search Error Handling

The application provides feedback during searches and route calculations. It also handles cases where a service is unavailable or cannot return a usable result.

### 7. Responsive Interface

The interface uses a clean layout with clear input fields, visible travel-mode controls and readable route information. The layout adapts to smaller screens and includes focus styling to support keyboard navigation.

### 8. Location Swapping

Users can swap the starting point and destination without entering both locations again. The associated location data must remain consistent with the displayed inputs.

## Technologies Used
 HTML5 -> Structure and content of the application 
 CSS3 ->  Styling, layout and responsive design 
 JavaScript ->  Search handling, validation and route interaction 
 Photon ->  Location search and geocoding 
 Valhalla ->  Route calculation for supported travel modes 
 OpenStreetMap data ->  Open geographical data used by the mapping services 

The application is built using vanilla JavaScript without requiring a frontend framework.

## How It Works

The application follows a simple workflow:

1. The user enters a starting point and destination.
2. Photon searches for matching locations when the user submits a search.
3. The user selects a result for each location.
4. The user chooses Car, Bike or Walk.
5. The application validates the selected locations and sends a routing request to Valhalla.
6. The returned route information is processed and displayed with readable distance and duration values.
7. If the requested walking route exceeds 50 km, the user is asked to confirm before proceeding.

The route calculation depends on the response returned by the routing service. The application does not generate fictional route results when the service fails.

## Getting Started

### Prerequisites
You will need:
- Python installed on your system for the local development server, or another simple static HTTP server.
- A modern web browser.
- An internet connection to access the public geocoding and routing services.
No package installation or API key is required for the current implementation.

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Dikshitha2607/OpenStreetMap.git
```

**2. Navigate to the project directory**
```bash
cd OpenStreetMap
```

**3. Start a local server**
If Python is installed, run:
```bash
py -m http.server 8000
```

Alternatively, on systems where `python3` is the available command:
```bash
python3 -m http.server 8000
```

**4. Open the application**

Visit the following address in your browser:

`http://localhost:8000`

The application should load from the local server.

## Project Structure

```text
OpenStreetMap/
├── index.html
├── style.css
├── script.js
└── README.md
```

- **index.html:** Contains the structure of the route-planning interface.
- **style.css:** Defines the visual styling, layout and responsive behaviour.
- **script.js:** Handles location searches, input validation, travel-mode selection and route calculation.
- **README.md:** Documents the project, setup instructions and functionality.

## API Usage

### Photon Geocoding API

Photon is used to search for places based on user-entered text. Its results provide location details and coordinates that can be used for routing.

### Valhalla Routing API

Valhalla calculates routes using the selected travel mode. The application uses the corresponding routing profiles for car, bicycle and pedestrian travel.

Both services are accessed over the internet. Their availability and response times depend on the public services and network conditions.

## Limitations

- The application depends on public geocoding and routing services, which may occasionally be slow, unavailable or rate-limited.
- Location suggestions depend on the results returned by Photon. A place may not always appear under an incomplete or misspelled query.
- Route availability depends on the underlying geographical data and routing engine.
- Travel durations are estimates and do not account for live traffic conditions.
- The 50 km walking threshold is a usability warning rather than a universal limit on walking routes.
- The route preview is schematic and is not a full interactive map with tiled geographical rendering.
- The application is an independent prototype. It does not modify the official OpenStreetMap website or replace its existing routing services.

## Future Improvements

Possible extensions include:

- A fully interactive map with route visualisation.
- More advanced handling of misspelled place names.
- Additional route alternatives when supported by the routing service.
- Improved accessibility and keyboard navigation.
- More detailed route information, including intermediate points where available.
- Further testing across browsers and different network conditions.

## Academic Context
**Course:** Full Stack Development (MAI412-2)  
**Programme:** MSc Artificial Intelligence and Machine Learning  
**Institution:** CHRIST University  
**Project:** OpenStreetMap UX and Functionality Enhancement

This project demonstrates how frontend development, external APIs and input validation can be combined to address practical usability problems in a route-planning application.

## Acknowledgements
Thanks to the OpenStreetMap community for maintaining open geographical data and to the Photon and Valhalla projects for providing the services used in this prototype.
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Photon](https://photon.komoot.io/)
- [Valhalla](https://valhalla.github.io/)

---

*This project was developed for academic purposes to explore usability improvements in route planning.*
