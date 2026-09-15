import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin } from "lucide-react";
import L from "leaflet";

// Fix para iconos de leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Coordenadas aproximadas de ciudades españolas
const CITY_COORDS = {
  "Madrid": [40.4168, -3.7038],
  "Barcelona": [41.3851, 2.1734],
  "Valencia": [39.4699, -0.3763],
  "Sevilla": [37.3891, -5.9845],
  "Málaga": [36.7213, -4.4214],
  "Bilbao": [43.2630, -2.9350],
  "Alicante": [38.3452, -0.4810],
  "Zaragoza": [41.6488, -0.8891],
  "Murcia": [37.9922, -1.1307],
  "Palma": [39.5696, 2.6502],
  "Las Palmas": [28.1236, -15.4366],
  "Valladolid": [41.6520, -4.7245],
  "Córdoba": [37.8882, -4.7794],
  "Vigo": [42.2406, -8.7207],
  "Gijón": [43.5322, -5.6611],
  "L'Hospitalet": [41.3598, 2.1006],
  "A Coruña": [43.3623, -8.4115],
  "Granada": [37.1773, -3.5986],
  "Vitoria": [42.8467, -2.6716],
  "Elche": [38.2699, -0.6983],
  "Santa Cruz": [28.4682, -16.2546],
  "Oviedo": [43.3603, -5.8448],
  "Badalona": [41.4502, 2.2434],
  "Cartagena": [37.6256, -0.9963],
  "Terrassa": [41.5633, 2.0087],
  "Jerez": [36.6868, -6.1265],
  "Sabadell": [41.5431, 2.1089],
  "Móstoles": [40.3228, -3.8648],
  "Alcalá de Henares": [40.4818, -3.3636],
  "Pamplona": [42.8125, -1.6458],
  "Fuenlabrada": [40.2842, -3.7938],
  "Almería": [36.8381, -2.4597],
  "Leganés": [40.3273, -3.7633],
  "Donostia": [43.3183, -1.9812],
  "Burgos": [42.3439, -3.6969],
  "Santander": [43.4623, -3.8100],
  "Castellón": [39.9864, -0.0513],
  "Alcorcón": [40.3457, -3.8242],
  "Getafe": [40.3057, -3.7329],
  "Logroño": [42.4627, -2.4450],
  "Badajoz": [38.8794, -6.9707],
  "Salamanca": [40.9701, -5.6635],
  "Huelva": [37.2614, -6.9447],
  "Lleida": [41.6176, 0.6200],
  "Tarragona": [41.1189, 1.2445],
  "León": [42.5987, -5.5671],
  "Cádiz": [36.5271, -6.2886],
  "Marbella": [36.5108, -4.8826],
  "Dos Hermanas": [37.2826, -5.9209],
  "Torrejón": [40.4569, -3.4769],
  "Parla": [40.2369, -3.7669],
  "Reus": [41.1560, 1.1068],
  "Alcobendas": [40.5378, -3.6418],
  "Telde": [27.9925, -15.4188],
  "Ourense": [42.3360, -7.8640],
  "Mataró": [41.5408, 2.4443],
  "Algeciras": [36.1408, -5.4553],
  "Barakaldo": [43.2992, -2.9886],
  "Lugo": [43.0097, -7.5567],
  "Girona": [41.9794, 2.8214],
  "Santiago": [42.8782, -8.5448],
  "Cáceres": [39.4753, -6.3724],
  "Lorca": [37.6776, -1.7006],
  "Coslada": [40.4208, -3.5603],
  "Talavera": [39.9634, -4.8303],
  "Cornellà": [41.3565, 2.0743],
  "Ávila": [40.6570, -4.6816],
  "Palencia": [42.0096, -4.5288],
  "Guadalajara": [40.6328, -3.1672],
  "Toledo": [39.8628, -4.0273],
  "Cuenca": [40.0703, -2.1374],
  "Segovia": [40.9429, -4.1088],
  "Zamora": [41.5034, -5.7467],
  "Soria": [41.7665, -2.4790],
  "Pontevedra": [42.4333, -8.6500],
  "Albacete": [38.9943, -1.8585]
};

// Normalizar nombres de ciudad para mejor coincidencia
const normalizeCityName = (city) => {
  if (!city) return "";
  return city
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9\s]/g, "") // quitar caracteres especiales
    .trim();
};

// Crear mapa normalizado de coordenadas
const NORMALIZED_COORDS = {};
Object.entries(CITY_COORDS).forEach(([city, coords]) => {
  NORMALIZED_COORDS[normalizeCityName(city)] = coords;
});

export default function MapView({ profiles, onProfileClick }) {
  const { t } = useTranslation();
  const mapRef = useRef(null);

  // Función para buscar coordenadas de una ciudad
  const findCoords = (ciudad) => {
    if (!ciudad) return null;
    
    // Buscar coincidencia exacta normalizada
    const normalized = normalizeCityName(ciudad);
    if (NORMALIZED_COORDS[normalized]) {
      return NORMALIZED_COORDS[normalized];
    }
    
    // Buscar coincidencia parcial (por si la ciudad incluye más texto)
    for (const [key, coords] of Object.entries(NORMALIZED_COORDS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return coords;
      }
    }
    
    return null;
  };

  // Agrupar por ciudad para añadir offset a coordenadas
  const cityGroups = {};
  profiles.forEach(p => {
    const coords = findCoords(p.ciudad);
    if (coords) {
      const cityKey = normalizeCityName(p.ciudad);
      if (!cityGroups[cityKey]) cityGroups[cityKey] = { coords, profiles: [] };
      cityGroups[cityKey].profiles.push(p);
    }
  });

  // Añadir offset a profesionales en la misma ciudad para evitar superposición
  const profilesWithCoords = [];
  Object.entries(cityGroups).forEach(([cityKey, { coords, profiles: cityProfiles }]) => {
    cityProfiles.forEach((p, index) => {
      // Añadir pequeño offset (0.01 grados ≈ 1km)
      const angle = (index / cityProfiles.length) * 2 * Math.PI;
      const distance = 0.015 + (index * 0.005);
      const offsetLat = Math.cos(angle) * distance;
      const offsetLng = Math.sin(angle) * distance;
      profilesWithCoords.push({
        ...p,
        coords: [coords[0] + offsetLat, coords[1] + offsetLng]
      });
    });
  });

  const center = profilesWithCoords.length > 0 
    ? profilesWithCoords[0].coords 
    : [40.4168, -3.7038]; // Madrid por defecto

  return (
    <Card className="h-[500px] relative" style={{ overflow: 'visible' }}>
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {profilesWithCoords.map((profile) => (
          <Marker
            key={profile.id}
            position={profile.coords}
            eventHandlers={{
              click: () => onProfileClick(profile)
            }}
          >
            <Popup>
              <div
                className="p-2 min-w-[200px] cursor-pointer"
                onClick={() => onProfileClick(profile)}
              >
                <h3 className="font-semibold text-sm mb-1">{profile.business_name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                  <MapPin className="w-3 h-3" />
                  {profile.ciudad}, {profile.provincia}
                </div>
                {profile.average_rating > 0 && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-semibold">{profile.average_rating.toFixed(1)}</span>
                  </div>
                )}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onProfileClick(profile);
                  }}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                >
                  {t('profile_card.view_profile')}
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Card>
  );
}