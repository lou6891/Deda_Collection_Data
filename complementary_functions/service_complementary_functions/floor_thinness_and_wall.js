const {logger} = require("../../utils/logger");

async function floor_thinness_and_wall (collection_stats){
    try {

        let price_array = []

        collection_stats.listings.map((listing) => {
            price_array.push(listing.price_eth)
        })

        const lowest_price = Math.min(...price_array)

        // Fist sort the price array in ascending order
        price_array.sort(function (a, b) {
            return a - b;
        });

        /*
        price_array.map((lol)=>{
            logger.info(lol)
        })
        logger.info("total n_",price_array.length)

         */

        //------------------------------------------------------------------------------------------------------------------
        // PART MANAGING THE FLOOR WALL

        const wall_array = []
        let wall_constant = 1; // CONSTANT THAT DECIDES THE INCREMENT WHEN FLOOR LESS THAN 1
        let wall_object = {
            cumulative_nfts_up_to_ending_range: 0,
            n_nfts_in_range: 0,
            starting_range: null,
            ending_range: null,
        }
        // For the last price in the array, there is an if at the end of the loop, this avoids an infinite loop
        let breaker = null

        for (let i = 0; i < price_array.length; i++) {

            const exponential_version = price_array[i].toExponential()
            const decimal_place = exponential_version.slice(exponential_version.indexOf("e") + 1)

            // This part modifies the wall constant based on how big the price is cause for low prices the sistem is perfect,
            // for prices bigger than 10 ETH it is not helpful
            if (price_array[i] > 1 && price_array[i] < 10) {
                wall_constant = 0.2
            } else if (price_array[i] > 10 && price_array[i] < 50) {
                wall_constant = 0.05
            } else if (price_array[i] > 50 && price_array[i] < 100) {
                wall_constant = 0.2
            } else if (price_array[i] > 100 && price_array[i] < 500) {
                wall_constant = 0.15
            } else if (price_array[i] > 500 && price_array[i] < 1000) {
                wall_constant = 0.25
            } else if (price_array[i] > 1000) {
                wall_constant = 1
            }
            const wall_constant_adjusted = wall_constant * (10 ** decimal_place)

            //logger.info("i: ",i,"price_array[i]", price_array[i], ""
            //    , "decimal_place", decimal_place, ""
            //    , "wall_constant_adjusted", wall_constant_adjusted,)

            // setting the first wall object
            if (i == 0) {
                wall_object.starting_range = lowest_price

                // if the wall object is bigger than the lowest price it will be the new ending range
                if (wall_constant_adjusted > lowest_price) {
                    wall_object.ending_range = wall_constant_adjusted
                }
                // if it's the opposite the new ending range will be the wall constant * 2
                else {
                    let ending_range_var = 0
                    let counter = 1
                    while (ending_range_var <= wall_object.starting_range) {
                        if (wall_constant_adjusted < 1) {
                            ending_range_var = (wall_constant_adjusted * (10 ** 8) * counter)
                            ending_range_var = ending_range_var / (10 ** 8)
                        } else {
                            ending_range_var = (wall_constant_adjusted * 100) * counter
                            ending_range_var = ending_range_var / 100
                        }
                        counter++
                    }
                    wall_object.ending_range = ending_range_var
                    //logger.info( "if i==0",wall_object.ending_range)

                }
            }
            else {
                if(wall_array[wall_array.length - 1]){
                    // if not the wall object starting range is the ending range of the previous wall object
                    wall_object.starting_range = wall_array[wall_array.length - 1].ending_range

                    // same logic of the previous ending range applies if i !== 0
                    if (wall_constant_adjusted > wall_object.starting_range) {
                        wall_object.ending_range = wall_constant_adjusted
                    }
                    // if it's the opposite the new ending range will be the wall constant * 2
                    else {
                        // test ------------------------------------------------------------------------------------------
                        let ending_range_var = wall_object.starting_range
                        let counter = 1
                        while (ending_range_var <= wall_object.starting_range) {
                            if (wall_constant_adjusted < 1) {
                                ending_range_var = (wall_constant_adjusted * (10 ** 8) * counter)
                                ending_range_var = ending_range_var / (10 ** 8)
                            } else {
                                ending_range_var = (wall_constant_adjusted * 100) * counter
                                ending_range_var = ending_range_var / 100
                            }
                            counter++
                        }
                        wall_object.ending_range = ending_range_var
                        //
                        //logger.info("testing", wall_object, "lol", wall_object.ending_range)
                    }
                }
            }

            //logger.info( "wall object before price loop",wall_object )
            // This part creates the wall object and manages the other info not previously created
            for (let price of price_array) {
                //logger.info("price", price)
                if (price >= wall_object.starting_range && price < wall_object.ending_range && (i !== (price_array.length - 1))) {
                    //logger.info(price)
                    wall_object.n_nfts_in_range++;
                    wall_object.cumulative_nfts_up_to_ending_range++;

                    if (i !== 0 && wall_object.n_nfts_in_range === 1 && price_array[price_array.indexOf(price) + 1] >= wall_object.ending_range) {
                        wall_object.n_nfts_in_range--;
                        wall_object.cumulative_nfts_up_to_ending_range--;
                        //logger.info("here error")
                        break;
                    }
                }
                // Reset the loop if the price is bigger than the wall object
                else if (price >= wall_object.ending_range  /*&& wall_object.n_nfts_in_range > 0 */) {
                    // THis creates a copy of the wall object and pushes it into the array, pushing the wall object would
                    // also copy all the references, thus when resetting the wall obj it would also modify the object in the array
                    //logger.info(price)

                    if (i === 0 || wall_object.n_nfts_in_range > 1) {
                        //logger.info("test i === 0 ||",wall_object)
                        const wall_object_copy = {...wall_object}
                        wall_array.push(wall_object_copy)
                        //logger.info("test 2", wall_array)
                        wall_object.n_nfts_in_range = 0
                        wall_object.starting_range = null;
                        wall_object.ending_range = null;
                        i = price_array.indexOf(price) - 1
                    }
                    // TEST PER AGGREGARE GLI OBJECT VUOI E PRESENTARE I GAP IN FLOOR
                    else if (wall_object.n_nfts_in_range === 0) {
                        if (price_array[price_array.indexOf(price) + 1] < wall_object.ending_range + wall_constant_adjusted) {
                            const wall_object_copy = {...wall_object}
                            wall_array.push(wall_object_copy)
                        }
                    }
                    //logger.info( "wall array before loop break",wall_array)
                    break;
                }
            }

            // If we reached the end of the elements in the array the last wall object won't be pushed, this solves that case
            if (i === (price_array.length - 1) && breaker === null) {
                wall_object.ending_range = price_array[i]

                // This case requires a special handling that would otherwise break the logic of the other situation
                if(wall_object.ending_range === wall_object.starting_range){}
                else if(wall_object.ending_range > wall_object.starting_range && wall_array.length !== 0){
                    price_array.map((price) => {
                        if (price >= wall_object.starting_range && price <= wall_object.ending_range) {
                            wall_object.n_nfts_in_range++;
                            wall_object.cumulative_nfts_up_to_ending_range++;
                        }
                    })
                }

                //logger.info("Final if :",wall_object)
                const wall_object_copy = {...wall_object}
                wall_array.push(wall_object_copy)
                i--
                breaker = true
            }

            //logger.info("wall array: ",wall_array)
        }
        //------------------------------------------------------------------------------------------------------------------
        // PART MANAGING THE WALL THINNESS
        // THIS just creates an object for each price counting how many NFTS were listed for less
        const thinness_array = []

        for (let i = 0; i < price_array.length; i++) {
            //logger.info(i)
            let thinness_obj = {
                price: price_array[i],
                cumulative_nfts_up_to_price: null,
            }
            //logger.info(thinness_obj)
            for (let price in price_array){
                if(price_array[price] > thinness_obj.price){
                    //logger.info("price_array[price]", price_array[price], "i", i)
                    i = price - 1;
                    break;
                }
            }

            thinness_obj.cumulative_nfts_up_to_price = i + 1
            thinness_array.push(thinness_obj)
        }

        // removing duplicates created if the price of the last object is ended
        for (let obj_index in thinness_array){
            const index = parseInt(obj_index)
            if( thinness_array[index + 1] && thinness_array[index].price === thinness_array[index + 1].price){
                thinness_array.splice(index, 1)
            }
        }

        //__________________________________________________________________________________________________________________
        //logger.info("thinness_array: ",thinness_array)
        //logger.info("wall_array: ",wall_array)
        //__________________________________________________________________________________________________________________

        return {
            floor_wall_array: wall_array,
            floor_thinness_array: thinness_array,
        }
    }
    catch (error) {
        logger.info("Error in floor_thinness_and_wall in mongo_push_daily_floor: ", collection_stats.address, "\n", error)
        return false
    }

}
exports.floor_thinness_and_wall =floor_thinness_and_wall

