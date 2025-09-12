import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import type { TrackPoint } from '../../types';
import { dateUtils } from '../../utils/dateUtils';
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';


let DefaultIcon = L.divIcon({
  html: '<div style="background-color: #3388ff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>',
  iconSize: [12, 12],
  className: 'custom-div-icon'
});

L.Marker.prototype.options.icon = DefaultIcon;

interface TrackMapProps {
  trackData: TrackPoint[];
}

export const TrackMap: React.FC<TrackMapProps> = ({ trackData }) => {
  const mapRef = useRef<L.Map>(null);

  const validTrackData = trackData.filter(point => 
    point.lat && point.lon && 
    !isNaN(point.lat) && !isNaN(point.lon) &&
    Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180
  );

  if (validTrackData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-gray-600">Нет данных о маршруте</span>
      </div>
    );
  }

  const positions: LatLngTuple[] = validTrackData.map(point => [point.lat, point.lon]);

  const center: LatLngTuple = [
    validTrackData.reduce((sum, point) => sum + point.lat, 0) / validTrackData.length,
    validTrackData.reduce((sum, point) => sum + point.lon, 0) / validTrackData.length
  ];

  const startPoint = validTrackData[0];
  const endPoint = validTrackData[validTrackData.length - 1];

  const StartIcon = L.divIcon({
    html: '<div style="background-color: #28a745; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">S</div>',
    iconSize: [16, 16],
    className: 'custom-start-icon'
  });

  const EndIcon = L.divIcon({
    html: '<div style="background-color: #dc3545; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">F</div>',
    iconSize: [16, 16],
    className: 'custom-end-icon'
  });

  useEffect(() => {
    if (mapRef.current && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [positions]);

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">
          Маршрут движения
        </h3>
        <div className="text-sm text-gray-500">
          Точек: {validTrackData.length}
        </div>
      </div>
      
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={13}
        className="h-96 w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Polyline 
          positions={positions} 
          color="#3388ff" 
          weight={3}
          opacity={0.7}
        />
        
        <Marker position={[startPoint.lat, startPoint.lon]} icon={StartIcon}>
          <Popup>
            <div>
              <strong>Начало маршрута</strong><br />
              Время: {dateUtils.formatForDisplay(dateUtils.fromUTCString(startPoint.time))}<br />
              Координаты: {startPoint.lat.toFixed(6)}, {startPoint.lon.toFixed(6)}
            </div>
          </Popup>
        </Marker>
        
        {validTrackData.length > 1 && (
          <Marker position={[endPoint.lat, endPoint.lon]} icon={EndIcon}>
            <Popup>
              <div>
                <strong>Конец маршрута</strong><br />
                Время: {dateUtils.formatForDisplay(dateUtils.fromUTCString(endPoint.time))}<br />
                Координаты: {endPoint.lat.toFixed(6)}, {endPoint.lon.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

