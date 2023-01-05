const fetch = require('node-fetch');
require('dotenv').config({path: ".././.env"})
const {logger} = require("../utils/logger")
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
    minTime: 2640,
});

const limited_coingecko_get_historical_prices = limiter.wrap(coingecko_get_historical_prices);
exports.limited_coingecko_get_historical_prices = limited_coingecko_get_historical_prices

async function coingecko_get_historical_prices (_id, from_timestamp, to_timestamp) {
    try {
        from_timestamp = from_timestamp.getTime()/1000
        to_timestamp = to_timestamp.getTime()/1000

        const options = {
            method: 'GET',
            redirect: 'follow'
        };

        const url = `https://api.coingecko.com/api/v3/coins/${_id}/market_chart/range?vs_currency=usd&from=${from_timestamp}&to=${to_timestamp}`;

        const response = await fetch(url, options)

        return await response.json();

    } catch (error) {
        logger.info("Coingecko historical prices error: \n",error)
        return false
    }
}
exports.coingecko_get_historical_prices = coingecko_get_historical_prices