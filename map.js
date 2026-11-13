
// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Import D3 - ES module 
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

//Select the SVG Element Inside the Map Container
const svg = d3.select('#map').select('svg');

//Select the tooltip
const tooltip = d3.select('#tooltip');


// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FmaWEtc2Z1IiwiYSI6ImNtd2NveDNsbDA0czUyeG9sc2I2aXp5cGQifQ.mq8GUTi6D1-Dww0XNDYSiA'

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});

//Define a Helper Function to Convert Coordinates
function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
    const { x, y } = map.project(point); // Project to pixel coordinates
    return { cx: x, cy: y }; // Return as object for use in SVG attributes
}

//Format time properly 
function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes); // Set hours & minutes
    return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

//Step 6.1: Quantize scale for traffic flow:
let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

//Compute station traffic seperately
function computeStationTraffic(stations, trips) {
    // Compute departures
    const departures = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.start_station_id,
    );
    
    // Computed arrivals as you did in step 4.2
    const arrivals = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.end_station_id,
    );
    
    //Add traffic information to each station
    return stations.map((station) => {
        let id = station.short_name;
        //Arrivals:
        station.arrivals = arrivals.get(id) ?? 0;
        // TODO departures
        station.departures = departures.get(id) ?? 0;
        // TODO totalTraffic
        station.totalTraffic = station.arrivals + station.departures;
        return station;
    });
}

//Convert a Date object into minutes since midnight
function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

//Filter trips by selected time:
function filterTripsbyTime(trips, timeFilter) {
    return timeFilter === -1
    ? trips // If no filter is applied (-1), return all trips
    : trips.filter((trip) => {
        // Convert trip start and end times to minutes since midnight
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);

        // Include trips that started or ended within 60 minutes of the selected time
        return (
            Math.abs(startedMinutes - timeFilter) <= 60 ||
            Math.abs(endedMinutes - timeFilter) <= 60
        );
    });
}



