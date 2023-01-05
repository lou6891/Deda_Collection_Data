const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})
const Bottleneck = require('bottleneck');

async function mongo_push_historical_listings_stats_wb(collection_stats, client){
    /*
    const client = new MongoClient(uri,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverApi: ServerApiVersion.v1
        });

     */

    try {

        const from_date = new Date()
        from_date.setUTCMinutes(0,0,0)
        const current_date = new Date()
        current_date.setUTCMinutes(0,0,0)


        // Object that will be transformed into text for storage
        let data_hourly_object = {
            lowest_floor_price_usd: collection_stats.lowest_floor_price_usd,
            lowest_floor_price_eth: collection_stats.lowest_floor_price_eth,
            avg_floor_price_eth: collection_stats.avg_floor_price_eth,
            avg_floor_price_usd: collection_stats.avg_floor_price_usd,
            opensea_floor_price_eth: collection_stats.opensea_floor_price_eth,
            opensea_floor_price_usd: collection_stats.opensea_floor_price_usd,
            looksrare_floor_price_eth: collection_stats.looksrare_floor_price_eth,
            looksrare_floor_price_usd: collection_stats.looksrare_floor_price_usd,
            x2y2_floor_price_eth: collection_stats.x2y2_floor_price_eth,
            x2y2_floor_price_usd: collection_stats.x2y2_floor_price_usd,
            number_of_listings : collection_stats.number_of_listings,
            avg_listing_time_days: collection_stats.avg_listing_time_days,
            currency : collection_stats.currency,
        }

        // Object actually stored into the db
        let full_hourly_object = {
            timestamp : current_date,
            data : JSON.stringify(data_hourly_object),
        }


        //await client.connect()

        const db_name_env = process.env.MONGO_COLLECTIONS_STATS_DB
        const database = await client.db(db_name_env)
        //const database = await client.db("Collections_stats_db")
        //const database = await client.db("Collections_stats_db_test")


        const floor_stats_db = await database.collection("historical_listings_stats_wb");

        if(current_date.getUTCHours() === 0){
            const document = await floor_stats_db.updateOne(
                {
                    "address" : collection_stats.address.toLowerCase(),
                },
                {
                    $min : { "from_date" : from_date, },
                    $max : { "to_date" : current_date, },
                    $set : { "latest_data" : full_hourly_object },
                    $addToSet : { "data" : full_hourly_object },
                },
                {upsert : true}
            )
        }
        else if (current_date.getUTCHours() !== 0){
            const document = await floor_stats_db.updateOne(
                {
                    "address" : collection_stats.address.toLowerCase(),
                },
                {
                    $min : { "from_date" : from_date, },
                    $max : { "to_date" : current_date, },
                    $set : { "latest_data" : full_hourly_object },
                },
                {upsert : true}
            )
        }



        //await client.close()
        return true
    }
    catch (error) {
        logger.info("Mongo Push daily floor historical listing stats wb: \n", error)
        return false
    }
}
exports.mongo_push_historical_listings_stats_wb = mongo_push_historical_listings_stats_wb