const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})
const Bottleneck = require('bottleneck');

async function mongo_update_historical_listings_data (collection, historical_data, client){

    try {
        /*
        const client = new MongoClient(uri,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverApi: ServerApiVersion.v1
            });

         */

        //await client.connect()
        const db_name_env = process.env.MONGO_COLLECTIONS_STATS_DB
        const database = await client.db(db_name_env)
        //const database = await client.db("Collections_stats_db")
        //const database = await client.db("Collections_stats_db_test")


        const floor_stats_db = await database.collection("historical_listings_stats");

        const document = await floor_stats_db.updateOne(
            {
                "address" : collection.address.toLowerCase(),
            },
            {
                push : {"data" : {
                    $each : [...historical_data],
                        $position : 0,
                    }}
            },
            {upsert : false}
        )

        //await client.close()
        return true
    }
    catch (error) {
        logger.info("Mongo Push daily historical data error : \n", error)
        return false
    }
}
exports.mongo_push_daily_historical_data = mongo_update_historical_listings_data