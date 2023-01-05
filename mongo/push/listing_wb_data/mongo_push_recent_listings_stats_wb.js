const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})
const Bottleneck = require('bottleneck');
const {floor_thinness_and_wall} = require("../../../complementary_functions/service_complementary_functions/floor_thinness_and_wall")

let reference_date = null
async function mongo_push_recent_listings_stats_wb(collection_stats, client){
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

        const thinness_wall = await floor_thinness_and_wall(collection_stats)
        if (!thinness_wall) { throw new Error ("Error in thinness wall function")}

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

        let floor_thinness_array_txt = JSON.stringify(thinness_wall.floor_thinness_array)
        let floor_wall_array_txt = JSON.stringify(thinness_wall.floor_wall_array)

        //logger.info(thinness_wall.floor_thinness_array)
        //logger.info(thinness_wall.floor_wall_array)

        //await client.connect()

        let db_name_env = process.env.MONGO_COLLECTIONS_STATS_DB
        const database = await client.db(db_name_env)
        //const database = await client.db("Collections_stats_db")
        //const database = await client.db("Collections_stats_db_test")


        const floor_stats_db = await database.collection("recent_listings_stats_wb");

        const document = await floor_stats_db.updateOne(
            {
                "address" : collection_stats.address.toLowerCase(),
            },
            {
                $min : { "from_date" : from_date, },
                $max : { "to_date" : current_date, },
                $set : {
                    "floor_thinness_array_txt": floor_thinness_array_txt,
                    "floor_wall_array_txt": floor_wall_array_txt,
                },
                $push : {
                    "data" : {
                    $each : [full_hourly_object],
                    $slice : 180},
                }
            },
            {upsert : true}
        )

        //--------------------------------------------------------------------------------------------------------------
        // save the floor wall on a different db for historical comparison
        let floor_wall_daily_obj = {
            timestamp : current_date,
            floor_thinness_array_txt : floor_thinness_array_txt,
            floor_wall_array_txt : floor_wall_array_txt,
        }

        db_name_env = process.env.MONGO_WALL_DATABASE
        const floor_wall_db = await database.collection(db_name_env)

        if (reference_date === null && current_date.getUTCHours() === 0){
            reference_date = new Date()
            reference_date.setUTCMinutes(0,0,0)


            const document = await floor_wall_db.updateOne(
                {
                    "address" : collection_stats.address.toLowerCase(),
                },
                {
                    $set : {
                        "from_date" : from_date,
                        "to_date" : current_date,
                    },
                    $addToSet : {"data" : floor_wall_daily_obj }
                },
                {upsert : true}
            )
        } else if (reference_date !== null && current_date.getUTCHours() === 0 && (current_date.getTime() === (reference_date.getTime() + 86400000))){
            reference_date = new Date()
            reference_date.setUTCMinutes(0,0,0)


            const document = await floor_wall_db.updateOne(
                {
                    "address" : collection_stats.address.toLowerCase(),
                },
                {
                    $set : {"to_date" : current_date },
                    $addToSet : {"data" : floor_wall_daily_obj }
                },
                {upsert : true}
            )
        }


        //await client.close()
        return true
    }
    catch (error) {
        logger.info("Mongo Push recent listing stats wb: \n", error)
        return false
    }
}
exports.mongo_push_recent_listings_stats_wb = mongo_push_recent_listings_stats_wb

/*
"opensea_floor_price_eth" : collection_stats.opensea_floor_price_eth,
                    "opensea_floor_price_usd" : collection_stats.opensea_floor_price_usd,
                    "looksrare_floor_price_eth" : collection_stats.looksrare_floor_price_eth,
                    "looksrare_floor_price_usd" : collection_stats.looksrare_floor_price_usd,
                    "x2y2_floor_price_eth" : collection_stats.x2y2_floor_price_eth,
                    "x2y2_floor_price_usd" : collection_stats.x2y2_floor_price_usd,
 */