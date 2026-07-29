export interface Coordinates {
  latitude: number;
  longitude: number;
}

const earthRadiusKm = 6371;

export function calculateDistanceKm(origin: Coordinates, destination: Coordinates) {
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function isWithinServiceRadius(input: {
  origin: Coordinates;
  destination: Coordinates;
  radiusKm: number;
}) {
  return calculateDistanceKm(input.origin, input.destination) <= input.radiusKm;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
