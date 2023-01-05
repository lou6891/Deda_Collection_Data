const{logger} = require("../utils/logger")
const fetch = require("node-fetch");
const sdk = require('api')('@reservoirprotocol/v1.0#2fkbk3fl6e9wi9x');
require('dotenv').config({path: "../.env"})

const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 390, // pick a value that makes sense for your use case
});

const limited_reservoire_collection_description = limiter.wrap(reservoire_collection_description);
exports.limited_reservoire_collection_description = limited_reservoire_collection_description

async function reservoire_collection_description (address){

    const api_key = process.env.RESORVOIR
    let data_tracker = null
    try {

        //const url = "https://api.reservoir.tools/collection/v3?id=" + address.toLowerCase() + "&includeTopBid=false"
        const url = "https://api.reservoir.tools/collections/v5?contract=" + address.toLowerCase() + "&includeTopBid=false&sortBy=allTimeVolume&limit=20"

        const options = { method: 'GET',  headers: {Accept: '*/*', 'x-api-key': api_key} };

        const response = await fetch(url, options)
        const json = await response.json();
        data_tracker = json

        //return json

        return json.collections


    } catch (error) {
        logger.info("Error in reservoir historical data, data returned: \n", data_tracker)
        logger.info("Error type: \n",error)
        return false
    }

}

exports.reservoire_collection_description = reservoire_collection_description
