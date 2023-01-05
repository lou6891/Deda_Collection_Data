const fetch = require('node-fetch');
require('dotenv').config({path: ".././.env"})
const {logger} = require("../utils/logger")
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
    minTime: 2000,
});

const limited_coingecko_get_currency_info = limiter.wrap(coingecko_get_currency_info);
exports.limited_coingecko_get_currency_info = limited_coingecko_get_currency_info

async function coingecko_get_currency_info (_id) {
    try {

        const options = {
            method: 'GET',
            redirect: 'follow'
        };

        const url = `https://api.coingecko.com/api/v3/coins/${_id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
        const response = await fetch(url, options)

        return await response.json();

    } catch (error) {
        logger.info("Coingecko currency info error: \n",error)
        return false
    }
}
exports.coingecko_get_currency_info = coingecko_get_currency_info