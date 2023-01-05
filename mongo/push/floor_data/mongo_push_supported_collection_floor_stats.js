const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
    minTime: 370,
});

const limited_mongo_push_collection_floor_stats = limiter.wrap(mongo_push_supported_collection_floor_stats);
exports.mongo_push_collection_floor_stats = limited_mongo_push_collection_floor_stats

async function mongo_push_supported_collection_floor_stats (collection_stats, client){

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
        from_date.setUTCHours(0,0,0,0,)
        const to_date = new Date()
        to_date.setUTCHours(23,59,59,999)


        //await client.connect()
        const db_name_env = process.env.MONGO_COLLECTIONS_STATS_DB
        const database = await client.db(db_name_env)

        //const database = await client.db("Collections_stats_db")
        //const database = await client.db("Collections_stats_db_test")

        const collection_stats_db = await database.collection("daily_listing_data");

        const current_date = new Date()
        current_date.setUTCMinutes(0,0,0)

        let floor_object = {timestamp : current_date, opensea_floor_price_eth : collection_stats.opensea_floor_price_eth, looksrare_floor_price_eth: collection_stats.looksrare_floor_price_eth, x2y2_floor_price: collection_stats.x2y2_floor_price_eth, number_of_listings :  collection_stats.number_of_listings }
        let listings_array_txt = JSON.stringify(collection_stats.listings)


        const document = await collection_stats_db.updateOne({
                    "from_date" : from_date,
                    "to_date" : to_date,
                    "address" : collection_stats.address.toLowerCase(),
            },
            {
                    $set : {
                        "currency" : collection_stats.currency,
                        "opensea_floor_price_eth" : collection_stats.opensea_floor_price_eth,
                        "looksrare_floor_price_eth" : collection_stats.looksrare_floor_price_eth,
                        "x2y2_floor_price_eth" : collection_stats.x2y2_floor_price_eth,
                        "lowest_floor_price_eth" : collection_stats.lowest_floor_price_eth,

                        "number_of_listings" : collection_stats.number_of_listings,
                        "avg_listing_time_days" : collection_stats.avg_listing_time_days,

                        "listings_array_txt": listings_array_txt,
                    },
                    $addToSet : {"floor_prices_array" : floor_object },
            },
            {upsert : true})

        //await client.close()
        return true
    }
    catch (error) {
        logger.info("Mongo Push daily listing stat: \n",error)
        return false
    }
}
exports.mongo_push_supported_collection_floor_stats = mongo_push_supported_collection_floor_stats
