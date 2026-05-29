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
    // Determine zoom level based on screen size
    const isMobile = window.innerWidth <= 768;
    const zoomLevel = isMobile ? 2 : 3;
    
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-95, 56],  // Centered on Canada
        zoom: zoomLevel,  // Zoom 2 for mobile, 3 for desktop
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
    legend.style.width = '100%';
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
        this.container.innerHTML = 'Map by Nessie Nankivell | Data by Shiri Pasternak/<a href="https://8thfirerising.ca/" target="_blank">8th Fire Rising</a> | © <a href="https://www.mapbox.com/" target="_blank">Mapbox</a> © <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>';
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

            // Add spoke lines layer (will be repositioned after points layer)
            map.addLayer({
                id: 'spoke-lines',
                type: 'line',
                source: 'spoke-lines',
                paint: {
                    'line-color': '#333333',
                    'line-width': 1.5,
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

            // Move spoke-lines layer to be BEFORE unclustered-points (underneath)
            // Find and move the layer
            const layers = map.getStyle().layers;
            const spokeLayerIndex = layers.findIndex(l => l.id === 'spoke-lines');
            if (spokeLayerIndex !== -1) {
                // Move spoke-lines to be right before unclustered-points so it draws underneath
                map.moveLayer('spoke-lines', 'unclustered-points');
            }
            
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
                const zoomLevel = map.getZoom();
                
                // Adjust spoke radius and cluster distance based on zoom level
                // At zoom 7+, points start unclustering
                let spokeRadius = 50;
                let clusterDistance = 80000; // meters
                
                if (zoomLevel >= 7) {
                    spokeRadius = 50;
                    clusterDistance = 10000; // 10km at zoom 7+
                }
                if (zoomLevel >= 8) {
                    spokeRadius = 30;
                    clusterDistance = 5000; // 5km at zoom 8+
                }
                if (zoomLevel >= 9) {
                    spokeRadius = 15;
                    clusterDistance = 2000; // 2km at zoom 9+
                }
                if (zoomLevel >= 10) {
                    // Minimal clustering - points almost independent
                    spokeRadius = 5;
                    clusterDistance = 200; // 200m at zoom 10+
                }
                if (zoomLevel >= 11) {
                    // No clustering - each point is independent
                    spokeRadius = 0;
                    clusterDistance = 50; // 50m at zoom 11+ (essentially no clustering)
                }
                
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
                            // For 2-point clusters, adjust angles to form a V-shape (upper left and upper right)
                            let angle;
                            if (pointCount === 2) {
                                // V-shape: upper left at 135°, upper right at 45°
                                angle = spokeIndex === 0 ? (135 * Math.PI / 180) : (45 * Math.PI / 180);
                            } else {
                                // For other clusters, distribute evenly around the circle
                                angle = (spokeIndex / pointCount) * Math.PI * 2;
                            }
                            
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
                    } else {
                        // Single point cluster - keep point at original location
                        cluster.points[0].feature.geometry.coordinates = centerCoords;
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
            
            // Recreate clusters on every zoom change (not just when zoom ends)
            map.on('zoom', createHubAndSpokeClusters);

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
                
                // Fly to the clicked point, keeping current zoom level
                const coords = feature.geometry.coordinates;
                map.flyTo({
                    center: coords,
                    zoom: map.getZoom()
                });
                
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
                
                if (infoWrapper) {
                    infoWrapper.style.display = 'block';
                }
                // Add active class to sidebar on mobile to show it at bottom
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.add('active');
                }
                if (heading) heading.textContent = feature.properties.site;
                if (loc) loc.textContent = feature.properties.location;
                if (employees) employees.innerHTML = `<strong>Minerals:</strong> ${feature.properties.minerals}`;
                if (militaryprod) militaryprod.innerHTML = `<strong>Pentagon Funding:</strong> ${feature.properties.funding}`;
                if (civprod) {
                    civprod.innerHTML = feature.properties.description;
                    civprod.style.display = 'block';
                }
                if (text) text.innerHTML = '';
            });
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
        });
});

// Global popup variable for hover interactions
let popup = null;

// Close button handler
document.getElementById('close-button').addEventListener('click', function() {
    // Fly back to default map position (same as page load)
    map.flyTo({
        center: [-95, 56],
        zoom: 3
    });
    
    // Remove active class to hide sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
});

// Adjust sidebar width on window resize
window.addEventListener('resize', () => {
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').style.width = '100%';
    } else {
        document.getElementById('sidebar').style.width = '30%';
    }
});