//Wait until the map finishes loading before adding the bike lane data
map.on('load', async () => { //ensures that the JSON data is only fetched after the map is fully loaded and ready.


    //Adding Boston Data Source with addSource
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
        });

    //Draw the bike lanes as green lines
    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': '#32D400', // A bright green using hex code
            'line-width': 5, // Thicker lines
            'line-opacity': 0.6, // Slightly less transparent
        },
    });

    //Adding Cambridge Data Source with addSource
    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
        });

    //Draw the bike lanes as green lines
    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: {
            'line-color': '#32D400', // A bright green using hex code
            'line-width': 5, // Thicker lines
            'line-opacity': 0.6, // Slightly less transparent
        },
    });

    //load the Data for bike stations
    let jsonData;
    try {
        const jsonurl = 'https://dsc-courses.github.io/dsc209r-2025-fa/labs/lab07/data/bluebikes-stations.json';

        // Await JSON fetch
        jsonData = await d3.json(jsonurl); //  loads the JSON file asynchronously using D3.js
        console.log('Loaded JSON Data:', jsonData); // Log to verify structure
    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }

    //Load Bluebikes traffic data data and convert dates directly
    let trips = await d3.csv(
        'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
        (trip) => {
            trip.started_at = new Date(trip.started_at);
            trip.ended_at = new Date(trip.ended_at);
            return trip;
        },
    );
    console.log('Trips:', trips);

    // Calculate traffic for all stations
    const stations = computeStationTraffic(jsonData.data.stations, trips);
    console.log('Stations with traffic:', stations);

    //Use Radius scale for size markers (circles)
    const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)])
        .range([0, 25]);


    // Append circles for each station
    const circles = svg
        .selectAll('circle')
        .data(stations, (d) => d.short_name) // Use station short_name as the key
        .enter()
        .append('circle')
        .attr('r', (d) => radiusScale(d.totalTraffic)) // Radius of the circle
        .attr('fill', 'steelblue') // Circle fill color
        .attr('stroke', 'white') // Circle border color
        .attr('stroke-width', 1) // Circle border thickness
        .attr('opacity', 0.8) // Circle opacity
        .style('--departure-ratio', (d) =>
            stationFlow(d.departures / d.totalTraffic),)

        /*.each(function (d) {
            // Add <title> for browser tooltips
            d3.select(this)
                .append('title')
                .text(
                    `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`,
                );
        });*/ //Removed because I changet the look of the tooltip
        // Show tooltip when hovering over a station
        .on('mouseenter', function (event, d) {

            console.log('Hovered station:', {
                name: d.name,
                totalTraffic: d.totalTraffic,
                departures: d.departures,
                arrivals: d.arrivals
            });

            const total = d.totalTraffic;
            const departurePercent = total > 0
            ? (d.departures / total) * 100
            : 0;

            const arrivalPercent = total > 0
            ? (d.arrivals / total) * 100
            : 0;

            // Build the tooltip using D3
            tooltip.html('');

            tooltip.append('h3')
                .text(d.name || 'Bluebikes Station');

            tooltip.append('div')
                .attr('class', 'total')
                .text(`${total.toLocaleString()} trips`);

            tooltip.append('div')
                .attr('class', 'detail')
                .text(`🔵 Departures: ${d.departures.toLocaleString()} (${departurePercent.toFixed(1)}%)`);

            tooltip.append('div')
                .attr('class', 'detail')
                .text(`🟢 Arrivals: ${d.arrivals.toLocaleString()} (${arrivalPercent.toFixed(1)}%)`);

            const bar = tooltip.append('div')
                .attr('class', 'traffic-bar');

            bar.append('div')
                .attr('class', 'departures')
                .style('width', `${departurePercent}%`);

            bar.append('div')
                .attr('class', 'arrivals')
                .style('width', `${arrivalPercent}%`);

            tooltip.classed('hidden', false);
        })

    // Move tooltip with the mouse
    .on('mousemove', function (event) {
        tooltip
        .style('left', `${event.clientX + 15}px`)
        .style('top', `${event.clientY + 15}px`);
    })

    // Hide tooltip when mouse leaves
    .on('mouseleave', function () {
        tooltip.classed('hidden', true);
    });


    //Update circle positions when the map moves
    function updatePositions() {
        circles
        .attr('cx', (d) => getCoords(d).cx) // Set the x-position using projected coordinates
        .attr('cy', (d) => getCoords(d).cy); // Set the y-position using projected coordinates
    }

    // Initial position update when map loads
    updatePositions();

    // Reposition markers when the map changes
    map.on('move', updatePositions); // Update during map movement
    map.on('zoom', updatePositions); // Update during zooming
    map.on('resize', updatePositions); // Update on window resize
    map.on('moveend', updatePositions); // Final adjustment after movement ends


    // Step 5.2: Select the slider and time display elements
    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');

    // -1 means no time filtering
    let timeFilter = -1;

    // Update the displayed time when the slider moves
    function updateTimeDisplay() {
        timeFilter = Number(timeSlider.value); //Get slider value

        if (timeFilter === -1) { 
            selectedTime.textContent = ''; // Clear timedisplay
            anyTimeLabel.style.display = 'block'; //Show "(any time)"
        } else {
            selectedTime.textContent = formatTime(timeFilter); //Display formatted time
            anyTimeLabel.style.display = 'none'; // Hide "(anytime)"
        }
        //Call updateScatterPlot to reflect the changes on the map
        updateScatterPlot(timeFilter);
    }
    // Filtering logic
    function updateScatterPlot(timeFilter) {
        // Get only the trips that match the selected time filter
        const filteredTrips = filterTripsbyTime(trips, timeFilter);
        // Recompute station traffic based on the filtered trips
        const filteredStations = computeStationTraffic(stations, filteredTrips);

        timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

        // Update the scatterplot by adjusting the radius of circles
        circles
            .data(filteredStations, (d) => d.short_name) // Ensure D3 tracks elmts correctly
            .join('circle') // Ensure the data is bound correctly
            .attr('r', (d) => radiusScale(d.totalTraffic)) // Update circle sizes
            .style('--departure-ratio', (d) =>
                stationFlow(d.departures / d.totalTraffic),
            );

    }


    // Listen for slider movement
    timeSlider.addEventListener('input', updateTimeDisplay);

    // Set the initial display
    updateTimeDisplay();

});



