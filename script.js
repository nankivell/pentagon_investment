// ============================================================================
// MAPBOX CONFIGURATION
// ============================================================================
// Get token from window object (set in index.html from environment variable)
mapboxgl.accessToken = window.MAPBOX_TOKEN;

console.log('Mapbox token set:', mapboxgl.accessToken ? 'Yes' : 'No');

// Define layers array
const layers = [
    {
        id: 'critical-mines',
        name: 'Critical Minerals Mine',
        color: '#9ca4fc',
        category: 'Critical Minerals Mine'
    },
    {
        id: 'mining-infrastructure',
        name: 'Mining Infrastructure',
        color: '#ffa69e',
        category: 'Mining Infrastructure'
    },
    {
        id: 'refining-manufacturing',
        name: 'Refining and Manufacturing',
        color: '#a0ecd0',
        category: 'Refining and Manufacturing'
    },
    {
        id: 'canadian-companies',
        name: 'Canadian-Domiciled Companies',
        color: '#333333',
        category: 'Canadian-Domiciled Companies'
    }
];

// Initialize map
let map;
try {
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-95, 56],  // Centered on Canada
        zoom: 4  // Closer zoom
    });
    console.log('Map initialized successfully');
    
    // Add error listener
    map.on('error', (error) => {
        console.error('Map error:', error);
    });
    
    map.on('style.load', () => {
        console.log('Map style loaded');
    });
} catch (error) {
    console.error('Error initializing map:', error);
}

// Store all features globally
let allFeatures = [];

// ============================================================================
// LEGEND
// ============================================================================
function createLegend() {
    const legend = document.getElementById('legend');
    layers.forEach(layer => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        const legendColor = document.createElement('span');
        legendColor.className = 'legend-color';
        legendColor.style.backgroundColor = layer.color;
        legendColor.style.width = '12px';
        legendColor.style.height = '12px';
        legendColor.style.display = 'inline-block';
        legendColor.style.marginRight = '8px';
        const legendLabel = document.createElement('span');
        legendLabel.textContent = layer.name;
        legendItem.appendChild(legendColor);
        legendItem.appendChild(legendLabel);
        legend.appendChild(legendItem);
    });
}

createLegend();

// ============================================================================
// MAP INITIALIZATION
// ============================================================================
map.addControl(new mapboxgl.NavigationControl(), 'top-left');

// Load and style active points
map.on('load', () => {
    console.log('Map load event fired');
    
    // Fetch and load GeoJSON data
    fetch('data/sites.geojson')
        .then(response => {
            console.log('GeoJSON fetch response:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('GeoJSON data loaded:', data.features.length, 'features');
            
            // Map of site names to categories
            const categoryMap = {
                'La Loutre Graphite Mine': 'Critical Minerals Mine',
                'NICO Project': 'Critical Minerals Mine',
                'Mactung Mine Project': 'Mining Infrastructure',
                'Sission Mine': 'Critical Minerals Mine',
                'Nano One Cathode Factory (Candiac location)': 'Refining and Manufacturing',
                'Nano One Cathode Factory (Vancouver Location)': 'Refining and Manufacturing',
                'Electra Cobalt Refinery': 'Refining and Manufacturing',
                'Lithium Americas Headquarters': 'Canadian-Domiciled Companies',
                'Trilogy Metals Headquarters': 'Canadian-Domiciled Companies',
                'Strange Lake Rare Earth Mining Project': 'Mining Infrastructure',
                'Ring of Fire': 'Critical Minerals Mine'
            };
            
            // Add category to each feature if it's missing
            data.features.forEach(feature => {
                if (!feature.properties.category) {
                    feature.properties.category = categoryMap[feature.properties.site];
                }
            });
            
            console.log('First feature category after mapping:', data.features[0].properties.category);
            allFeatures = data.features;
            
            // Create a single combined source with all features
            map.addSource('all-points', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: allFeatures
                },
                cluster: true,
                clusterMaxZoom: 13,
                clusterRadius: 50
            });

            // Add cluster layer (circles for clusters)
            map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'all-points',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': '#333333',
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        15,
                        2, 18,
                        3, 21
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });

            // Add cluster count layer
            map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'all-points',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                    'text-size': 12,
                    'text-offset': [0, 0]
                },
                paint: {
                    'text-color': '#ffffff'
                }
            });

            // Add unclustered points layer with category colors
            map.addLayer({
                id: 'unclustered-points',
                type: 'circle',
                source: 'all-points',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': [
                        'match',
                        ['get', 'category'],
                        'Critical Minerals Mine', '#9ca4fc',
                        'Mining Infrastructure', '#ffa69e',
                        'Refining and Manufacturing', '#a0ecd0',
                        'Canadian-Domiciled Companies', '#333333',
                        '#999999'
                    ],
                    'circle-radius': 8,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });

            // Cluster expansion on click
            map.on('click', 'clusters', (e) => {
                const clusterId = e.features[0].properties.cluster_id;
                map.getSource('all-points').getClusterExpansionZoom(clusterId, (err, zoom) => {
                    if (err) return;
                    map.easeTo({
                        center: e.lngLat,
                        zoom: zoom
                    });
                });
            });

            // Show popup on unclustered point click
            map.on('click', 'unclustered-points', (e) => {
                const feature = e.features[0];
                const popup = new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`<div class='popup-content'><strong>${feature.properties.site}</strong><br>${feature.properties.text}</div>`)
                    .addTo(map);
            });

            map.on('mouseleave', 'unclustered-points', () => {
                map.getCanvas().style.cursor = '';
            });
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
        });
    
    map.addSource('active-point', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    map.addLayer({
        id: 'active-point',
        type: 'circle',
        source: 'active-point',
        paint: {
            'circle-radius': 8,
            'circle-color': '#FD676A',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });
});

