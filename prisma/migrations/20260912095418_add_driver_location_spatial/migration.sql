CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "DriverLocation"
ADD COLUMN "location" geography(Point, 4326);
