import * as Location from 'expo-location';

export type Coords = {
  lat: number;
  lng: number;
  gpsAccuracy?: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

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

    // Сначала берём последний известный фикс — он мгновенный.
    // Свежий фикс запрашиваем только если кэша нет, и то с таймаутом,
    // чтобы отметка точки не зависала на ожидании GPS в помещении.
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 300000 });
    const position =
      lastKnown ??
      (await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        5000,
      ));

    if (!position) {
      return null;
    }

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      gpsAccuracy: position.coords.accuracy ?? undefined,
    };
  } catch {
    return null;
  }
}
