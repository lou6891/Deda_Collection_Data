const {logger} = require("../../utils/logger")
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({path: "../../.././.env"})

const {limited_alchemy_get_floor} = require("../../Alchemy/alchemy_get_floor")
const {mongo_push_daily_floor_partially_supported} = require("../../mongo/push/listing_wb_data/mongo_push_daily_floor_partially_supported");

async function partially_supported_floor_analyzer(non_supported_collections_array, currencies_prices_array, eth_price,  retry_counter, max_retry_number){
    /*
    non_supported_collections_array = [{
        address: '0xa7c1076e671e14c7b5ed5eac139e855cfa6b9663',
        type: 'ERC721',
        chain: 'ethereum'
    }]

     */
    try{

        logger.info("partially supported collections floor analyzer has started")
        const initial_non_supported_floor_analyzer_date = new Date()

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

        await Promise.all(non_supported_collections_array.map(async (collection)=>{
            try {

                const collection_floor_stats = {
                    address: collection.address,
                    opensea_floor_price_eth: null,
                    opensea_floor_price_usd: null,
                    opensea_currency: null,
                    looksrare_floor_price_eth: null,
                    looksrare_floor_price_usd: null,
                    looksrare_currency: null,
                    lowest_floor_price_usd: null,
                    lowest_floor_price_eth: null,
                }
                const alchemy_floor_data = await limited_alchemy_get_floor(collection.address)
                if (!alchemy_floor_data) {
                    throw new Error("Alchemy get floor error")
                }

                //logger.info(alchemy_floor_data)
                //alchemy_floor_data.openSea.floorPrice
                if (alchemy_floor_data["openSea"]["floorPrice"]) {
                    let currency_checker_var = null
                    if (alchemy_floor_data["openSea"]["priceCurrency"].toLowerCase() === "eth") {
                        collection_floor_stats.opensea_floor_price_eth = alchemy_floor_data["openSea"]["floorPrice"];
                        collection_floor_stats.opensea_floor_price_usd = alchemy_floor_data["openSea"]["floorPrice"] * eth_price;
                        collection_floor_stats.opensea_currency = alchemy_floor_data["openSea"]["priceCurrency"];
                        currency_checker_var = true
                    } else {

                        for (let currency of currencies_prices_array) {
                            if (listing_currency.symbol.toLowerCase() === currency.currency_symbol.toLowerCase()) {
                                collection_floor_stats.opensea_floor_price_usd = alchemy_floor_data["openSea"]["floorPrice"] * currency.price_usd
                                collection_floor_stats.opensea_floor_price_eth = collection_floor_stats.opensea_floor_price_usd / eth_price
                                collection_floor_stats.opensea_currency = alchemy_floor_data["openSea"]["priceCurrency"];
                                currency_checker_var = true
                            }
                        }
                    }

                    if (!currency_checker_var) {
                        logger.info("currency not in db (partially supported)", alchemy_floor_data["openSea"]["priceCurrency"])
                    }
                }
                else {
                    collection_floor_stats.opensea_floor_price_eth = null;
                    collection_floor_stats.opensea_floor_price_usd = null;
                    collection_floor_stats.opensea_currency = null;
                }

                if (alchemy_floor_data["looksRare"]["floorPrice"]) {
                    let currency_checker_var = null

                    //logger.info(alchemy_floor_data.openSea.priceCurrency)
                    if (alchemy_floor_data["looksRare"]["priceCurrency"].toLowerCase() === "eth") {
                        collection_floor_stats.looksrare_floor_price_eth = alchemy_floor_data["looksRare"]["floorPrice"];
                        collection_floor_stats.looksrare_floor_price_usd = alchemy_floor_data["looksRare"]["floorPrice"] * eth_price;
                        collection_floor_stats.looksrare_currency = alchemy_floor_data["looksRare"]["priceCurrency"];
                        currency_checker_var = true

                    } else {

                        for (let currency of currencies_prices_array) {
                            if (listing_currency.symbol.toLowerCase() === currency.currency_symbol.toLowerCase()) {
                                collection_floor_stats.looksrare_floor_price_usd = alchemy_floor_data["looksRare"]["floorPrice"] * currency.price_usd
                                collection_floor_stats.looksrare_floor_price_eth = collection_floor_stats.looksrare_floor_price_usd / eth_price
                                collection_floor_stats.looksrare_currency = alchemy_floor_data["looksRare"]["priceCurrency"];
                                currency_checker_var = true
                            }
                        }
                    }

                    if (!currency_checker_var) { logger.info("currency not in db", alchemy_floor_data["looksRare"]["priceCurrency"]) }
                } else {
                    collection_floor_stats.looksrare_floor_price_usd = null;
                    collection_floor_stats.looksrare_floor_price_eth = null;
                    collection_floor_stats.looksrare_currency = null
                }

                // Set which one is the lowest
                if(collection_floor_stats.looksrare_floor_price_eth && collection_floor_stats.opensea_floor_price_eth){
                    collection_floor_stats.lowest_floor_price_eth = Math.min(collection_floor_stats.looksrare_floor_price_eth , collection_floor_stats.opensea_floor_price_eth)
                    collection_floor_stats.lowest_floor_price_usd = Math.min(collection_floor_stats.looksrare_floor_price_usd , collection_floor_stats.opensea_floor_price_usd)
                }
                else if(collection_floor_stats.looksrare_floor_price_eth){
                    collection_floor_stats.lowest_floor_price_eth = collection_floor_stats.looksrare_floor_price_eth
                    collection_floor_stats.lowest_floor_price_usd = collection_floor_stats.looksrare_floor_price_usd
                }
                else if(collection_floor_stats.opensea_floor_price_eth){
                    collection_floor_stats.lowest_floor_price_eth = collection_floor_stats.opensea_floor_price_eth
                    collection_floor_stats.lowest_floor_price_usd = collection_floor_stats.opensea_floor_price_usd
                }

                const update_collections_stats = await mongo_push_daily_floor_partially_supported(collection_floor_stats, client)
                if (!update_collections_stats) { throw new Error("Mongo Push daily floor partially supported error") }
            }
            catch (error) {
                logger.info("Error with address", collection.address, "error: ", error)
                error_array_address.push(collection)
            }

        }))
            .then(async ()=>{

                await client.close()

                const ending_non_supported_floor_analyzer_date = new Date()
                logger.info("partially supported collections floor analyzer has ended \n Time taken (minutes): ",
                    ((ending_non_supported_floor_analyzer_date - initial_non_supported_floor_analyzer_date)/(1000*60)))

                // Retry if error part
                if(error_array_address.length !== 0 && retry_counter < max_retry_number){
                    //logger.info("retry counter :", retry_counter)
                    retry_counter ++
                    await partially_supported_floor_analyzer(error_array_address, currencies_prices_array, eth_price, retry_counter, max_retry_number);
                }  else{logger.info("No errors in partially supported collections floor analyzer")}

                return true
            })

    }
    catch (error) {
        logger.info(error)
        return false
    }
}

exports.partially_supported_floor_analyzer = partially_supported_floor_analyzer