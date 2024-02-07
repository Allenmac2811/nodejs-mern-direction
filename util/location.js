const { default: axios } = require("axios");
const HttpError = require("../Models/http-error");

const API_KEY = process.env.GOOGLE_API_KEY;

async function geoCoordinatesForAddress(address) {
  // return {
  //   lat: 40.7484405,
  //   lng: -73.9882393,
  // };
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${API_KEY}`
  );

  const data = response.data;

  if (!data || data.status === "ZERO_RESULTS") {
    const err = new HttpError("Could not find location for the address", 422);
    throw err;
  }
  //const coordinates = data.results[0].geometry.location;
  //console.log(data.results[0].formatted_address);
  return data;
}

module.exports = geoCoordinatesForAddress;
