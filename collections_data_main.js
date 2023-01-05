const {logger} = require("./utils/logger")
require('dotenv').config({path: "./.env"})
const {mongo_pull_collection_cards} = require("./mongo/pull/mongo_pull_collection_cards");
const {listing_data_analyzer} = require("./complementary_functions/supported_collections/listing_data_analyzer")
const {owners_data_analyzer} = require("./complementary_functions/supported_collections/owners_data_analyzer")
const {partially_supported_floor_analyzer} = require("./complementary_functions/partially_supported_collections/partially_supported_floor_analyzer")
const {mongo_pull_currencies_cards} = require("./mongo/pull/mongo_pull_currencies_cards")
const {currencies_data_analyzer} = require("./complementary_functions/currencies_data_analyzer")
const {description_historical_data_filter} = require("./complementary_functions/supported_collections/description_historical_data_filter")


async function collections_data_main(){
    // This function manages all the other, this is the one that ech hour activates the complementary ones

    // This function process
    // 1. Get the currency cards
    // 2. Analyze the currencies cards to get the data
    // 3. Get the collection cards
        // Support_status = supported
            // -> description_yes_no = yes
                // historical_floor_data_yes_no = yes
                    // Call listing analyzer
                // historical_floor_data_yes_no = no
                    // Get historical data
                    // call listing analyzer
                    // call owners analyzer
            // -> description_yes_no = no
                // get description
                    // historical_floor_data_yes_no = no
                        // Get historical data
                        // call listing analyzer
                        // call owners analyzer
        // Support_status = partially_supported
            // Call partially supported data analyzer

    // Collection cards info this function needs to work
    // 1. address
    // 2. support_status
    // 3. type
    // 4. chain

    // Missing:
    // 1. Finish description historical data
    // 2. loop temporale
    // 3. Reconnect to mongo

    //__________________________________________________________________________________________________________________
    try {
        logger.info("collections data main has started_________________________")

        // current date just for managing purposes
        const initial_collections_data_main_date = new Date()

        // Retry counter that avoids that any function goes to infinite if there is an error
        let retry_counter = 0
        const max_retry_number = 1

        // array that keeps the latest prices for the listing function
        let currencies_prices_array = []

        let currencies_cards_array = await mongo_pull_currencies_cards()
        if (!currencies_cards_array) {
            currencies_cards_array = await mongo_pull_currencies_cards()
        }

        //currencies_cards_array = [currencies_cards_array[currencies_cards_array.length -1]]

        let currency_data_analyzer_result = await currencies_data_analyzer(currencies_cards_array, currencies_prices_array, retry_counter, max_retry_number)
        if (!currency_data_analyzer_result) {
            currency_data_analyzer_result = await currencies_data_analyzer(currencies_cards_array, currencies_prices_array, retry_counter, max_retry_number)
        }

        // Divide the result of the currency data analyzer into eth and the other currencies
        currencies_prices_array = currency_data_analyzer_result.currencies_prices_array
        const eth_price = currency_data_analyzer_result.eth_price

        //logger.info("currency_data_analyzer_result: " , currency_data_analyzer_result)

        const collections_cards_array = await mongo_pull_collection_cards()


        //Tested Successfully (to be upgraded in the reservoir collection description handling)
        const description_historical_data_result = await description_historical_data_filter(collections_cards_array, retry_counter, max_retry_number)
        //logger.info(description_historical_data_result)

        let supported_collections_array = []
        let partially_supported_collection_array = []
        for (let collection of collections_cards_array){
            if(collection.support_status.toLowerCase() === "partially_supported"){
                partially_supported_collection_array.push(collection)
            }
            else if(collection.support_status.toLowerCase() === "supported"){
                supported_collections_array.push(collection)
            }
        }
        logger.info("supported collections array length: ", supported_collections_array.length)
        logger.info("partially supported collection array length", partially_supported_collection_array.length)

        await Promise.all(
            [
                //Tested Successfully (just see how to handle the continuation loop, maybe improve timings)
                listing_data_analyzer(supported_collections_array, currencies_prices_array, eth_price, retry_counter, max_retry_number),
                //Tested Successfully
                owners_data_analyzer(supported_collections_array, retry_counter, max_retry_number),
                //Tested Successfully
                partially_supported_floor_analyzer(partially_supported_collection_array, currencies_prices_array, eth_price, retry_counter, max_retry_number),
            ])
            .then(()=>{
                const ending_collections_data_main_date = new Date()
                logger.info("collections data main has ended, \n total time taken (minutes): ", ((ending_collections_data_main_date - initial_collections_data_main_date) / (1000 * 60)), "\n ____________________")
            })

    }

    catch (error) {
        logger.info("collections data main error: ", error)
    }


}
exports.collections_data_main =collections_data_main






