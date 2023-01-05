const { logger } = require('../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../.env"})

async function mongo_pull_collection_cards (){

    const uri = process.env.MONGO_DB_URL;
    const client = new MongoClient(uri,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverApi: ServerApiVersion.v1
        });

    try {
        await client.connect()

        const db_name_env = process.env.MONGO_COLLECTIONS_DB
        const database = await client.db(db_name_env)
        //const database = await client.db("Collections_db")


        const transaction_db = await database.collection("working_collection_cards");
        const document = await transaction_db.find().toArray()

        await client.close()
        return document


    } catch (error) {
        logger.info("Error wih mongo pull collections cards: \n", error)
        return false
    }


}
exports.mongo_pull_collection_cards = mongo_pull_collection_cards