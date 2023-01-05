const{logger} = require("../utils/logger")
const fetch = require("node-fetch");
const sdk = require('api')('@reservoirprotocol/v1.0#2fkbk3fl6e9wi9x');
require('dotenv').config({path: "../.env"})

const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 440, // pick a value that makes sense for your use case
});

const limited_reservoire_historical_data = limiter.wrap(reservoire_historical_data);
exports.limited_reservoire_historical_data = limited_reservoire_historical_data

async function reservoire_historical_data (address){

    const api_key = process.env.RESORVOIR
    try {
        let date = new Date()
        date.setUTCMinutes(0,0,0,)
        date = (date.getTime()/1000).toString()

        const url = "https://api.reservoir.tools/collections/daily-volumes/v1?id=" + address.toLowerCase() + "&startTimestamp=1577836800&endTimestamp=" + date

        const options = { method: 'GET',  headers: {Accept: '*/*', 'x-api-key': api_key} };

        const response = await fetch(url, options)
        const json = await response.json();

        return  json


    } catch (error) {
        logger.info("Error in reservoir historical data, error: \n", error)
        return false
    }
}

exports.reservoire_historical_data = reservoire_historical_data