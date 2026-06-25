import * as Location from 'expo-location';

export type Coords = {
  lat: number;
  lng: number;
  gpsAccuracy?: number;
};

export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    let granted = existing.status === 'granted';

    if (!granted && existing.canAskAgain) {
      const requested = await Location.requestForegroundPermissionsAsync();
      granted = requested.status === 'granted';
    }

    if (!granted) {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      gpsAccuracy: position.coords.accuracy ?? undefined,
    };
  } catch {
    return null;
  }
}