/*
// This part creates the wall object and manages the other info not previously created
        for (let price of price_array){
            if(price >= wall_object.starting_range && price < wall_object.ending_range  && price_array[i] !== price_array.length -1 ){
                //logger.info(price)
                wall_object.n_nfts_in_range ++;
                wall_object.cumulative_nfts_up_to_ending_range ++;
            }
            // Reset the loop if the price is bigger than the wall object
            else if (price > wall_object.ending_range){
    // THis creates a copy of the wall object and pushes it into the array, pushing the wall object would
    // also copy all the references, thus when resetting the wall obj it would also modify the object in the array
    //logger.info(price)


    if(i == 0 || wall_object.n_nfts_in_range > 0){
        //logger.info(wall_object)
        const wall_object_copy = {...wall_object}
        wall_array.push(wall_object_copy)
        wall_object.n_nfts_in_range = 0
        wall_object.starting_range = null;
        wall_object.ending_range = null;
        i = price_array.indexOf(price) - 1
    }
    // TEST PER AGGREGARE GLI OBJECT VUOI E PRESENTARE I GAP IN FLOOR
    else if (wall_object.n_nfts_in_range === 0){
        //logger.info("PENE: ","price: ",price, "pistola: ", price_array[price_array.indexOf(price) + 1], "gigolo", (wall_object.ending_range + wall_constant_adjusted ))
        if(price_array[price_array.indexOf(price) + 1] < wall_object.ending_range + wall_constant_adjusted ){
            const wall_object_copy = {...wall_object}
            wall_array.push(wall_object_copy)
        }
    }
    break;
}
}
 */
