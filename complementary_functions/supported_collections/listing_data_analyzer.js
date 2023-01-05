const {logger} = require("../../utils/logger")
require('dotenv').config({path: "../../.././.env"})
const {limited_reservoir_ask_listings} =require("../../reservoir/reservoire_ask_listings")
const {new_currency_handler} = require("../service_complementary_functions/new_currency_handler")
const {mongo_push_raw_listing_array} = require("../../mongo/push/old/mongo_push_raw_listing_array")
const {mongo_push_supported_collection_floor_stats} = require("../../mongo/push/floor_data/mongo_push_supported_collection_floor_stats")
const {mongo_push_recent_listings_stats_wb} = require("../../mongo/push/listing_wb_data/mongo_push_recent_listings_stats_wb")
const {mongo_push_historical_listings_stats_wb} = require("../../mongo/push/listing_wb_data/mongo_push_historical_listins_stats_wb")
const {mongo_push_collection_description} = require("../../mongo/push/collections_data/mongo_push_collection_description")
const { MongoClient, ServerApiVersion } = require('mongodb');


async function listing_data_analyzer(supported_collections_array, currencies_prices_array, eth_price, retry_counter, max_retry_number){

    /*
    supported_collections_array = [{
        address: '0xd81f156bbf7043a22d4ce97c0e8ca11d3f4fb3cc',
        type: 'ERC721',
        chain: 'ethereum'
    }]

     */
    //0x3c99f2a4b366d46bcf2277639a135a6d1288eceb
    //0xd81f156bbf7043a22d4ce97c0e8ca11d3f4fb3cc

    try {
        logger.info("listing data analyzer has started")
        const initial_listing_data_analyzer_date = new Date()

        const uri = process.env.MONGO_DB_URL;
        const client = new MongoClient(uri,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverApi: ServerApiVersion.v1
            });

        // Open connection to mongo DB
        await client.connect()

        // SAVES ANY ADDRESS THAT CREATED AN ERROR
        const error_array_address = []

        // Map the collection address array, this is the point in which the real function starts -----------------------
        await Promise.all(supported_collections_array.map(async (collection)=>{
            try {
                let total_price_eth = 0
                let total_price_usd = 0
                let total_time = 0
                const current_date = new Date()
                current_date.setUTCMinutes(0, 0, 0)

                let collection_stats = {
                    timestamp: current_date,
                    address: collection.address,
                    currency: null,
                    lowest_floor_price_usd: 999999999999999999999999999999999999,
                    lowest_floor_price_eth: 999999999999999999999999999999999999,
                    number_of_listings: 0,
                    avg_floor_price_eth: null,
                    avg_floor_price_usd: null,
                    avg_listing_time_days: null,
                    listings: [],
                    opensea_floor_price_eth: 999999999999999999999999999999999999,
                    opensea_floor_price_usd: 999999999999999999999999999999999999,
                    looksrare_floor_price_eth: 999999999999999999999999999999999999,
                    looksrare_floor_price_usd: 999999999999999999999999999999999999,
                    x2y2_floor_price_eth: 999999999999999999999999999999999999,
                    x2y2_floor_price_usd: 999999999999999999999999999999999999,
                }

                //logger.info(collection.address)

                // Listing array processed
                const final_raw_listing_array = []
                // Listing array with all info that needs to be processed
                let raw_listing_array = []

                // get data from reservoire --------------------------------------------------------------------------------
                //const reservoire_result = await limited_reservoir_ask_listings(collection.address.toLowerCase(), null)
                //error checker
                const reservoire_result = await limited_reservoir_ask_listings(collection.address.toLowerCase(), null)
                if (!reservoire_result) {throw new Error ("Error in reservoir ask listings")}

                //logger.info(1)
                //logger.info(reservoire_result.continuation)

                raw_listing_array = raw_listing_array.concat(reservoire_result["orders"])
                let reservoire_continuation = reservoire_result["continuation"]

                // CONTINUATION for collections with >1000 listings

                while (reservoire_continuation) {
                    //logger.info("continuation", reservoire_continuation)
                    const reservoire_result_with_continuation = await limited_reservoir_ask_listings(collection.address.toLowerCase(), reservoire_continuation)
                    // Error checker
                    if (!reservoire_result_with_continuation) {throw new Error(reservoire_result_with_continuation.toString())}

                    raw_listing_array = raw_listing_array.concat(reservoire_result_with_continuation["orders"])
                    reservoire_continuation = reservoire_result_with_continuation["continuation"]
                }


                //logger.info(2)

                //----------------------------------------------------------------------------------------------------------
                // Analyze the data obtained -------------------------------------------------------------------------------
                raw_listing_array.map(async (listing) => {
                    //logger.info(listing)

                    let token_id = listing["tokenSetId"]
                    token_id = (token_id.slice(token_id.indexOf(":", 8) + 1))

                    let listing_object = {
                        "token_id": parseInt(token_id),
                        "valid_from": new Date(listing["validFrom"] * 1000),
                        "valid_until": new Date(listing["validUntil"] * 1000),
                        "price_usd" : null,
                        "price_eth" : null,
                        "currency" : listing.price.currency.symbol,
                    }

                    if (listing_object.valid_from.toISOString() === "1970-01-01T00:00:00.000Z") {
                        listing_object.valid_from = null
                    }
                    if (listing_object.valid_until.toISOString() === "1970-01-01T00:00:00.000Z") {
                        listing_object.valid_until = null
                    }

                    let listing_price = listing.price.amount.native
                    let listing_currency = listing.price.currency
                    let currency_checker_var = null

                    // transforms the listing price from the currencies to eth, the initial if is to avoid a loop
                    if(listing_currency.symbol.toLowerCase() === "eth"){
                        listing_object["price_usd"] = listing_price * eth_price
                        listing_object["price_eth"] = listing_price
                        currency_checker_var = true
                    }
                    else {
                        for (let currency of currencies_prices_array){
                            if (listing_currency.symbol.toLowerCase() === currency.currency_symbol.toLowerCase()){
                                listing_object["price_usd"] = listing_price * currency.price_usd
                                listing_object["price_eth"] = listing_object["price_usd"] / eth_price
                                currency_checker_var = true
                            }
                        }
                    }

                    // If currency is not tracked by the current system get its price and add it into the currencies cards
                    if(!currency_checker_var) {
                        logger.info("currency not in db", listing_currency)

                        const currency_price_usd = await new_currency_handler(listing_currency)
                        listing_object["price_usd"] = listing_price * currency_price_usd
                        listing_object["price_eth"] = listing_object["price_usd"] / eth_price

                        //listing_object["price" + listing_currency.symbol.toLowerCase()] = listing_price

                    }


                    if (listing.source.name === "Reservoir") {
                        listing_object.platform = "OpenSea"
                    } else {
                        listing_object.platform = listing.source.name
                    }

                    // Update collection stats info ------------------------------------------------------------------------
                    //floor price
                    if (listing_object.price_usd < collection_stats.lowest_floor_price_usd) {
                        collection_stats.lowest_floor_price_usd = listing_object.price_usd
                    }
                    if (listing_object.price_eth < collection_stats.lowest_floor_price_eth) {
                        collection_stats.lowest_floor_price_eth = listing_object.price_eth
                    }
                    if (listing_object.platform === "OpenSea" && listing_object.price_usd < collection_stats.opensea_floor_price_usd) { collection_stats.opensea_floor_price_usd = listing_object.price_usd }
                    if (listing_object.platform === "OpenSea" && listing_object.price_eth < collection_stats.opensea_floor_price_eth) { collection_stats.opensea_floor_price_eth = listing_object.price_eth }
                    if (listing_object.platform === "LooksRare" && listing_object.price_usd < collection_stats.looksrare_floor_price_usd) { collection_stats.looksrare_floor_price_usd = listing_object.price_usd }
                    if (listing_object.platform === "LooksRare" && listing_object.price_eth < collection_stats.looksrare_floor_price_eth) { collection_stats.looksrare_floor_price_eth = listing_object.price_eth }
                    if (listing_object.platform === "X2Y2" && listing_object.price_usd < collection_stats.x2y2_floor_price_usd) { collection_stats.x2y2_floor_price_usd = listing_object.price_usd }
                    if (listing_object.platform === "X2Y2" && listing_object.price_eth < collection_stats.x2y2_floor_price_eth) { collection_stats.x2y2_floor_price_eth = listing_object.price_eth }

                    //listed count
                    collection_stats.number_of_listings++
                    // total time
                    if (listing_object.valid_from && listing_object.valid_until) {
                        total_time = total_time + (listing["validUntil"] - listing.validFrom)
                    }
                    // total price
                    total_price_eth = total_price_eth + listing_object.price_eth
                    total_price_usd = total_price_usd + listing_object.price_usd
                    // Listings
                    let listing_object_for_collection_stats = {
                        "token_id": listing_object.token_id,
                        "price_eth": listing_object.price_eth,
                        "price_usd" : listing_object.price_usd,
                        "platform": listing_object.platform,
                    }
                    collection_stats.listings.push(listing_object_for_collection_stats)
                    // -----------------------------------------------------------------------------------------------------

                    final_raw_listing_array.push(listing_object)
                })
                //logger.info(3)

                // Finish updating the last elements of the collection stats
                collection_stats.avg_listing_time_days = (total_time / collection_stats.number_of_listings) / (60 * 60 * 24)
                collection_stats.avg_floor_price_eth = total_price_eth / collection_stats.number_of_listings
                collection_stats.avg_floor_price_usd = total_price_usd / collection_stats.number_of_listings

                // Insert the final raw listings array into the db ---------------------------------------------------------------------

                //logger.info(collection_stats)
                //logger.info(final_raw_listing_array)

                // Pushing the raw version every time uses too much space
                //let push_final_raw_listing_array_db = await mongo_push_raw_listing_array(final_raw_listing_array, collection.address, client)
                //if (!push_final_raw_listing_array_db) {throw new Error("Mongo push raw listing array")}
                /*
                for (let key in collection_stats){
                    if(collection_stats[key]){
                        let valueTOString = collection_stats[key].toString()
                        collection_stats[key] = valueTOString.substring(0, (valueTOString.indexOf(".") + 6))
                    }
                }

                 */


                // Update the collection stats in te db
                const update_collections_description = await mongo_push_collection_description (collection_stats.address , client, "listing_data" , collection_stats)
                if (!update_collections_description) {throw new Error("Mongo Push collection description listing data")}

                const update_collections_stats = await mongo_push_supported_collection_floor_stats(collection_stats, client)
                if (!update_collections_stats) {throw new Error("Mongo Push supported collection stat")}

                //Update daily floor stats in the db
                const push_recent_listings = await mongo_push_recent_listings_stats_wb(collection_stats, client)
                if (!push_recent_listings) {throw new Error("Mongo Push recent listings stats wb")}


                // Update historical data only if it's 00 add it to the main array, if not adds to a second one

                const push_historical_listings = await mongo_push_historical_listings_stats_wb(collection_stats, client)
                if (!push_historical_listings) {throw new Error("Mongo Push historical listings stats wb")}



                //logger.info(collection_stats)
            }
            catch (error) {
                logger.info("Error with address", collection.address, "error: ", error)
                error_array_address.push(collection)
            }
        }))
            .then(async ()=>{
                await client.close()

                const ending_listing_data_analyzer_date = new Date()
                logger.info("listing data analyzer has finished \n Time taken (minutes): ",
                    ((ending_listing_data_analyzer_date - initial_listing_data_analyzer_date)/(1000*60)))

                if(error_array_address.length !== 0 && retry_counter < max_retry_number){
                    logger.info("retry counter :", retry_counter)
                    retry_counter ++
                    await listing_data_analyzer(error_array_address, currencies_prices_array, eth_price, retry_counter, max_retry_number);
                }
                else{logger.info("No errors in listings data analyzer")}

                return true
            })

    }
    catch (error) {
        logger.info("ERROR IN THE MAIN TRY/CATCH OF LISTINGS DATA ANALYZER, NOT INSIDE THE PARSE")
        logger.info(error)
        return false
    }

}
exports.listing_data_analyzer = listing_data_analyzer

