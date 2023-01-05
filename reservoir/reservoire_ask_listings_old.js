require('dotenv').config({path: "../.env"})
const{logger} = require("../utils/logger")
const fetch = require("node-fetch");
const sdk = require('api')('@reservoirprotocol/v1.0#2fkbk3fl6e9wi9x');

const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
    maxConcurrent: 5,
    minTime: 350, // pick a value that makes sense for your use case
});

const limited_reservoir_ask_listings_old = limiter.wrap(reservoir_ask_listings);
exports.limited_reservoir_ask_listings_old = limited_reservoir_ask_listings_old

async function reservoir_ask_listings (address, continuation){

    const api_key = process.env.RESORVOIR
    let data_tracker = null
    try {

        const initial_url = 'https://api.reservoir.tools/tokens/bootstrap/v1?contract=' + address.toLowerCase() + "&"
        const final_url = '&limit=500'
        let url = null

        if(continuation){
            let middle_url = "&continuation=" + continuation.toString() + "&"
            url = initial_url + middle_url + final_url;
        }
        else {
            url = initial_url + final_url;
        }

        const options = { method: 'GET',  headers: {Accept: '*/*', 'x-api-key': api_key} };

        const response = await fetch(url, options)
        const json = await response.json();
        data_tracker = json
        //logger.info(json.continuation)
        //logger.info(json.tokens.length)
        return  json


    } catch (error) {
        logger.info("Error in reservoir ask listings, data returned: \n", data_tracker)
        logger.info("Error type: \n",error)
        return false
    }

}
//reservoir_ask_listings("0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e", "NTk5OTAwMDAwMDAwMDAwMDAwMDBfNzAxOA==")
exports.reservoir_ask_listings = reservoir_ask_listings

