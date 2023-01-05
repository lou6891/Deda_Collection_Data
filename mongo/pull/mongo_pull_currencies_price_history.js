const { logger } = require('../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../.env"})

async function mongo_pull_currencies_price_history (currency, client) {
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

        const currencies_db = await database.collection("currencies_prices");
        const document = await currencies_db.findOne({
            "currency_address" : currency.currency_address,
        })

        //await client.close()
        return document


    } catch (error) {
        logger.info("Error wih mongo pull currency price: \n", error)
        return false
    }


}
exports.mongo_pull_currencies_price_history = mongo_pull_currencies_price_history