const fetch = require('node-fetch');
require('dotenv').config({path: ".././.env"})
const {logger} = require("../utils/logger")
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
    minTime: 1200,
});

const limited_coingecko_get_simple_price = limiter.wrap(coingecko_get_simple_price);
exports.limited_coingecko_get_simple_price = limited_coingecko_get_simple_price

async function coingecko_get_simple_price (_id) {
    try {

        const options = {
            method: 'GET',
            redirect: 'follow'
        };

        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${_id}&vs_currencies=usd`;
        const response = await fetch(url, options)
        return await response.json();

    } catch (error) {
        logger.info("Coingecko get simple price error: \n",error)
        return false
    }
}
exports.coingecko_get_simple_price = coingecko_get_simple_price