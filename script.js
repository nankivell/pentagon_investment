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
        color: '#7AC3C1',
        category: 'Critical Minerals Mine'
    },
    {
        id: 'mining-infrastructure',
        name: 'Mining Infrastructure',
        color: '#388DFF',
        category: 'Mining Infrastructure'
    },
    {
        id: 'refining-manufacturing',
        name: 'Refining and Manufacturing',
        color: '#8CFFA7',
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
        zoom: 3,  // Zoomed out
        attributionControl: false  // Disable default attribution since we have custom one
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

// Add custom attribution control
class CustomAttribution {
    onAdd(map) {
        this.map = map;
        this.container = document.createElement('div');
        this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-attrib';
        this.container.innerHTML = 'Map by Nessie Nankivell | © <a href="https://www.mapbox.com/">Mapbox</a> © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>';
        this.container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        this.container.style.padding = '5px 8px';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.fontSize = '11px';
        this.container.style.color = '#333';
        this.container.style.borderRadius = '3px';
        // Style the links
        const links = this.container.querySelectorAll('a');
        links.forEach(link => {
            link.style.color = '#0066cc';
            link.style.textDecoration = 'none';
        });
        return this.container;
    }
    onRemove() {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.map = undefined;
    }
}

// Load and style active points
map.on('load', () => {
    console.log('Map load event fired');
    
    // Add custom attribution after map loads
    const attrControl = new CustomAttribution();
    map.addControl(attrControl, 'bottom-right');
    console.log('Attribution control added');
    
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
            
            // Create a single combined source with all features (NO CLUSTERING)
            map.addSource('all-points', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: allFeatures
                }
            });

            // Create spoke lines source and layer
            map.addSource('spoke-lines', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Create cluster centers source
            map.addSource('cluster-centers', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Add spoke lines layer BEFORE unclustered-points so lines draw underneath
            map.addLayer({
                id: 'spoke-lines',
                type: 'line',
                source: 'spoke-lines',
                paint: {
                    'line-color': '#333333',
                    'line-width': 1,
                    'line-opacity': 0.6
                }
            });

            // Add all points layer with category colors
            map.addLayer({
                id: 'unclustered-points',
                type: 'circle',
                source: 'all-points',
                paint: {
                    'circle-color': [
                        'match',
                        ['get', 'category'],
                        'Critical Minerals Mine', '#7AC3C1',
                        'Mining Infrastructure', '#388DFF',
                        'Refining and Manufacturing', '#8CFFA7',
                        'Canadian-Domiciled Companies', '#333333',
                        '#999999'
                    ],
                    'circle-radius': 8,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#333333'
                }
            });

            // Add cluster center points layer - HIDDEN (opacity 0)
            map.addLayer({
                id: 'cluster-centers',
                type: 'circle',
                source: 'cluster-centers',
                paint: {
                    'circle-radius': 4,
                    'circle-color': '#333333',
                    'circle-stroke-width': 0,
                    'circle-opacity': 0  // Hide the center circles
                }
            });
            
            // Create a modified features source for display with spoke positioning
            let spokeFeatures = JSON.parse(JSON.stringify(allFeatures));
            
            // Helper function to calculate distance between two points (in meters)
            function getDistance(coords1, coords2) {
                const R = 6371000; // Earth radius in meters
                const lat1 = coords1[1] * Math.PI / 180;
                const lat2 = coords2[1] * Math.PI / 180;
                const deltaLat = (coords2[1] - coords1[1]) * Math.PI / 180;
                const deltaLng = (coords2[0] - coords1[0]) * Math.PI / 180;
                
                const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                          Math.cos(lat1) * Math.cos(lat2) *
                          Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            }

            // ============================================================================
            // HUB AND SPOKE CLUSTERING
            // ============================================================================
            function createHubAndSpokeClusters() {
                const spokeRadius = 100; // pixels
                const clusterDistance = 80000; // meters (80km) - points within this distance are clustered
                
                // Reset spoke features
                spokeFeatures = JSON.parse(JSON.stringify(allFeatures));
                
                // Create spatial index for clustering
                const clusters = [];
                const spokeLineFeatures = [];
                const clusterCenterFeatures = [];
                const processedFeatures = new Set();
                
                console.log('Starting cluster creation with', spokeFeatures.length, 'features');
                
                spokeFeatures.forEach((feature, index) => {
                    if (processedFeatures.has(index)) return;
                    
                    const coords = feature.geometry.coordinates;
                    const cluster = {
                        center: coords,
                        points: [{ feature: JSON.parse(JSON.stringify(feature)), index }]
                    };
                    processedFeatures.add(index);
                    
                    // Find all points near this cluster center
                    spokeFeatures.forEach((otherFeature, otherIndex) => {
                        if (processedFeatures.has(otherIndex)) return;
                        const distance = getDistance(coords, otherFeature.geometry.coordinates);
                        if (distance < clusterDistance) {
                            cluster.points.push({ feature: JSON.parse(JSON.stringify(otherFeature)), index: otherIndex });
                            processedFeatures.add(otherIndex);
                        }
                    });
                    
                    clusters.push(cluster);
                });
                
                console.log('Found', clusters.length, 'clusters');
                
                // Generate spokes for each cluster
                clusters.forEach((cluster) => {
                    const centerCoords = cluster.center;
                    const pointCount = cluster.points.length;
                    
                    // Add cluster center point
                    clusterCenterFeatures.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: centerCoords
                        }
                    });
                    
                    // Generate spokes for multi-point clusters
                    if (pointCount > 1) {
                        cluster.points.forEach((item, spokeIndex) => {
                            const angle = (spokeIndex / pointCount) * Math.PI * 2;
                            const spokeCoordPixels = {
                                x: Math.cos(angle) * spokeRadius,
                                y: Math.sin(angle) * spokeRadius
                            };
                            
                            // Convert pixel offset to lat/lng offset
                            const centerPixel = map.project(centerCoords);
                            const spokeLngLat = map.unproject({
                                x: centerPixel.x + spokeCoordPixels.x,
                                y: centerPixel.y + spokeCoordPixels.y
                            });
                            
                            // Update feature geometry with spoke position
                            item.feature.geometry.coordinates = [spokeLngLat.lng, spokeLngLat.lat];
                            item.feature.properties.cluster_center_lng = centerCoords[0];
                            item.feature.properties.cluster_center_lat = centerCoords[1];
                            
                            // Add spoke line
                            spokeLineFeatures.push({
                                type: 'Feature',
                                geometry: {
                                    type: 'LineString',
                                    coordinates: [centerCoords, [spokeLngLat.lng, spokeLngLat.lat]]
                                }
                            });
                        });
                    }
                });
                
                // Rebuild spokeFeatures array from all cluster points
                spokeFeatures = [];
                clusters.forEach(cluster => {
                    cluster.points.forEach(item => {
                        spokeFeatures.push(item.feature);
                    });
                });
                
                // Update all sources
                map.getSource('all-points').setData({
                    type: 'FeatureCollection',
                    features: spokeFeatures
                });
                
                map.getSource('spoke-lines').setData({
                    type: 'FeatureCollection',
                    features: spokeLineFeatures
                });
                
                map.getSource('cluster-centers').setData({
                    type: 'FeatureCollection',
                    features: clusterCenterFeatures
                });
                
                console.log('Hub and spoke clusters updated:', clusters.length, 'clusters, spokes:', spokeLineFeatures.length);
            }
            
            // Initial cluster creation
            createHubAndSpokeClusters();
            
            // Recreate clusters on zoom
            map.on('zoomend', createHubAndSpokeClusters);

            // Add active-point source and layer
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
                    'circle-stroke-color': '#333333'
                },
                layout: {
                    'visibility': 'none'
                }
            });

            // ============================================================================
            // HOVER INTERACTIONS - Must be inside map.on('load')
            // ============================================================================
            
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

            // ============================================================================
            // CLICK INTERACTIONS - Must be inside map.on('load')
            // ============================================================================
            
            // Show popup on unclustered point click
            map.on('click', 'unclustered-points', (e) => {
                console.log('Point clicked:', e.features[0].properties.site);
                const feature = e.features[0];
                
                // Show detailed info in sidebar - check if elements exist
                const returnBtn = document.getElementById('return-button');
                const infoWrapper = document.getElementById('info-wrapper');
                const heading = document.getElementById('heading');
                const loc = document.getElementById('loc');
                const employees = document.getElementById('employees');
                const militaryprod = document.getElementById('militaryprod');
                const civprod = document.getElementById('civprod');
                const text = document.getElementById('text');
                
                console.log('Sidebar elements exist:', {
                    returnBtn: !!returnBtn,
                    infoWrapper: !!infoWrapper,
                    heading: !!heading,
                    loc: !!loc,
                    employees: !!employees,
                    militaryprod: !!militaryprod,
                    civprod: !!civprod,
                    text: !!text
                });
                
                if (returnBtn) returnBtn.style.display = 'block';
                if (infoWrapper) infoWrapper.style.display = 'block';
                if (heading) heading.textContent = feature.properties.site;
                if (loc) loc.textContent = feature.properties.location;
                if (employees) employees.innerHTML = `<strong>Minerals:</strong> ${feature.properties.minerals}`;
                if (militaryprod) militaryprod.innerHTML = `<strong>Funding:</strong> ${feature.properties.funding}`;
                if (civprod) {
                    civprod.innerHTML = `<strong>Description:</strong> ${feature.properties.description}`;
                    civprod.style.display = 'block';
                }
                if (text) text.innerHTML = feature.properties.text || '';
            });
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
        });
});

// Global popup variable for hover interactions
let popup = null;

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
