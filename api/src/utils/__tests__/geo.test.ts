import { describe, expect, it } from "vitest";
import { getDistanceFromLatLonInKm, getDistanceKm } from "@/utils/geo";

describe("Geo Utils", () => {
  describe("getDistanceKm", () => {
    it("should return the distance when value ends with km", () => {
      expect(getDistanceKm("25km")).toBe(25);
    });

    it("should convert meters to kilometers", () => {
      expect(getDistanceKm("10000m")).toBe(10);
    });

    it("should return the distance when no unit is specified (defaulting to km)", () => {
      expect(getDistanceKm("15")).toBe(15);
    });

    it("should return 50 as default for invalid string", () => {
      expect(getDistanceKm("invalid")).toBe(50);
    });

    it("should correctly handle zero distance in meters", () => {
      expect(getDistanceKm("0m")).toBe(0);
    });

    it("should handle empty string", () => {
      expect(getDistanceKm("")).toBe(50);
    });
  });

  describe("getDistanceFromLatLonInKm", () => {
    it("should return undefined if any coordinate is missing", () => {
      expect(getDistanceFromLatLonInKm(48.8566, 2.3522, 45.764)).toBeUndefined();
      expect(getDistanceFromLatLonInKm(48.8566, 2.3522)).toBeUndefined();
      expect(getDistanceFromLatLonInKm(48.8566)).toBeUndefined();
      expect(getDistanceFromLatLonInKm()).toBeUndefined();
    });

    it("should calculate the correct distance between two points", () => {
      // Paris to Lyon
      const lat1 = 48.8566;
      const lon1 = 2.3522;
      const lat2 = 45.764;
      const lon2 = 4.8357;
      const distance = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
      // The actual distance is ~391.5 km
      expect(distance).toBeCloseTo(391.5, 1);
    });

    it("should return 0 when the coordinates are the same", () => {
      const lat = 48.8566;
      const lon = 2.3522;
      const distance = getDistanceFromLatLonInKm(lat, lon, lat, lon);
      expect(distance).toBe(0);
    });

    it("should handle zero values for coordinates", () => {
      const distance = getDistanceFromLatLonInKm(0, 0, 0, 0);
      expect(distance).toBe(0);
    });
  });
});
