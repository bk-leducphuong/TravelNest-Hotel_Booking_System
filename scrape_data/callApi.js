const { getJson } = require("serpapi");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const MAX_DATA_LIMIT = 40; // You can ajust as needed

let count = 0;
let index = 1;

/************************** caculate date **************************/
const today = new Date();

const currentDate = today.toISOString().split("T")[0]; // ISO format yy-mm-dd

const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

const tomorrowDate = tomorrow.toISOString().split("T")[0];

/************************** call api *******************************/

// Initial request to retrieve hotel data and save to file
getJson(
  {
    engine: "google_hotels",
    check_in_date: currentDate,
    check_out_date: tomorrowDate,
    q: process.env.LOCATION,
    currency: "VND",
    adults: "2",
    gl: "vn",
    hl: "vi",
    api_key: process.env.API_KEY,
  },
  (json) => {
    saveDataToFile(
      path.join(__dirname, `data/all_hotels[${index}].json`),
      json,
    );

    count += 20;
    index++;

    if (json.serpapi_pagination && json.serpapi_pagination.next) {
      callTheNextApi(json.serpapi_pagination.next);
    }
  },
);

// Function to call API for the next batch of data
async function callTheNextApi(api) {
  if (count >= MAX_DATA_LIMIT) return;

  try {
    const response = await axios.get(api, {
      headers: {
        Cookie: process.env.COOKIE_1,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "application/json",
      },
    });

    saveDataToFile(
      path.join(__dirname, `data/all_hotels[${index}].json`),
      response.data,
    );

    // create a new folder for storing hotel json files
    const dirPath = path.join(
      __dirname,
      "data/hotels",
      `${process.env.LOCATION}`,
    );
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // filters out hotels in json file
    for (const item of response.data.properties) {
      if (item.type === "hotel") {
        try {
          const hotelDetail = await axios.get(
            item.serpapi_property_details_link,
            {
              headers: {
                Cookie: process.env.COOKIE_2,
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                Accept: "application/json",
              },
            },
          );

          saveDataToFile(
            path.join(
              __dirname,
              `data/hotels/${process.env.LOCATION}/${item.name}.json`,
            ),
            hotelDetail.data,
          );
        } catch (err) {
          console.error(
            `Error retrieving hotel details for ${item.name}:`,
            err,
          );
        }
      }
    }

    count += 20;
    index++;

    if (
      response.data.serpapi_pagination &&
      response.data.serpapi_pagination.next
    ) {
      await callTheNextApi(response.data.serpapi_pagination.next);
    }
  } catch (err) {
    console.error("Error in callTheNextApi:", err);
  }
}

// Utility function to save data to a file
function saveDataToFile(filePath, data) {
  fs.writeFile(filePath, JSON.stringify(data), (err) => {
    if (err) {
      console.error("An error occurred while writing JSON to the file:", err);
    } else {
      console.log(`JSON file has been saved successfully at ${filePath}`);
    }
  });
}
