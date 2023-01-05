const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})

async function mongo_update_collections_cards (collection, card_field, card_field_data, client) {
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

        const db_name_env = process.env.MONGO_COLLECTIONS_DB
        const database = await client.db(db_name_env)
        //const database = await client.db("Collections_db")
        //const database = await client.db("Collections_db")

        const collection_cards_db = await database.collection("working_collection_cards")

        // depending on the field that need to be updated the function will change different elements

        if(card_field === "description_yes_no"){

            await collection_cards_db.updateOne(
                {
                    "address" : collection.address,
                },
                {
                    $set : {
                        "description_yes_no" : card_field_data
                    }
                },
                {upsert : false})
        }

        else if (card_field === "historical_floor_data_yes_no"){

            await collection_cards_db.updateOne(
                {
                    "address" : collection.address,
                },
                {
                    $set : {
                        "historical_floor_data_yes_no" : card_field_data
                    }
                },
                {upsert : false})
        }

        else if (card_field === "active_status"){
            await collection_cards_db.updateOne(
                {
                    "address" : collection.address,
                },
                {
                    $set : {
                        "active_status" : card_field_data
                    }
                },
                {upsert : false})
        }

        else if (card_field === "support_status"){
            await collection_cards_db.updateOne(
                {
                    "address" : collection.address,
                },
                {
                    $set : {
                        "support_status" : card_field_data
                    }
                },
                {upsert : false})
        }

        else if (card_field === "name&image&slug"){
            await collection_cards_db.updateOne(
                {
                    "address" : collection.address,
                },
                {
                    $set : {
                        "name" : card_field_data.name,
                        "image_url" : card_field_data.image,
                        "slug" : card_field_data.slug,
                    }
                },
                {upsert : false})
        }


        else {
            throw new Error("Card field is invalid")
        }


        //await client.close()

        return true
    }
    catch (error) {

        logger.info("Mongo update collection card error: \n",error)
        return false
    }
}
exports.mongo_update_collections_cards = mongo_update_collections_cards
