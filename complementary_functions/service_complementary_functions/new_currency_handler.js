const {logger} = require("../../utils/logger");
const {limited_coingecko_get_simple_price} = require("../../coingecko/coingetcko_get_simple_price")
const {mongo_pull_coingecko_list} = require("../../mongo/pull/mongo_pull_coingecko_list");
const {mongo_push_currency_card} = require("../../mongo/push/currencies/mongo_push_currencies_card")

/*
{
  contract: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
  name: 'Decentraland MANA',
  symbol: 'MANA',
  decimals: 18
}
 */

async function new_currency_handler(listing_currency){

    const currency = {
        currency_address : listing_currency["contract"],
        currency_name : listing_currency["name"],
        symbol : listing_currency["symbol"],
        chain : "Ethereum",
        gwei_converter : 10**listing_currency["decimals"],
    }
    logger.info(currency)

    try{
        let return_obj = null

        const coingecko_currency_array = await mongo_pull_coingecko_list()
        if (!coingecko_currency_array) {throw new Error("Coingecko currency list error")}

        // Map the coingecko currency list to find the id and name
        for (let c_obj of coingecko_currency_array) {
            //await coingecko_currency_array.map(async (c_obj) => {
            // Fists find the one with a symbol matching the one in the currency cards
            if (currency.symbol.toLowerCase() == c_obj.symbol.toLowerCase()) {
                //logger.info(c_obj)
                // Then check that the eth address is the same, for ethereum there is a special case
                if ((currency.chain && c_obj.platforms[currency.chain.toLowerCase()]
                        && c_obj.platforms[currency.chain.toLowerCase()].toLowerCase() === currency.currency_address.toLowerCase())
                    || (currency.currency_name === "Ethereum" && currency.currency_name === c_obj.name)) {
                    logger.info("c_obj",c_obj)

                    // Call  coingecko to get more info about the coin, from the display image to other elements
                    const currency_info_result = await limited_coingecko_get_simple_price(c_obj.id)
                    if (!currency_info_result) {
                        throw new Error("Coingecko currency info error")
                    }
                    return_obj = currency_info_result[c_obj.id]["usd"]
                    logger.info(return_obj)
                }
            }
        }

        const mongo_push_currency_card_result = await mongo_push_currency_card(currency)
        if(!mongo_push_currency_card_result){throw new Error("Error in mongo push currency card")}

        return return_obj
    }
    catch (error) {
        logger.info("Error in new currency handler: ", error)
        return false
    }

}

exports.new_currency_handler = new_currency_handler

/*
new_currency_handler({
    contract: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
    name: 'Decentraland MANA',
    symbol: 'MANA',
    decimals: 18
})
 */