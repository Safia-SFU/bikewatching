
// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Import D3 - ES module 
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);


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
        const jsonData = await d3.json(jsonurl); //  loads the JSON file asynchronously using D3.js
        console.log('Loaded JSON Data:', jsonData); // Log to verify structure
    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }

    if (jsonData) {
        let stations = jsonData.data.stations;
        console.log('Stations Array:', stations);
    }

});



