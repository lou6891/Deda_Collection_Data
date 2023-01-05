const { logger } = require('../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../.././.env"})

async function mongo_pull_coingecko_list (){

    const uri = process.env.MONGO_DB_URL;

    const client = new MongoClient(uri,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverApi: ServerApiVersion.v1
        });

    try {
        await client.connect()

        const db_name_env = process.env.MONGO_CURRENCIES_DB
        const database = await client.db(db_name_env)
        //const database = await client.db("Currencies_db")


        const transaction_db = await database.collection("coingecko_currency_list");
        const document = await transaction_db.findOne({
            "doc_name" : "coingecko_currency_list"
        })

        await client.close()
        return JSON.parse(document.data)


    } catch (error) {
        logger.info("Error wih mongo pull coingecko currencies list: \n", error)
        return false
    }


}
exports.mongo_pull_coingecko_list = mongo_pull_coingecko_list