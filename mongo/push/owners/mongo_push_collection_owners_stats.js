const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})


async function mongo_push_collection_owners_stats (collection_stats, client){

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


        const collection_stats_db = await database.collection("daily_owners_data");

        const current_date = new Date()
        current_date.setUTCMinutes(0,0,0)

        let owners_object = {timestamp : current_date, total_n_owners : collection_stats.total_n_owners, n_unique_owners : collection_stats.n_unique_owners,
            top_holders_balance : collection_stats.top_holders_balance, holders_balance_array_txt : JSON.stringify(collection_stats.holders_balance_array)}


        const document = await collection_stats_db.updateOne({
                    "from_date" : from_date,
                    "to_date" : to_date,
                    "address" : collection_stats.address.toLowerCase(),
            },
            {
                $set : {
                        "total_owners" : collection_stats.total_n_owners,
                        "unique_owners" : collection_stats.n_unique_owners,
                        "top_holders_balance" : collection_stats.top_holders_balance,
                        "number_top_holders_analyzed" : collection_stats.number_top_holders_analyzed,
                },
                $addToSet : {
                        "data" : owners_object,
                },
            },
            {upsert : true})


        //await client.close()
        return true
    }
    catch (error) {
        logger.info("Mongo Push supported owners collection stat: \n",error)
        return false
    }
}
exports.mongo_push_collection_owners_stats = mongo_push_collection_owners_stats