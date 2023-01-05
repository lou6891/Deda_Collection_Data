const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})
const Bottleneck = require('bottleneck');

let reference_date = null
async function mongo_push_historical_owners_stats_wb(collection_stats, client){
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
            total_n_owners : collection_stats.total_n_owners,
            n_unique_owners : collection_stats.n_unique_owners,
            top_holders_balance : collection_stats.top_holders_balance,
            number_top_holders_analyzed : collection_stats.number_top_holders_analyzed,
        }

        // Object actually stored into the db
        let full_hourly_object = {
            timestamp : current_date,
            data_hourly_object_txt : JSON.stringify(data_hourly_object),
        }

        const older_balance_obj = {
            timestamp : current_date,
            holders_balance_array_txt : JSON.stringify(collection_stats.holders_balance_array)
        }
        const holders_balance_array_txt = JSON.stringify(collection_stats.holders_balance_array)

        //await client.connect()

        const db_name_env = process.env.MONGO_COLLECTIONS_STATS_DB
        const database = await client.db(db_name_env)
        //const database = await client.db("Collections_stats_db")
        //const database = await client.db("Collections_stats_db_test")

        const owners_stats_db = await database.collection("historical_owners_stats_wb");
        if(current_date.getUTCHours() === 0){
            const document = await owners_stats_db.updateOne(
                {
                    "address" : collection_stats.address.toLowerCase(),
                },
                {
                    $min : { "from_date" : from_date, },
                    $max : { "to_date" : current_date, },
                    $set : {
                        "latest_data" : full_hourly_object,
                        "holders_balance_array_txt" : holders_balance_array_txt,
                    },
                    $addToSet : {
                        "data" : full_hourly_object,

                    },
                },
                {upsert : true}
            )
        }
        else if(current_date.getUTCHours() !== 0){
            const document = await owners_stats_db.updateOne(
                {
                    "address" : collection_stats.address.toLowerCase(),
                },
                {
                    $min : { "from_date" : from_date, },
                    $max : { "to_date" : current_date, },
                    $set : {
                        "latest_data" : full_hourly_object,
                    },
                },
                {upsert : true}
            )
        }


        //await client.close()
        return true
    }
    catch (error) {
        logger.info("Mongo Push historical owners stats: \n", error)
        return false
    }
}
exports.mongo_push_historical_owners_stats_wb = mongo_push_historical_owners_stats_wb


/*
        // save the holder balance graph on a different db for historical comparison
        let holders_balance_daily_obj = {
            timestamp : current_date,
            holders_balance_graph_txt : JSON.stringify(processed_holders_balance_graph),
        }
        if (reference_date === null && current_date.getUTCHours() === 0){
            reference_date = new Date()
            reference_date.setUTCMinutes(0,0,0)

            const holders_balance_daily_db = await database.collection("daily_owners_balance");
            const document = await holders_balance_daily_db.updateOne(
                {
                    "address" : collection_stats.address.toLowerCase(),
                },
                {
                    $set : {
                        "from_date" : from_date,
                        "to_date" : current_date,
                    },
                    $addToSet : {"daily_data" : holders_balance_daily_obj }
                },
                {upsert : true}
            )
        } else if (reference_date !== null && current_date.getUTCHours() === 0 && (current_date.getTime() === (reference_date.getTime() + 86400000))){
            reference_date = new Date()
            reference_date.setUTCMinutes(0,0,0)

            const holders_balance_daily_db = await database.collection("daily_owners_balance");
            const document = await holders_balance_daily_db.updateOne(
                {
                    "address" : collection_stats.address.toLowerCase(),
                },
                {
                    $set : { "to_date" : current_date },
                    $addToSet : {"daily_data" : holders_balance_daily_obj }
                },
                {upsert : true}
            )
        }

         */