/* USE THE ONE IN THE COLLECTIONS_DATA_MAIN
listing_data_analyzer([{
    address: '0xed5af388653567af2f388e6224dc7c4b3241c544',
    type: 'ERC721',
    chain: 'ethereum'
}])

*/
// BASE TEST : 0x32ddbb0fc65bb53e1f7d6dc1c2a713e9a695b75b
// DOODLES TEST : 0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e
// BORED APE TEST : 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
// THE HUMANOIDS TEST: 0x3a5051566b2241285BE871f650C445A88A970edd


/*
OLD for old reservoire api call
                raw_listing_array.map((listing) => {
                    //logger.info(listing)

                    let listing_object = {
                        "token_id": parseInt(listing.tokenId),
                        "price": listing.price,
                        "valid_from": new Date(listing.validFrom * 1000),
                        "valid_until": new Date(listing.validUntil * 1000),

                    }

                    if (listing_object.valid_from.toISOString() === "1970-01-01T00:00:00.000Z") {
                        listing_object.valid_from = null
                    }
                    if (listing_object.valid_until.toISOString() === "1970-01-01T00:00:00.000Z") {
                        listing_object.valid_until = null
                    }

                    if (listing.source === "Reservoir") {
                        listing_object.platform = "OpenSea"
                    } else {
                        listing_object.platform = listing.source
                    }

                    // Update collection stats info ------------------------------------------------------------------------
                    //floor price
                    if (listing.price < collection_stats.lowest_floor_price) {
                        collection_stats.lowest_floor_price = listing.price
                    }
                    if (listing_object.platform === "OpenSea" && listing.price < collection_stats.opensea_floor_price) {
                        collection_stats.opensea_floor_price = listing.price
                    }
                    if (listing_object.platform === "LooksRare" && listing.price < collection_stats.looksrare_floor_price) {
                        collection_stats.looksrare_floor_price = listing.price
                    }
                    if (listing_object.platform === "X2Y2" && listing.price < collection_stats.x2y2_floor_price) {
                        collection_stats.x2y2_floor_price = listing.price
                    }

                    //listed count
                    collection_stats.number_of_listings++
                    // total time
                    if (listing_object.valid_from && listing_object.valid_until) {
                        total_time = total_time + (listing.validUntil - listing.validFrom)
                    }
                    // total price
                    total_price = total_price + listing.price
                    // Listings
                    let listing_object_for_collection_stats = {
                        "token_id": parseInt(listing.tokenId),
                        "price": listing.price,
                        "platform": listing_object.platform,
                    }
                    collection_stats.listings.push(listing_object_for_collection_stats)
                    // -----------------------------------------------------------------------------------------------------

                    final_raw_listing_array.push(listing_object)
                })
 */