/*

function logMemory() {
    if (typeof process != 'undefined') {
        console.log(`Node: ${process.memoryUsage().heapUsed / Math.pow(1000, 2)} MB`);
    } else if (performance) {
        console.log(`Browser: ${performance.memory.usedJSHeapSize / Math.pow(1000, 2)} MB`);
    } else {
        throw ('Where d-heck are you trying to run me?');
    }
}

function measureMemory() {
    const arraySize = 25 * Math.pow(1000, 2);
    logMemory();
    (function() {
        const array1 = new Array(arraySize).fill(1.1);
        logMemory();
    })();
    (function() {
        const array2 = new Array(arraySize).fill(1);
        logMemory()
    })();

    setTimeout(() => {
        logMemory();
    }, 5000);
}

 */


/*
     partially_supported_floor_analyzer([{
         address: '0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e',
         type: 'ERC721',
         chain: 'ethereum'
     }], currencies_prices_array, eth_price, retry_counter, max_retry_number)

     await listing_data_analyzer([{
         address: '0xed5af388653567af2f388e6224dc7c4b3241c544',
         type: 'ERC721',
         chain: 'ethereum'
     }], currencies_prices_array, eth_price, retry_counter, max_retry_number)
*/

/*
async function t_1 (){
    let timeout = 5000
    await new Promise(r => setTimeout(r, timeout)).then(()=>{logger.info("t_1")})
}
async function t_2 (){
    let timeout = 0
    await new Promise(r => setTimeout(r, timeout)).then(()=>{logger.info("t_2")})
}
async function t_3 (){
    await Promise.all([
            t_1(),
            t_2()
        ])
}
t_3()

 */


/*
while (true) {
    // TO be modified-----------------------------------------------------------------------------------------------
    const current_date = new Date()
    const starting_date = new Date()
    //starting_date.setMinutes(0,0,0)
    starting_date.setUTCSeconds(starting_date.getUTCSeconds() + 10)
    logger.info(current_date , starting_date)
    //starting_date.setUTCHours(starting_date.getUTCHours() +1)
    let timeout = starting_date - current_date
    logger.info(timeout)


    await new Promise(r => setTimeout(r, timeout)).then(async () => {


        // --------------------- Calling the web3 function ---------------------------------------------
        const logger_time = new Date()
        logger.info("Starting hourly collection data \n" +
            "------------------------------ Day: ", logger_time.getUTCDay() ,
            "Hour: ", logger_time.getUTCHours(), "-----------------------------")

        // Get the collection cards from mongo db,
        const supported_collections_array = []
        const non_supported_collections_array = []

        const collections_data = await mongo_pull_collection_cards()
        collections_data.map((collection)=>{
            let collection_card_object = {
                address: null,
                type : null,
                chain : null,
            }

            if(collection.address && collection.token_type && collection.support_status){
                collection_card_object.address = collection.address
                collection_card_object.type = collection.token_type
                collection_card_object.chain = collection.chain

                // FOR TESTING PURPOSES----------------------------------------------------------------------------
                supported_collections_array.push(collection_card_object)
                non_supported_collections_array.push(collection_card_object)
                // Missing to check if they are active or not

                if(collection.support_status === "supported"){supported_collections_array.push(collection_card_object)}
                if(collection.support_status === "not_supported"){non_supported_collections_array.push(collection_card_object)}


            }
            else {
                logger.info("Missing collection address", collection)
            }

            logger.info(collection_card_object)
        })

        // Calling the actual functions-----------------------------------------------------------------------------

        if (starting_date.getUTCHours() === 12 || starting_date.getUTCHours() === 0){
            await Promise.allSettled([
                listing_data_analyzer(supported_collections_array),
                owners_data_analyzer(supported_collections_array),
                // This part manages the collections that are not supported, and updates the daily and monthly data
                non_supported_floor_analyzer(non_supported_collections_array),
                ])

            // Then call the function that will put all the data in the daily summaries
        }
        // At any other time just call for the supported collections
        else{
            await Promise.allSettled([
                listing_data_analyzer(supported_collections_array),
                owners_data_analyzer(supported_collections_array)])
        }

    })
}


               {
                     _id: new ObjectId("62fe61bad6d8442633ce782b"),
                     address: '0x099a16f0414cb0cc0555d5f1f8140166462d39ff',
                     active_status: 'not_active',
                     chain: 'ethereum',
                     description: null,
                     name: 'UnStackedToadz',
                     other_info: null,
                     slug: 'unstackedtoadz',
                     support_status: 'not_supported',
                     tag: null,
                     token_type: 'ERC721'
                   }

                */