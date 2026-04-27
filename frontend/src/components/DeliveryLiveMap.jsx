import React from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";

function AutoFitRoute({ points }) {
  const map = useMap();

  React.useEffect(() => {
    if (!Array.isArray(points) || points.length < 2) return;
    const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15, animate: true });
  }, [map, points]);

  return null;
}

export default function DeliveryLiveMap({ live }) {
  const center = [
    live.currentLocation?.lat || live.origin?.lat || 6.9271,
    live.currentLocation?.lng || live.origin?.lng || 79.8612,
  ];

  const plannedRouteLine = Array.isArray(live.routePoints) && live.routePoints.length > 1
    ? live.routePoints.map((p) => [p.lat, p.lng])
    : [
        [live.origin?.lat || center[0], live.origin?.lng || center[1]],
        [live.destination?.lat || center[0], live.destination?.lng || center[1]],
      ];

  const completedRouteLine = Array.isArray(live.completedRoutePoints) && live.completedRoutePoints.length > 1
    ? live.completedRoutePoints.map((p) => [p.lat, p.lng])
    : [[plannedRouteLine[0][0], plannedRouteLine[0][1]], [center[0], center[1]]];

  const destinationPoint = plannedRouteLine[plannedRouteLine.length - 1];

  return (
    <MapContainer center={center} zoom={13} className="h-60 w-full" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AutoFitRoute points={plannedRouteLine} />

      <Polyline
        positions={plannedRouteLine}
        pathOptions={{ color: "#94a3b8", weight: 4, opacity: 0.55, dashArray: "7 8" }}
      />
      <Polyline
        positions={completedRouteLine}
        pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.9 }}
      />

      <CircleMarker center={plannedRouteLine[0]} radius={6} pathOptions={{ color: "#0f172a", fillColor: "#0f172a", fillOpacity: 0.9 }} />
      <CircleMarker center={destinationPoint} radius={6} pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.9 }} />

      <CircleMarker center={center} radius={10} pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.25, weight: 2 }} />
      <CircleMarker center={center} radius={6.5} pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.98, weight: 2 }} />
    </MapContainer>
  );
}
