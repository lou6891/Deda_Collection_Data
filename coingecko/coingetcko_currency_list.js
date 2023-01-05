const fetch = require('node-fetch');
require('dotenv').config({path: ".././.env"})
const {logger} = require("../utils/logger")
const Bottleneck = require('bottleneck');

/*
const limiter = new Bottleneck({
    minTime: 200,
});

const limited_alchemy_get_floor = limiter.wrap();
exports.limited_alchemy_get_floor = limited_alchemy_get_floor

 */

async function coingecko_currency_list () {
    try {

        const options = {
            method: 'GET',
            redirect: 'follow'
        };

        const baseURL = `https://api.coingecko.com/api/v3/coins/list?include_platform=true`;
        const url = `${baseURL}`;

        const response = await fetch(url, options)
        return await response.json();

    } catch (error) {
        logger.info("Coingecko currency list error: \n",error)
        return false
    }
}
exports.coingecko_currency_list = coingecko_currency_list