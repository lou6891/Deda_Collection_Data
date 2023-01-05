const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})

async function mongo_push_currency_card (currency) {

    try {
        const uri = process.env.MONGO_DB_URL;
        const client = new MongoClient(uri,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverApi: ServerApiVersion.v1
            });

        await client.connect()

        const database = await client.db("Currencies_db")
        //const database = await client.db("Currencies_db_test")

        const test_txt = await database.collection("currencies_cards")

        await test_txt.updateOne(
            {
                "currency_name" : currency.currency_name,
                "currency_address" : currency.currency_address,
                "symbol" : currency.symbol,
            },
            {
                $set : {
                    "gwei_converter" : currency.gwei_converter,
                    "chain" : currency.chain,
                }
            },
            {upsert : true})

        await client.close()

        return true
    }
    catch (error) {
        logger.info("Mongo push currency card error: \n",error)
        return false
    }
}
exports.mongo_push_currency_card = mongo_push_currency_card
