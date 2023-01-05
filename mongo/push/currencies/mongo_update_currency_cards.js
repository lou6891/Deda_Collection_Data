const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})

async function mongo_update_currency_cards (currency, c_obj, currency_info_result, client) {
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

        const test_txt = await database.collection("currencies_cards")

        await test_txt.updateOne(
            {
                "currency_name" : currency.currency_name,
                "currency_address" : currency.currency_address,
            },
            {
                $set : {
                    "coingecko_id" : c_obj.id,
                    "coingecko_symbol" : c_obj.symbol,
                    "coingecko_name" : c_obj.name,
                    "platforms" : currency_info_result.platforms,
                    "blockchain_websites" : currency_info_result.links.blockchain_site,
                    "images" : currency_info_result.image,
                }
            },
            {upsert : true})

        //await client.close()

        return true
    }
    catch (error) {
        logger.info("Mongo update currency card error: \n",error)
        return false
    }
}
exports.mongo_update_currency_cards = mongo_update_currency_cards