// ============================================================================
// POPUP AND HOVER INTERACTIONS
// ============================================================================
let popup = null;

// Hover to show popup on unclustered points
map.on('mouseenter', 'unclustered-points', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    if (popup) {
        popup.remove();
    }
    const feature = e.features[0];
    popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -15]
    })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(`<strong>${feature.properties.site}</strong><br>${feature.properties.location}`)
        .addTo(map);
});

// Remove popup on mouse leave
map.on('mouseleave', 'unclustered-points', () => {
    map.getCanvas().style.cursor = '';
    if (popup) {
        popup.remove();
        popup = null;
    }
});

// Hover on clusters
map.on('mouseenter', 'clusters', (e) => {
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'clusters', () => {
    map.getCanvas().style.cursor = '';
});

// ============================================================================
// CLICK INTERACTIONS
// ============================================================================
map.on('click', (event) => {
    // Check for cluster clicks
    const clusterFeatures = map.queryRenderedFeatures(event.point, {
        layers: ['clusters']
    });
    
    if (clusterFeatures.length) {
        const feature = clusterFeatures[0];
        const clusterId = feature.properties.cluster_id;
        
        // Get the cluster's zoom level and expand it
        map.getSource('all-points').getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.flyTo({
                center: feature.geometry.coordinates,
                zoom: zoom
            });
        });
        return;
    }

    // Check for unclustered point clicks
    const pointFeatures = map.queryRenderedFeatures(event.point, {
        layers: ['unclustered-points']
    });

    if (pointFeatures.length) {
        const feature = pointFeatures[0];

        // Update active point styling
        map.getSource('active-point').setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: feature.geometry,
                properties: {}
            }]
        });

        // Zoom to the clicked point
        map.flyTo({
            center: feature.geometry.coordinates,
            zoom: 6
        });

        // Display info in sidebar
        document.getElementById('return-button').style.display = 'block';
        document.getElementById('info-wrapper').style.display = 'block';
        document.getElementById('heading').textContent = `${feature.properties.site}`;
        document.getElementById('loc').textContent = `${feature.properties.location}`;
        document.getElementById('employees').innerHTML = `<span style="color: black">Minerals Sought:</span> ${feature.properties.minerals}`;
        document.getElementById('militaryprod').innerHTML = `<span style="color: black">Funding:</span> ${feature.properties.funding}`;
        document.getElementById('civprod').innerHTML = `<span style="color: black">Description:</span> ${feature.properties.description || 'No description available'}`;
        document.getElementById('civprod').style.display = 'block';
        document.getElementById('greenprod').style.display = 'none';
        document.getElementById('ownership').style.display = 'none';

        const textContent = feature.properties.text ? feature.properties.text : '';
        document.getElementById('text').innerHTML = textContent;
    } else {
        // Reset view when clicking off points
        map.flyTo({
            center: [-95, 56],
            zoom: 4
        });

        document.getElementById('return-button').style.display = 'none';
        document.getElementById('info-wrapper').style.display = 'none';
    }
});

// ============================================================================
// RETURN BUTTON
// ============================================================================
document.getElementById('return-button').addEventListener('click', function() {
    map.flyTo({
        center: [-95, 56],
        zoom: 4
    });
    
    document.getElementById('return-button').style.display = 'none';
    document.getElementById('info-wrapper').style.display = 'none';
});

// Adjust sidebar width on window resize
window.addEventListener('resize', () => {
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').style.width = '100%';
    } else {
        document.getElementById('sidebar').style.width = '30%';
    }
});
