// This function will get all the currencies cards from the db and
// update the cards in order to keep track of price movement and allow conversions
const {logger} = require("../utils/logger")
const { MongoClient, ServerApiVersion } = require('mongodb');
const {coingecko_currency_list} = require("../coingecko/coingetcko_currency_list")
const {limited_coingecko_get_currency_info} = require("../coingecko/coingetcko_get_currency_info")
const {coingecko_get_historical_prices, limited_coingecko_get_historical_prices} = require("../coingecko/coingetcko_get_historical_prices")
const {limited_coingecko_get_simple_price} = require("../coingecko/coingetcko_get_simple_price")
const {mongo_push_currency_prices} = require("../mongo/push/currencies/monog_push_currency_prices")
const {mongo_update_currency_cards} = require("../mongo/push/currencies/mongo_update_currency_cards")
const {mongo_pull_currencies_price_history} = require("../mongo/pull/mongo_pull_currencies_price_history")
const {mongo_pull_coingecko_list} = require("../mongo/pull/mongo_pull_coingecko_list")
require('dotenv').config({path: "../.././.env"})

async function currencies_data_analyzer(currencies_cards_array, currencies_prices_array, retry_counter, max_retry_number){

    try{
        const current_date = new Date()
        current_date.setUTCMinutes(0,0,0)

        logger.info("currencies data analyzer has started")
        const initial_currencies_data_analyzer_date = new Date()

        // SAVES ANY ADDRESS THAT CREATED AN ERROR
        const error_array_address = []

        const uri = process.env.MONGO_DB_URL;
        const client = new MongoClient(uri,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverApi: ServerApiVersion.v1
            });

        await client.connect()

        // Download the currency list from coingecko so that if needed it can be used to update the cards
        //const coingecko_currency_array = await coingecko_currency_list()
        //if (!coingecko_currency_array) {throw new Error("Coingecko currency list error")}
        // instead of downloading it each time, now it's store in the db
        const coingecko_currency_array = await mongo_pull_coingecko_list()
        if (!coingecko_currency_array) {throw new Error("Coingecko currency list error")}

        //logger.info(currencies_cards_array)
        // 1. Map currency array
        // 2. Check if the currency has already a doc in the db
        // 2A IF YES:  just find the last price
        // 2B  IF NO: Find the coingecko id, update the currency map, then Find the historical data and the last price

        for await (let currency of currencies_cards_array) {

            try {
                //logger.info(currency)

                //array in which the prices from coingecko will be stored
                let prices_array = []

                const currency_history = await mongo_pull_currencies_price_history(currency, client)
                // null = mongo hasn't found any document with matching the currency address
                if (currency_history === null) {
                    // Map the coingecko currency list to find the id and name
                    for (let c_obj of coingecko_currency_array) {
                        //await coingecko_currency_array.map(async (c_obj) => {
                        // Fists find the one with a symbol matching the one in the currency cards
                        if (currency.symbol.toLowerCase() == c_obj.symbol.toLowerCase()) {
                            //logger.info(c_obj)
                            // Then check that the eth address is the same, for ethereum there is a special case
                            if ((currency.chain && c_obj.platforms[currency.chain.toLowerCase()]
                                    && c_obj.platforms[currency.chain.toLowerCase()].toLowerCase() === currency.currency_address.toLowerCase())
                                || (currency.currency_name === "Ethereum" && currency.currency_name === c_obj.name)) {
                                //logger.info("c_obj",c_obj)

                                // Call  coingecko to get more info about the coin, from the dsplay image to other elements
                                const currency_info_result = await limited_coingecko_get_currency_info(c_obj.id)
                                if (!currency_info_result) {
                                    throw new Error("Coingecko currency info error")
                                }

                                // Then update the currency card to include the coingecko id, symbol and name
                                const update_currency_card_result = await mongo_update_currency_cards(currency, c_obj, currency_info_result, client)
                                if (!update_currency_card_result) {
                                    throw new Error("Mongo update currency card error")
                                }

                                // Since currency_info_result also provides the latest market price, we also push that into the prices array
                                let date_price_object = {
                                    date: current_date,
                                    price_usd: currency_info_result["market_data"]["current_price"]["usd"]
                                    //currency_info_result.market_data.current_price.usd
                                }
                                prices_array.push(date_price_object)

                                //Timestamp that manages the dates in the loop
                                let to_timestamp = new Date()
                                to_timestamp.setUTCMinutes(0, 0, 0)
                                // Loop that gets the historical prices up to 2 years---------------------------------------
                                while (to_timestamp.getUTCFullYear() >= 2020) {
                                    //logger.info(to_timestamp.getUTCFullYear())
                                    let temporary_price_array = []

                                    let from_timestamp = new Date(to_timestamp.toString())
                                    from_timestamp.setUTCDate(from_timestamp.getUTCDate() - (90))
                                    from_timestamp.setUTCMinutes(0, 0, 0,)

                                    const coingecko_historical_prices_result = await limited_coingecko_get_historical_prices(c_obj.id, from_timestamp, to_timestamp)
                                    if (!coingecko_historical_prices_result) {
                                        throw new Error("Coingecko historical prices error")
                                    }

                                    await coingecko_historical_prices_result.prices.map((price_obj) => {
                                        const raw_date =new Date(price_obj[0])
                                        raw_date.setUTCMinutes(0,0,0)
                                        let date_price_object = {
                                            date: raw_date,
                                            price_usd: price_obj[1]
                                        }
                                        temporary_price_array.push(date_price_object)
                                    })
                                    // the push the temporary price array into the main price array,
                                    // this is done cause the prices are from in ascending order, while the loop goes in descending order
                                    prices_array.unshift(...temporary_price_array)


                                    // If the array is less than 2160 it means the next call will be useless
                                    if (coingecko_historical_prices_result.prices.length < (2000)) {
                                        //logger.info("break in action",coingecko_historical_prices_result.prices.length )
                                        break;
                                    }
                                    //logger.info("to date: ", to_timestamp ,"from date: ", from_timestamp )
                                    to_timestamp = new Date(from_timestamp.toString())
                                    to_timestamp.setUTCDate(to_timestamp.getUTCDate())
                                }
                                //logger.info("hello 1")

                                //logger.info(prices_array)
                                //logger.info(prices_array[0])
                                //logger.info(prices_array[prices_array.length-1])

                                // Save the price array to the db ----------------------------------------------------------
                                currency.coingecko_id = c_obj.id
                                currency.coingecko_symbol = c_obj.symbol
                                currency.coingecko_name = c_obj.name
                                const push_currency_prices_result = await mongo_push_currency_prices(currency, prices_array, client)
                                if (!push_currency_prices_result) { throw new Error("Mongo push currency prices error") }

                                // Ads the latest price to currencies_prices_array
                                let currencies_prices_array_object = {
                                    currency_symbol: currency.symbol,
                                    price_usd: currency_info_result["market_data"]["current_price"]["usd"]
                                        //.market_data.current_price.usd
                                }
                                await currencies_prices_array.push(currencies_prices_array_object)
                            }
                        }
                        //})
                    }
                }

                // if there is already a history in the db, just find the new price
                else if (currency_history) {
                    const simple_price_result = await limited_coingecko_get_simple_price(currency.coingecko_id)
                    if (!simple_price_result) {
                        throw new Error("Coingecko get simple price error")
                    }
                    //add the data to prices array
                    let date_price_object = {
                        date: current_date,
                        price_usd: simple_price_result[currency.coingecko_id].usd
                    }
                    prices_array.push(date_price_object)

                    // update the mongo db
                    const push_currency_prices_result = await mongo_push_currency_prices(currency, prices_array, client)
                    if (!push_currency_prices_result) {
                        throw new Error("Mongo push currency prices error")
                    }

                    // Ads the latest price to currencies_prices_array
                    let currencies_prices_array_object = {
                        currency_symbol: currency.symbol,
                        price_usd: simple_price_result[currency.coingecko_id].usd
                    }
                    await currencies_prices_array.push(currencies_prices_array_object)

                    //logger.info(currencies_prices_array,)
                }
            } catch (error) {
                logger.info("Error with currency", currency.currency_name, "error: ", error)
                error_array_address.push(currency)
            }

        }

        await client.close()

        const ending_currencies_data_analyzer_date = new Date()
        logger.info("currencies data analyzer has finished \n Time taken (minutes): ",
                ((ending_currencies_data_analyzer_date - initial_currencies_data_analyzer_date)/(1000*60)))

        if(error_array_address.length !== 0 && retry_counter < max_retry_number){
            await currencies_data_analyzer(error_array_address, currencies_prices_array,retry_counter, max_retry_number)
            retry_counter ++
        }
        else{logger.info("No errors in currency data analyzer")}

        let eth_price = null;
        for (let object of currencies_prices_array){
            if (object.currency_symbol === "ETH"){
                eth_price = object.price_usd
            }
        }

        return {
            currencies_prices_array : currencies_prices_array,
            eth_price : eth_price
        }
    }
    catch (error) {
        logger.info(error)
        return false
    }


}
exports.currencies_data_analyzer = currencies_data_analyzer
