# Lucas Plan Interactive Map

An interactive Mapbox visualization of military aerospace and shipbuilding sites in the UK.

## Quick Start

### 1. Get Your Mapbox Access Token

- Go to [mapbox.com](https://www.mapbox.com/)
- Sign in to your account (or create one)
- Navigate to [Account Tokens](https://account.mapbox.com/tokens/)
- Copy your default public token

### 2. Update Configuration

Open `script.js` and replace the placeholder with your token:

```javascript
mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN_HERE';
```

### 3. Create a Custom Map Style (Optional)

To use a custom map style like the original:

1. Go to [Mapbox Studio](https://studio.mapbox.com/)
2. Create or select a style
3. Copy the style URL (format: `mapbox://styles/username/styleid`)
4. In `script.js`, update the map initialization:

```javascript
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/your-username/your-style-id', // Replace this
    center: [-3, 54.8],
    zoom: 6
});
```

### 4. Add Your Data

The map currently loads placeholder data from `data/sites.geojson`. Replace this with your actual site data.

Each feature should have these properties:
- `site` - Site name
- `location` - Location description
- `employees` - Number of employees
- `militaryprod` - Military products
- `civprod` - Civilian products
- `greenprod` - Green products
- `ownership` - Company ownership
- `text` - Detailed description (optional)

### 5. Load Data into the Map

Add this code to `script.js` after the map loads:

```javascript
map.on('load', () => {
    // ... existing code ...
    
    // Load your GeoJSON data
    fetch('data/sites.geojson')
        .then(response => response.json())
        .then(data => {
            // Add sources for each layer type
            data.features.forEach(feature => {
                // Assign layer based on properties or add directly
            });
        });
});
```

## Project Structure

```
.
├── index.html       # Main HTML file
├── script.js        # Map initialization and interactions
├── styles.css       # Styling
├── data/
│   └── sites.geojson  # GeoJSON data (placeholder)
└── README.md        # This file
```

## Features

- **Interactive Map** - Click sites to view details
- **Hover Popups** - Site names appear on hover
- **Responsive Design** - Works on mobile and desktop
- **Layer Categories** - Color-coded by production type
- **Zoom Animation** - Smooth transitions when clicking sites
- **Return to Overview** - Button to reset map view

## Customization

### Change Map Center and Zoom
Edit these lines in `script.js`:
```javascript
center: [-3, 54.8],  // [longitude, latitude]
zoom: 6              // 0-24
```

### Modify Colors
Edit the `layers` array in `script.js`:
```javascript
const layers = [
    {
        id: 'case-studies',
        name: 'Transition Case Study',
        color: '#A0ECD0'  // Change this
    },
    // ... more layers
];
```

### Change Sidebar Width
Edit `styles.css`:
```css
#sidebar {
    width: 30%;  /* Change percentage */
}
```

## Deploying

To host this project online:

1. **GitHub Pages** - Push to a GitHub repo and enable Pages in settings
2. **Netlify** - Drop folder into [netlify.com](https://www.netlify.com/)
3. **Vercel** - Connect GitHub repo to [vercel.com](https://www.vercel.com/)
4. **Any Web Server** - Upload files via FTP/SSH

## Next Steps

1. Extract the actual GeoJSON data from the original website (check Network tab in Dev Tools)
2. Replace placeholder data in `data/sites.geojson`
3. Set up your custom Mapbox style if desired
4. Test all interactive features
5. Deploy to your hosting platform

## Resources

- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [GeoJSON Specification](https://geojson.org/)
- [Mapbox Studio Guide](https://docs.mapbox.com/studio-manual/)
