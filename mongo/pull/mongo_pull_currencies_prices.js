const { logger } = require('../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../.env"})

async function mongo_pull_currencies_prices (currency_address, coingecko_symbol, client){

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

        const db_name_env = process.env.MONGO_CURRENCIES_DB
        const database = await client.db(db_name_env)
        //const database = await client.db("Currencies_db")
        //const database = await client.db("Currencies_db_test")

        const currencies_prices = await database.collection("currencies_prices");
        const document = await currencies_prices.findOne({
            "currency_address" : currency_address,
            "coingecko_symbol" : coingecko_symbol,
        })

        //await client.close()
        return document


    } catch (error) {
        logger.info("Error wih mongo pull currency prices: \n", error)
        return false
    }


}
exports.mongo_pull_currencies_prices = mongo_pull_currencies_prices