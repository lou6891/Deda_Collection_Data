const { logger } = require('../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../.env"})

async function mongo_pull_daily_floor (address, client){
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

        const db_name_env = process.env.MONGO_COLLECTIONS_STATS_DB
        const database = await client.db(db_name_env)
        //const database = await client.db("Collections_stats_db")
        //const database = await client.db("Collections_stats_db_test")

        const transaction_db = await database.collection("recent_listings_stats_wb");
        const document = await transaction_db.findOne({
            "address" : address.toLowerCase(),
        })

        //await client.close()
        return document


    } catch (error) {
        logger.info("Mongo pull daily floor error: \n", error)
        return false
    }


}
exports.mongo_pull_daily_floor = mongo_pull_daily_floor