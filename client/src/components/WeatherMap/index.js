import React, {
  useEffect,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { Map, TileLayer, AttributionControl, Marker } from "react-leaflet";
import PropTypes from "prop-types";
import { AppContext } from "~/AppContext";
import debounce from "debounce";
import styles from "./styles.css";

/**
 * Weather map
 *
 * @param {Object} props
 * @param {Number} props.zoom zoom level
 * @param {Boolean} [props.dark] dark mode
 * @returns {JSX.Element} Weather map
 */
const WeatherMap = ({ zoom, dark }) => {
  const MAP_CLICK_DEBOUNCE_TIME = 200; //ms
  const {
    setMapPosition,
    panToCoords,
    setPanToCoords,
    browserGeo,
    mapGeo,
    mapApiKey,
    getMapApiKey,
    weatherApiKey,
    markerIsVisible,
    animateWeatherMap,
  } = useContext(AppContext);
  const mapRef = useRef();

  const mapClickHandler = useCallback(
    debounce((e) => {
      const { lat: latitude, lng: longitude } = e.latlng;
      const newCoords = { latitude, longitude };
      setMapPosition(newCoords);
    }, MAP_CLICK_DEBOUNCE_TIME),
    [setMapPosition]
  );

  const [mapTimestamps, setMapTimestamps] = useState(null);
  const [mapTimestamp, setMapTimestamp] = useState(null);
  const [currentMapTimestampIdx, setCurrentMapTimestampIdx] = useState(0);

  const MAP_TIMESTAMP_REFRESH_FREQUENCY = 1000 * 60 * 10; //update every 10 minutes
  const MAP_CYCLE_RATE = 1000; //ms

  const getMapApiKeyCallback = useCallback(() => getMapApiKey(), [
    getMapApiKey,
  ]);

  useEffect(() => {
    getMapApiKeyCallback().catch((err) => {
      console.log("err!", err);
    });

    const updateTimeStamps = () => {
      getMapTimestamps()
        .then((res) => {
          setMapTimestamps(res);
        })
        .catch((err) => {
          console.log("err", err);
        });
    };

    const mapTimestampsInterval = setInterval(
      updateTimeStamps,
      MAP_TIMESTAMP_REFRESH_FREQUENCY
    );
    updateTimeStamps(); //initial update
    return () => {
      clearInterval(mapTimestampsInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pan the screen to a a specific location when `panToCoords` is updated with grid coordinates
  useEffect(() => {
    if (panToCoords && mapRef.current) {
      const { leafletElement } = mapRef.current;
      leafletElement.panTo([panToCoords.latitude, panToCoords.longitude]);
      setPanToCoords(null); //reset back to null so we can observe a change next time its fired for the same coords
    }
  }, [panToCoords, mapRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const { latitude, longitude } = browserGeo || {};

  useEffect(() => {
    if (mapTimestamps) {
      setMapTimestamp(mapTimestamps[currentMapTimestampIdx]);
    }
  }, [currentMapTimestampIdx, mapTimestamps]);

  // cycle through weather maps when animated is enabled
  useEffect(() => {
    if (mapTimestamps) {
      if (animateWeatherMap) {
        const interval = setInterval(() => {
          let nextIdx;
          if (currentMapTimestampIdx + 1 >= mapTimestamps.length) {
            nextIdx = 0;
          } else {
            nextIdx = currentMapTimestampIdx + 1;
          }
          setCurrentMapTimestampIdx(nextIdx);
        }, MAP_CYCLE_RATE);
        return () => {
          clearInterval(interval);
        };
      } else {
        setCurrentMapTimestampIdx(mapTimestamps.length - 1);
      }
    }
  }, [currentMapTimestampIdx, animateWeatherMap, mapTimestamps]);

  if (!hasVal(latitude) || !hasVal(longitude) || !zoom || !mapApiKey) {
    return (
      <div className={`${styles.noMap} ${dark ? styles.dark : styles.light}`}>
        <div>Cannot retrieve map data.</div>
        <div>Did you enter an API key?</div>
      </div>
    );
  }
  const markerPosition = mapGeo ? [mapGeo.latitude, mapGeo.longitude] : null;

  return (
    <Map
      ref={mapRef}
      center={[latitude, longitude]}
      zoom={zoom}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      touchZoom={true}
      dragging={true}
      fadeAnimation={false}
      onClick={mapClickHandler}
    >
      <AttributionControl position={"bottomleft"} />
      <TileLayer
        attribution='© <a href="https://www.mapbox.com/feedback/">Mapbox</a>'
        url={`https://api.mapbox.com/styles/v1/mapbox/${
          dark ? "dark-v10" : "light-v10"
        }/tiles/{z}/{x}/{y}?access_token={apiKey}`}
        apiKey={mapApiKey}
      />
      {mapTimestamp && weatherApiKey ? (
        <TileLayer
          attribution='&copy; <a href="https://www.tomorrow.io/weather-api">Tomorrow.io</a>'
          url={`https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/precipitationIntensity/${mapTimestamp}.png?apikey=${weatherApiKey}`}
          opacity={0.3}
          maxZoom={12}
          key={mapTimestamp}
        />
      ) : null}
      {markerIsVisible && markerPosition ? (
        <Marker position={markerPosition} opacity={0.65}></Marker>
      ) : null}
    </Map>
  );
};

WeatherMap.propTypes = {
  zoom: PropTypes.number.isRequired,
  dark: PropTypes.bool,
};

/**
 * Determines if truthy, but returns true for 0
 *
 * @param {*} i
 * @returns {Boolean} If truthy or zero
 */
function hasVal(i) {
  return !!(i || i === 0);
}

/**
 * Generate timestamps for weather map animation
 *
 * @param {Number} hoursBack number of hours to go back
 * @returns {Array} array of ISO timestamp strings
 */
function generateMapTimestamps(hoursBack = 6) {
  const timestamps = [];
  const now = new Date();
  now.setMinutes(0, 0, 0);

  for (let i = hoursBack; i >= 0; i--) {
    const ts = new Date(now.getTime() - i * 60 * 60 * 1000);
    timestamps.push(ts.toISOString());
  }
  return timestamps;
}

/**
 * Get timestamps for weather map
 *
 * @returns {Promise} Promise of timestamps
 */
function getMapTimestamps() {
  return Promise.resolve(generateMapTimestamps(6));
}

export default WeatherMap;
