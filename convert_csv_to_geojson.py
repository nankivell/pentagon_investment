import csv
import json

# Read CSV file
csv_file = 'pentagon_investment_map_data_categorized.csv'
geojson_file = 'data/sites.geojson'

features = []

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            lat = float(row['LAT'])
            lon = float(row['LON'])
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "site": row['Critical Mineral Project'],
                    "location": row['Mining Proponent'],
                    "minerals": row['Minerals Sought'],
                    "funding": row['US State Funding'],
                    "category": row['Category'],
                    "text": f"<strong>Proponent:</strong> {row['Mining Proponent']}<br><strong>Minerals:</strong> {row['Minerals Sought']}<br><strong>Funding:</strong> {row['US State Funding']}"
                }
            }
            features.append(feature)
        except ValueError:
            print(f"Skipping row with invalid coordinates: {row}")

# Create GeoJSON
geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Write to file
with open(geojson_file, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, indent=2)

print(f"✓ Converted {len(features)} features from CSV to GeoJSON")
print(f"✓ Saved to {geojson_file}")
