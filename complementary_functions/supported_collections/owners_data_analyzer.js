const {logger} = require("../../utils/logger");
const {limited_alchemy_get_owners} = require("../../Alchemy/alchemy_get_owners")
const { mongo_push_collection_owners_stats} = require("../../mongo/push/owners/mongo_push_collection_owners_stats")
//const { mongo_push_raw_owners_array} = require("../../mongo/push/old/mongo_push_raw_owners_array")
const {mongo_push_recent_owners_stats_wb} = require("../../mongo/push/owners_wb_data/mongo_push_recent_owners_stats_wb")
const {mongo_push_historical_owners_stats_wb} = require("../../mongo/push/owners_wb_data/mongo_push_historical_owners_stats_wb")
const { MongoClient, ServerApiVersion } = require('mongodb');
const {mongo_push_collection_description} = require("../../mongo/push/collections_data/mongo_push_collection_description");
require('dotenv').config({path: "../../.././.env"})


async function owners_data_analyzer(supported_collections_array, retry_counter, max_retry_number){
    const current_date = new Date()
    //So in this way the function is activated only if it's the good time
    if (current_date.getUTCHours() === 0 || current_date.getUTCHours() % 4 === 0 ){
        const number_of_top_holders_to_analyze = 25

        try{
            logger.info("owners data analyzer has started")
            const initial_owners_data_analyzer_date = new Date()

            const uri = process.env.MONGO_DB_URL;
            const client = new MongoClient(uri,
                {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    serverApi: ServerApiVersion.v1
                });

            await client.connect()

            // SAVES ANY ADDRESS THAT CREATED AN ERROR
            const error_array_address = []

            await Promise.all(supported_collections_array.map(async (collection)=>{

                try {
                    const current_date = new Date()
                    current_date.setUTCMinutes(0, 0, 0)

                    const total_n_owners_set = new Set()
                    const unique_owners_set = new Set()
                    let temporary_balance_array = []

                    let collection_owners_stats = {
                        timestamp: current_date,
                        address: collection.address,
                        total_n_owners: null,
                        n_unique_owners: null,
                        top_holders_balance: null,
                        number_top_holders_analyzed: number_of_top_holders_to_analyze,
                        holders_balance_array: [], // Re-written every hour

                    }

                    // Array with all the owners data to be sent to mongo db in the raw owners
                    //const raw_owners_array = []

                    // Array with all the tokes liked to the owners
                    //const token_to_owner_array = []

                    // array where the alchemy result is stored
                    let owners_array = []

                    let alchemy_pagekey_tester = true
                    let pageKey = null
                    //call alchemy every time there is a pagekey
                    while(alchemy_pagekey_tester){
                        // Alchemy function that looks for the owners ---------------------------------------------------------------
                        const alchemy_owners_result = await limited_alchemy_get_owners(collection.address, pageKey)
                        if(alchemy_owners_result["pageKey"]){
                            alchemy_pagekey_tester = true
                            pageKey = alchemy_owners_result["pageKey"]
                        }
                        else {
                            alchemy_pagekey_tester = false
                            pageKey = null
                        }
                        //owners_array = [...owners_array, ...alchemy_owners_result["ownerAddresses"]]
                        owners_array = owners_array.concat(alchemy_owners_result["ownerAddresses"])
                    }

                    //logger.info("owners_array", owners_array.length)
                    // Analyzing the alchemy result -----------------------------------------------------------------------------
                    for (let owner_data of owners_array){
                        //logger.info(owner_data)

                        // Object for the raw owners array
                        let owner_obj = {
                            owner_address: owner_data["ownerAddress"].toLowerCase(),
                            tokens: [],
                            balance : null,
                        }


                        if (owner_data["tokenBalances"] && owner_data["tokenBalances"].length > 0) {
                            await owner_data["tokenBalances"].map((token_balance) => {
                                // Object for the token to holder relationships array
                                /*
                                let token_to_owner_object = {
                                    token_id: null,
                                    owner_address: owner_data["ownerAddress"].toLowerCase(),
                                }

                                 */

                                if (token_balance.tokenId) {
                                    owner_obj.tokens.push(parseInt(token_balance.tokenId, 16))
                                    //token_to_owner_object.token_id = parseInt(token_balance.tokenId, 16)
                                }

                                //token_to_owner_array.push(token_to_owner_object)

                            })
                        }

                        owner_obj.balance = owner_obj.tokens.length
                        collection_owners_stats.holders_balance_array.push(owner_obj)
                        temporary_balance_array.push(owner_obj.balance)

                        //old related to saving to db the result from alchemy
                        //raw_owners_array.push(owner_obj)

                        //logger.info(owner_obj)


                        // Data for the collection owners stat -----------------------------------------------------------------
                        // Add the owner address to the total owner set, to find the number of holders
                        total_n_owners_set.add(owner_data["ownerAddress"].toLowerCase())

                        // If an address owns only 1 token, add it to the unique holders set
                        if (owner_data["tokenBalances"] && owner_data["tokenBalances"].length === 1) {
                            await owner_data["tokenBalances"].map((token_balance) => {
                                if (token_balance.tokenId && token_balance.balance) { unique_owners_set.add(owner_data["ownerAddress"].toLowerCase()) }
                            }) }
                    }

                    // For COLLECTION OWNER STAT
                    // Part for finishing analyzing the token balance ----------------------------------------------------------
                    //logger.info("temporary_balance_array",temporary_balance_array.length)
                    //temporary_balance_array = temporary_balance_array.sort((a, b) => {return b - a })
                    //logger.info("temporary_balance_array", temporary_balance_array)
                    collection_owners_stats.top_holders_balance = temporary_balance_array.slice(0, number_of_top_holders_to_analyze).reduce((total, n) => total + n)

                    // PArt for transforming the owner sets to array, and adding them to the collection owners stats
                    collection_owners_stats.total_n_owners = total_n_owners_set.size
                    collection_owners_stats.n_unique_owners = unique_owners_set.size

                    //logger.info(collection_owners_stats.holders_balance_array.length)
                    //logger.info(collection_owners_stats)
                    //logger.info(raw_owners_array)
                    //logger.info(token_to_owner_array)

                    // SAVE TO DB PART------------------------------------------------------------------------------------------
                    // save raw input from alchemy
                    //const push_raw_owner_array = await mongo_push_raw_owners_array(raw_owners_array, collection.address, client)
                    //if (!push_raw_owner_array) { throw new Error("Mongo push raw owners array") }

                    // Update the collection stats in te db
                    const update_collections_description = await mongo_push_collection_description (collection_owners_stats.address , client, "owners_data" , collection_owners_stats)
                    if (!update_collections_description) {throw new Error("Mongo Push collection description owners data")}

                    const push_collection_owner_stats = await mongo_push_collection_owners_stats(collection_owners_stats, client)
                    if (!push_collection_owner_stats) {throw new Error("Mongo Push supported owners collection stat")}

                    const push_recent_owners_stats = await mongo_push_recent_owners_stats_wb(collection_owners_stats, client)
                    if (!push_recent_owners_stats) {throw new Error("Mongo Push recent owners stats")}

                    const push_historical_owners_stats = await mongo_push_historical_owners_stats_wb(collection_owners_stats, client)
                    if (!push_historical_owners_stats) {throw new Error("Mongo Push historical owners stats")}

                    //await client.close()

                }
                catch (error) {
                    logger.info("Error with address", collection.address, " Error: ", error)
                    error_array_address.push(collection)
                }
            }))
                .then(async ()=>{

                    await client.close()

                    const ending_owners_data_analyzer_date = new Date()
                    logger.info("owners data analyzer has ended \n Time taken (minutes): ",
                        (((ending_owners_data_analyzer_date - initial_owners_data_analyzer_date)/(1000*60))) )

                    if(error_array_address.length !== 0 && retry_counter < max_retry_number) {
                        logger.info("retry counter :", retry_counter)
                        retry_counter ++
                        await owners_data_analyzer(error_array_address, retry_counter, max_retry_number)
                    } else{logger.info("No errors in owners data analyzer")}


                    return true
                })

        }
        catch (error) {
            logger.info("ERROR IN THE MAIN TRY/CATCH OF OWNERS DATA ANALYZER, NOT INSIDE THE PARSE")
            logger.info(error)
            return error
        }
    }
    else {
        logger.info("Owners data analyzer has not started, \n date/time specification not met ------------")
        return true
    }

}

