
// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Import D3 - ES module 
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

//Select the SVG Element Inside the Map Container
const svg = d3.select('#map').select('svg');

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

    
    let stations = jsonData.data.stations;
    console.log('Stations Array:', stations);

    // Append circles for each station
    const circles = svg
        .selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', 5) // Radius of the circle
        .attr('fill', 'steelblue') // Circle fill color
        .attr('stroke', 'white') // Circle border color
        .attr('stroke-width', 1) // Circle border thickness
        .attr('opacity', 0.8); // Circle opacity

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

});



