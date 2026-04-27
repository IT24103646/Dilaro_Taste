import React from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

const RESTAURANT_POINT = { lat: 6.9271, lng: 79.8612 };

function PickerClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      onPick({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
    },
  });
  return null;
}

function RecenterOnValue({ value }) {
  const map = useMap();
  React.useEffect(() => {
    if (!value || value.lat == null || value.lng == null) return;
    map.setView([value.lat, value.lng], map.getZoom(), { animate: true });
  }, [map, value]);
  return null;
}

export default function DeliveryLocationPickerMap({ value, onChange }) {
  const destination = value?.lat != null && value?.lng != null ? value : null;
  const center = destination ? [destination.lat, destination.lng] : [RESTAURANT_POINT.lat, RESTAURANT_POINT.lng];

  return (
    <MapContainer center={center} zoom={13} className="h-64 w-full rounded-xl" scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PickerClickHandler
        onPick={(coords) => onChange({ lat: coords.lat, lng: coords.lng })}
      />
      <RecenterOnValue value={destination} />
      <CircleMarker
        center={[RESTAURANT_POINT.lat, RESTAURANT_POINT.lng]}
        radius={7}
        pathOptions={{ color: "#111827", fillColor: "#111827", fillOpacity: 0.9 }}
      />
      {destination && (
        <CircleMarker
          center={[destination.lat, destination.lng]}
          radius={8}
          pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.95 }}
        />
      )}
    </MapContainer>
  );
}
