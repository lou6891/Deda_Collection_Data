const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})

async function mongo_push_currency_prices (currency ,prices_array, client) {
    /*
    const client = new MongoClient(uri,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverApi: ServerApiVersion.v1
        });

     */
    try {
        //await client.connect()

        const database = await client.db("Currencies_db")
        //const database = await client.db("Currencies_db_test")


        const test_txt = await database.collection("currencies_prices")

        await test_txt.updateOne(
            {
                "coingecko_id" : currency.coingecko_id,
                "coingecko_symbol" : currency.coingecko_symbol,
                "coingecko_name" : currency.coingecko_name,
                "currency_address" : currency.currency_address,
            },
            {
                $addToSet : { "price_array": {$each: [...prices_array]}}
            },
            {upsert : true})

        //await client.close()

        return true
    }
    catch (error) {
        logger.info("Mongo push currency prices error: \n",error)
        return false
    }
}
exports.mongo_push_currency_prices = mongo_push_currency_prices
