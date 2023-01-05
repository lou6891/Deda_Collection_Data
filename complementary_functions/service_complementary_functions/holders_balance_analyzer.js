const {logger} = require("../../utils/logger");

async function holders_balance_analyzer(collection_stats){

    try{

        let temp_holders_balance_array = []
        let final_holders_balance_array = []

        collection_stats.holders_balance_array.map((holder)=>{
            temp_holders_balance_array.push(holder.balance)
        })

        const min_balance = Math.min(...temp_holders_balance_array)
        const max_balance = Math.max(...temp_holders_balance_array)

        for (let i = min_balance; i <= max_balance; i++){
            const balance_object = {
                n_holders : 0,
                balance : null,
            }

            temp_holders_balance_array.map((n)=>{
                if (n === i){
                    balance_object.n_holders ++;
                    balance_object.balance = i;
                }
            })

            if (balance_object.balance && balance_object.n_holders !== 0){
                final_holders_balance_array.push(balance_object)
            }
        }

        return final_holders_balance_array

    }
    catch (error){
        logger.info("Error in holders_balance_analyzer in mongo_push_daily_owners : ", collection_stats.address, "\n", "Error", error)
        return false
    }
}
exports.holders_balance_analyzer = holders_balance_analyzer