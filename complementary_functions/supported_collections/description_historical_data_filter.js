const {logger} = require("../../utils/logger")
const { MongoClient, ServerApiVersion } = require('mongodb');
const {mongo_update_collections_cards} = require("../../mongo/push/collections_data/mongo_update_collection_card")
const {mongo_push_collection_description} = require("../../mongo/push/collections_data/mongo_push_collection_description")
const {mongo_push_daily_historical_data} = require("../../mongo/push/listing_wb_data/mongo_update_historical_listings_data")
const {mongo_pull_daily_floor} = require("../../mongo/pull/monog_pull_daily_floor")
const {mongo_pull_currencies_prices} = require("../../mongo/pull/mongo_pull_currencies_prices")
const {limited_reservoire_collection_description, reservoire_collection_description} = require ("../../reservoir/reservoire_collection_description")
const {limited_reservoire_historical_data} = require ("../../reservoir/reservoire_historical_data")
require('dotenv').config({path: "../../.././.env"})

// TO BE DONE
// 1. CLIENT CONNECT / CLOSE OUTSIDE THE MONGO FUNCTIONS
// 2. CHANGE TIMING RESERVOIRE
// 3. IF ERROR AFTER THE RESULT OF THE CALLED FUNCTIONS

async function description_historical_data_filter(collections_cards_array, retry_counter, max_retry_number){


    try {
        logger.info("description_historical_data_filter has started")
        const initial_description_historical_data_filter_date = new Date()

        const current_date = new Date()
        current_date.setUTCMinutes(0,0,0)

        //array that will be returned by this function
        const supported_collections_array = []
        const partially_supported_collection_array = []
        const non_supported_collections_array =  []

        // SAVES ANY ADDRESS THAT CREATED AN ERROR
        const error_array_address = []

        //open mongo connection
        const uri = process.env.MONGO_DB_URL;
        const client = new MongoClient(uri,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverApi: ServerApiVersion.v1
            });

        await client.connect()

        // Call the collection currency eth card to find the array with ethereum prices
        const mongo_eth_prices_array = await mongo_pull_currencies_prices("0x0000000000000000000000000000000000000000", "eth", client)
        if (!mongo_eth_prices_array) {throw new Error("Error wih mongo pull currency prices")}


        await Promise.all(collections_cards_array.map(async (collection) => {

            try {
                // Check if there are the fields historical_floor_data_yes_no and description_yes_no
                //collection.historical_floor_data_yes_no === undefined

                if ((collection.support_status.toLowerCase() === "supported" || collection.support_status.toLowerCase() === "partially_supported") && collection.chain.toLowerCase() === "ethereum") {
                    //logger.info(collection)

                    if (collection.description_yes_no) {

                        if (collection.description_yes_no === "yes") {

                                if (collection.historical_floor_data_yes_no) {

                                    if (collection.historical_floor_data_yes_no === "yes") {
                                        // set status to "active"
                                        const update_collections_cards_result = await mongo_update_collections_cards(collection, "active_status", "active", client)
                                        if (!update_collections_cards_result) {throw new Error("Mongo update collection card error")}
                                    }
                                    else if (collection.historical_floor_data_yes_no === "no") {
                                        const future_date = new Date(current_date)
                                        future_date.setUTCDate(current_date.getUTCDate() + 5)
                                        // set historical_floor_data_yes_no to current date + 5 days
                                        const update_collections_cards_result = await mongo_update_collections_cards(collection, "historical_floor_data_yes_no", future_date, client)
                                        if (!update_collections_cards_result) {throw new Error("Mongo update collection card error")}
                                    }

                                    // If there is an object in historical_floor_data_yes_no it means there is a date in it
                                    else if (typeof collection.historical_floor_data_yes_no === "object" && collection.historical_floor_data_yes_no.getUTCDate() <= current_date.getUTCDate()) {

                                        // call reservoir get historical floor
                                        const reservoire_historical_data_result = await limited_reservoire_historical_data(collection.address)
                                        if (!reservoire_historical_data_result) {throw new Error("Error in reservoir historical data")}

                                        //logger.info(reservoire_historical_data_result)

                                        // call mongo to get the first date since there are floor data
                                        const pull_daily_floor_result = await mongo_pull_daily_floor(collection.address, client)
                                        if (!pull_daily_floor_result) {throw new Error("Mongo pull daily floor error")}


                                        // Array where the loop stores the prices for each day
                                        const raw_historical_floor_array = []
                                        let date_verifier_constant = null

                                        // Variable needed to check if there are outliers in the data
                                        const cleaned_historical_floor_array = []
                                        const percentage_variation_allowed = 0.45
                                        const percentage_check = (1 - percentage_variation_allowed)
                                        // 0.6 cause we are moltiplying it for the other floor, so it's (1 - % allowed of variation)

                                        // FIRST TEST IF THE MOST RECENT TIMESTAMP IN THE ARRAY IS EQUAL OR BIGGER THAN THE FROM DATE IN THE DB
                                        // IF THE TIMESTAMP IS SMALLER IT MEANS THERE IS A GAP IN THE DATA
                                        //logger.info(pull_daily_floor_result)
                                        //logger.info((reservoire_historical_data_result.collections[0].timestamp *1000), pull_daily_floor_result.from_date.getTime())
                                        if (reservoire_historical_data_result.collections && (reservoire_historical_data_result.collections[0].timestamp * 1000) >= pull_daily_floor_result.from_date.getTime()) {

                                            for (let daily_object_index in reservoire_historical_data_result.collections) {
                                                const num_daily_object_index = parseInt(daily_object_index)

                                                if (reservoire_historical_data_result.collections[num_daily_object_index].id.toLowerCase() === collection.address.toLowerCase()) {
                                                    let timestamp = reservoire_historical_data_result.collections[num_daily_object_index].timestamp * 1000

                                                    // If there is a date in the historical array that is the same day but with smaller hours set the date verifier constant to true
                                                    if (timestamp < pull_daily_floor_result.from_date.getTime()) {
                                                        let timestamp_date = new Date(timestamp)
                                                        let object = {
                                                            date: timestamp_date,
                                                            floor_price_eth: reservoire_historical_data_result.collections[num_daily_object_index].floor_sell_value,
                                                            floor_price_usd: null,
                                                        }

                                                        // MAp the historical array to remove outliers and clean the data
                                                        // There are cases where the historical data has very low floor prices or missing dates
                                                        let previous_floor_eth = null;
                                                        let following_floor_eth = null;
                                                        const current_floor_eth = reservoire_historical_data_result.collections[num_daily_object_index].floor_sell_value

                                                        //logger.info("h_index: ", num_h_index,"floor :",raw_historical_floor_array[num_h_index].floor_price_eth)

                                                        // avg floor of the previous 3 days and following 5, if it's possible
                                                        let tot_avg_floor = 0
                                                        let avg_counter = 0

                                                        for (let i = -4; i <= 6; i++) {
                                                            if (reservoire_historical_data_result.collections[num_daily_object_index + i]
                                                                && reservoire_historical_data_result.collections[num_daily_object_index + i].floor_sell_value
                                                                && i !== 0) {
                                                                avg_counter++;
                                                                tot_avg_floor = tot_avg_floor + reservoire_historical_data_result.collections[num_daily_object_index + i].floor_sell_value
                                                            }
                                                        }

                                                        const avg_floor_price = tot_avg_floor / avg_counter

                                                        if (num_daily_object_index === 0) {
                                                            following_floor_eth = reservoire_historical_data_result.collections[num_daily_object_index + 1].floor_sell_value

                                                            if (current_floor_eth < following_floor_eth * percentage_check) {
                                                                //raw_historical_floor_array[num_h_index].floor_price_eth = following_floor_eth
                                                                object.floor_price_eth = avg_floor_price
                                                            }
                                                        } else if (num_daily_object_index === (reservoire_historical_data_result.collections.length - 1)) {
                                                            previous_floor_eth = reservoire_historical_data_result.collections[num_daily_object_index - 1].floor_sell_value

                                                            if (current_floor_eth < previous_floor_eth * percentage_check) {
                                                                //raw_historical_floor_array[num_h_index].floor_price_eth = previous_floor_eth
                                                                object.floor_price_eth = avg_floor_price
                                                            }
                                                        } else if (reservoire_historical_data_result.collections[num_daily_object_index - 1] && reservoire_historical_data_result.collections[num_daily_object_index + 1]) {
                                                            previous_floor_eth = reservoire_historical_data_result.collections[num_daily_object_index - 1].floor_sell_value
                                                            following_floor_eth = reservoire_historical_data_result.collections[num_daily_object_index + 1].floor_sell_value

                                                            // If the price is in the middle use the average of the previous 4 days and following 5
                                                            if ((current_floor_eth < previous_floor_eth * percentage_check || current_floor_eth < following_floor_eth * percentage_check)) {
                                                                //raw_historical_floor_array[num_h_index].floor_price_eth = Math.max(previous_floor_eth, following_floor_eth)
                                                                object.floor_price_eth = avg_floor_price
                                                            }

                                                        }

                                                        // map the ethereum currency array to find the matching ETH-USD price
                                                        mongo_eth_prices_array.price_array.map((price_obj) => {
                                                            if (
                                                                price_obj.date.getUTCFullYear() === timestamp_date.getUTCFullYear() &&
                                                                price_obj.date.getUTCMonth() === timestamp_date.getUTCMonth() &&
                                                                price_obj.date.getUTCDate() === timestamp_date.getUTCDate() &&
                                                                price_obj.date.getUTCHours() === timestamp_date.getUTCHours()) {
                                                                object.floor_price_usd = object.floor_price_eth * price_obj.price_usd
                                                            }
                                                        })

                                                        raw_historical_floor_array.unshift(object)
                                                    }
                                                    // else if the date is the same day but >= hours it will drop that day
                                                    else if (timestamp >= pull_daily_floor_result.from_date.getTime()) {
                                                        // remove this object from the array, by not adding it to the array that will be saved
                                                    }

                                                } else {
                                                    logger.info("reservoir result has address not matching the collection")
                                                }
                                            }

                                            //logger.info(raw_historical_floor_array.slice(100, raw_historical_floor_array.length))
                                            //logger.info(raw_historical_floor_array[0])
                                            //logger.info(raw_historical_floor_array[raw_historical_floor_array.length - 1])


                                            const mongo_push_historical_data = mongo_push_daily_historical_data (collection, raw_historical_floor_array, client)
                                            if (!mongo_push_historical_data) {throw new Error("Mongo Push daily historical data error")}


                                        } else {
                                            // update the date in the mongo_db collection card to wait another day
                                            const future_date = new Date(current_date)
                                            future_date.setUTCDate(current_date.getUTCDate() + 1)
                                            // set historical_floor_data_yes_no to current date + 1 days
                                            const update_collections_cards_result = await mongo_update_collections_cards(collection, "historical_floor_data_yes_no", future_date, client)
                                            if (!update_collections_cards_result) {throw new Error("Mongo update collection card error")}
                                        }
                                    }

                                }
                                else if (!collection.historical_floor_data_yes_no) {
                                    // Call mongo and add the field to "no"
                                    const update_collections_cards_result = await mongo_update_collections_cards(collection, "historical_floor_data_yes_no", "no", client)
                                    if (!update_collections_cards_result) {throw new Error("Mongo update collection card error")}
                                }

                        }
                        else if (collection.description_yes_no === "no") {

                            const reservoire_description_result = await limited_reservoire_collection_description(collection.address)
                            if (!reservoire_description_result) {throw new Error("Error in reservoir historical data")}

                            // in the case there is 1 result it mens that that contact has only 1 collection associated
                            if(reservoire_description_result.length === 1){
                                // call mongo to update the collection description db
                                const push_collection_description_result = await mongo_push_collection_description(collection.address,client, "description_data", reservoire_description_result[0])
                                if (!push_collection_description_result) {throw new Error("Mongo push collection description error")}

                                // call mongo and update description_yes_no
                                const update_collections_cards_description_result = await mongo_update_collections_cards(collection, "description_yes_no", "yes", client)
                                if (!update_collections_cards_description_result) {throw new Error("Mongo update collection card error")}

                                //
                                const update_collections_cards_image_result = await mongo_update_collections_cards(collection, "name&image&slug", reservoire_description_result[0], client)
                                if (!update_collections_cards_image_result) {throw new Error("Mongo update collection card error")}
                            }
                            // In case the length is bigger than 1 the collection is marked as spam
                            else if(reservoire_description_result.length > 1) {
                                // call mongo and update description_yes_no
                                const update_collections_cards_result = await mongo_update_collections_cards(collection, "support_status", "spam", client)
                                if (!update_collections_cards_result) {throw new Error("Mongo update collection card error")}
                            }

                            // get reservoire description
                            // set description_yes_no = yes
                        }

                    }
                    else if (!collection.description_yes_no) {
                        // Call mongo and add the field to "no"
                        const update_collections_cards_result = await mongo_update_collections_cards(collection, "description_yes_no", "no", client)
                        if (!update_collections_cards_result) {throw new Error("Mongo update collection card error")}
                    }
                }
            }
            catch (error) {
                logger.info("Error with address", collection.address, "error: ", error)
                error_array_address.push(collection)
            }
        }))
            .then(async ()=>{

                await client.close()

                const ending_description_historical_data_filter_date = new Date()
                logger.info("description historical data filter has ended \n Time taken (seconds): ",
                    ((ending_description_historical_data_filter_date - initial_description_historical_data_filter_date)/(1000)))

                if(error_array_address.length !== 0 && retry_counter < max_retry_number){
                    logger.info("retry counter :", retry_counter)
                    retry_counter ++
                    await description_historical_data_filter(error_array_address, retry_counter, max_retry_number);
                }
                else{logger.info("No errors in description historical data filter")}
                return true
            })
    }
    catch (error) {
        logger.info(error)
        return false
    }
}
exports.description_historical_data_filter = description_historical_data_filter


