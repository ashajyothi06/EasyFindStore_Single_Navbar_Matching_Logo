import { useCallback, useState } from "react";
import { setCurrentLocation } from "../lib/api";
import type { ShopLocation } from "../types/storefront";

interface UseCurrentLocationResult {
  loading: boolean;
  error: string;
  requestCurrentLocation: () => Promise<ShopLocation>;
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Allow location access and try again.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your current position is unavailable.";
  }
  if (error.code === error.TIMEOUT) {
    return "The location request timed out.";
  }
  return "Unable to read your current location.";
}

function getBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 0,
    });
  });
}

export function useCurrentLocation(): UseCurrentLocationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestCurrentLocation = useCallback(async () => {
    setError("");

    if (!navigator.geolocation) {
      const message = "This browser does not support geolocation.";
      setError(message);
      throw new Error(message);
    }

    const secureContextAvailable =
      window.isSecureContext ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!secureContextAvailable) {
      const message = "Current location requires HTTPS or localhost.";
      setError(message);
      throw new Error(message);
    }

    setLoading(true);
    try {
      const position = await getBrowserPosition();
      return await setCurrentLocation({
        latitude: Number(position.coords.latitude.toFixed(7)),
        longitude: Number(position.coords.longitude.toFixed(7)),
        name: "Current location",
      });
    } catch (unknownError) {
      const geolocationError = unknownError as Partial<GeolocationPositionError>;
      const message =
        typeof geolocationError?.code === "number"
          ? geolocationErrorMessage(geolocationError as GeolocationPositionError)
          : unknownError instanceof Error
            ? unknownError.message
            : "Unable to save your current location.";
      setError(message);
      throw new Error(message, { cause: unknownError });
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, requestCurrentLocation };
}
