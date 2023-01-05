const fetch = require('node-fetch');
require('dotenv').config({path: ".././.env"})
const {logger} = require("../utils/logger")
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
    minTime: 390,
});

const limited_alchemy_get_floor = limiter.wrap(alchemy_get_floor);
exports.limited_alchemy_get_floor = limited_alchemy_get_floor

async function alchemy_get_floor(collection_address) {
    try {

        const options = {
            method: 'GET',
            redirect: 'follow'
        };

        const apiKey = process.env.ALCHEMY_KEY
        //logger.info(apiKey)
        const baseURL = `https://eth-mainnet.alchemyapi.io/nft/v2/${apiKey}/getFloorPrice?contractAddress=`;
        const url = `${baseURL}${collection_address}`;

        const response = await fetch(url, options)
        const json = await response.json();

        return json


    } catch (error) {
        logger.info("Alchemy get floor error: ",error)
        return false
    }
}
exports.alchemy_get_floor = alchemy_get_floor