// 0x8a90cab2b38dba80c64b7734e58ee1db38b8992e
// doodles : {address: "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e"}
// azuki : {address: "0xed5af388653567af2f388e6224dc7c4b3241c544"}

/*


                                    for (let h_index in raw_historical_floor_array){
                                        const num_h_index = parseInt(h_index)
                                        // If the floor_price_eth is 40% or more smaller than the one before and after
                                        // if there is a blanck date
                                        let previous_floor_eth = null;
                                        let following_floor_eth = null;
                                        const current_floor_eth = raw_historical_floor_array[num_h_index].floor_price_eth

                                        //logger.info("h_index: ", num_h_index,"floor :",raw_historical_floor_array[num_h_index].floor_price_eth)

                                        // avg floor of the previous 3 days and following 5, if it's possible
                                        let tot_avg_floor = 0
                                        let avg_counter = 0
                                        for (let i = -3; i <= 5; i++){
                                            if(raw_historical_floor_array[num_h_index + i]
                                                && raw_historical_floor_array[num_h_index + i].floor_price_eth
                                                && i !== 0 ){
                                                avg_counter ++;
                                                tot_avg_floor = tot_avg_floor + raw_historical_floor_array[num_h_index + i].floor_price_eth
                                            }
                                        }
                                        const avg_floor_price = tot_avg_floor / avg_counter

                                        logger.info("h_index: ", num_h_index,"floor :",raw_historical_floor_array[num_h_index].floor_price_eth,"avg floor: ", avg_floor_price)

                                        // first check that there are data before and after,
                                        // if h_index = 0 check only after,
                                        // if h_index = raw_historical_floor_array.length check only before
                                        if(num_h_index === 0){
                                            following_floor_eth = raw_historical_floor_array[num_h_index + 1].floor_price_eth

                                            if(current_floor_eth < following_floor_eth * percentage_check){
                                                //raw_historical_floor_array[num_h_index].floor_price_eth = following_floor_eth
                                                raw_historical_floor_array[num_h_index].floor_price_eth = avg_floor_price
                                            }
                                        }
                                        else if (num_h_index === (raw_historical_floor_array.length - 1)){
                                            previous_floor_eth = raw_historical_floor_array[num_h_index - 1].floor_price_eth

                                            if(current_floor_eth < previous_floor_eth * percentage_check){
                                                //raw_historical_floor_array[num_h_index].floor_price_eth = previous_floor_eth
                                                raw_historical_floor_array[num_h_index].floor_price_eth = avg_floor_price
                                            }
                                        }
                                        else if(raw_historical_floor_array[num_h_index - 1] && raw_historical_floor_array[num_h_index + 1]){
                                            previous_floor_eth = raw_historical_floor_array[num_h_index - 1].floor_price_eth
                                            following_floor_eth = raw_historical_floor_array[num_h_index + 1].floor_price_eth

                                            // If the price is in the middle use the average of the previous 4 days and following 5
                                            if((current_floor_eth < previous_floor_eth * percentage_check || current_floor_eth < following_floor_eth * percentage_check)){
                                                //raw_historical_floor_array[num_h_index].floor_price_eth = Math.max(previous_floor_eth, following_floor_eth)
                                                raw_historical_floor_array[num_h_index].floor_price_eth = avg_floor_price
                                            }

                                        }

                                    }

                                     */