exports.owners_data_analyzer = owners_data_analyzer

/*
{
    ownerAddress: '0x470e99a20f2dd39190a1df2ee2cd7726fa489d17',
        tokenBalances: [
    {
        tokenId: '0x0000000000000000000000000000000000000000000000000000000000000486',
        balance: 1
    }
]
}

owners_data_analyzer([{
        address: '0x32ddbb0fc65bb53e1f7d6dc1c2a713e9a695b75b',
        type: 'ERC721',
        chain: 'ethereum'
    }]
)



owners_array.map(async (owner_data) => {
                        //logger.info(owner_data)

                        // Object for the raw owners array
                        let owner_object = {
                            owner_address: owner_data["ownerAddress"].toLowerCase(),
                            tokens: [],
                        }

                        if (owner_data["tokenBalances"] && owner_data["tokenBalances"].length > 0) {
                            await owner_data["tokenBalances"].map((token_balance) => {
                                // Object for the token to holder relationships array
                                let token_to_owner_object = {
                                    token_id: null,
                                    owner_address: owner_data["ownerAddress"].toLowerCase(),
                                }

                                if (token_balance.tokenId) {
                                    owner_object.tokens.push(parseInt(token_balance.tokenId, 16))
                                    token_to_owner_object.token_id = parseInt(token_balance.tokenId, 16)
                                }

                                token_to_owner_array.push(token_to_owner_object)
                            })
                        }

                        //logger.info(owner_object)
                        raw_owners_array.push(owner_object)
                        //logger.info(raw_owners_array.length)

                        // Data for the collection owners stat -----------------------------------------------------------------
                        // Add the owner address to the total owner set, to find the number of holders
                        total_n_owners_set.add(owner_data["ownerAddress"].toLowerCase())

                        // If an address owns only 1 token, add it to the unique holders set
                        if (owner_data["tokenBalances"] && owner_data["tokenBalances"].length === 1) {
                            await owner_data["tokenBalances"].map((token_balance) => {
                                if (token_balance.tokenId && token_balance.balance) { unique_owners_set.add(owner_data["ownerAddress"].toLowerCase()) }
                            }) }
                    })
 */

