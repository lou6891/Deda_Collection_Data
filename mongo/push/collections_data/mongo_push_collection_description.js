const { logger } = require('../../../utils/logger');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../../.env"})

async function mongo_push_collection_description (collection_address,client, type ,data) {
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
        // const database = await client.db("Collections_db_test")

        const collections_descriptions = await database.collection("collection_description")

        if(type === "description_data") {

            const document = await collections_descriptions.updateOne(
                {
                    "address": collection_address,
                },
                {
                    $set: {
                        "slug": data.slug,
                        "name": data.name,
                        "image_url": data.image,
                        "banner_image_url": data.banner,
                        "discord_url": data.discordUrl,
                        "description": data.description,
                        "website_url": data.externalUrl,
                        "twitter_username": data.twitterUsername,
                        "token_count": data.tokenCount,
                        "royalties": data.royalties,
                        "sample_images": data.sampleImages,
                    }

                },
                {upsert: true},)
        }
        else if(type === "listing_data"){

            const document = await collections_descriptions.updateOne(
                {
                    "address": collection_address,
                },
                {
                    $set: {
                        "number_of_listings" : data.number_of_listings,
                        "opensea_floor_price_eth" : data.opensea_floor_price_eth,
                        "opensea_floor_price_usd" : data.opensea_floor_price_usd,
                        "looksrare_floor_price_eth" : data.looksrare_floor_price_eth,
                        "looksrare_floor_price_usd" : data.looksrare_floor_price_usd,
                        "x2y2_floor_price_eth" : data.x2y2_floor_price_eth,
                        "x2y2_floor_price_usd" : data.x2y2_floor_price_usd,
                        "lowest_floor_price_usd" : data.lowest_floor_price_usd,
                        "lowest_floor_price_eth" : data.lowest_floor_price_eth,
                    }

                },
                {upsert: false},)

        }
        else if(type === "owners_data"){
            const document = await collections_descriptions.updateOne(
                {
                    "address": collection_address,
                },
                {
                    $set: {
                        "total_owners" : data.total_n_owners,
                        "unique_owners" : data.n_unique_owners,
                    }

                },
                {upsert: false},)
        }
        else {
            throw new Error("Type not matching mongo push collection description")
        }

        //await client.close()
        return true
    }
    catch (error) {

        logger.info("Mongo push collection description error: \n",error, data)
        return false
    }
}
exports.mongo_push_collection_description = mongo_push_collection_description

/*
"slug" :  reservoire_description_result.collection.slug,
                "name" : reservoire_description_result.collection.name,
                "image_url" : reservoire_description_result.collection.metadata.imageUrl,
                "banner_image_url" : reservoire_description_result.collection.metadata.bannerImageUrl,
                "discord_url" : reservoire_description_result.collection.metadata.discordUrl,
                "description" : reservoire_description_result.collection.metadata.description,
                "website_url" : reservoire_description_result.collection.metadata.externalUrl,
                "twitter_username" : reservoire_description_result.collection.metadata.twitterUsername,
                "token_count" : reservoire_description_result.collection.tokenCount,
                "royalties" :  reservoire_description_result.collection.royalties,
 */
