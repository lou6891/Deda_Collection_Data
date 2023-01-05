const express = require('express')
const app = express()
const { logger, readLog } = require('./utils/logger');
const {collections_data_main} = require("./collections_data_main")

require('dotenv').config({path: "./.env"})

const PORT = 9000

collections_data_main()


/*
NOT USING EXPRESS ANYMORE, SINCE USING EXPRESS MEANS THAT THE DOCKER CONTAINER DOESN'T END BUT KEEPS ON GOIGN

app.get("/logs", (req, res) =>{
    try{
        const result = readLog();
        res.set("Content-Type", "text/plain");
        return res.send(result)
    } catch (e){
        return res.sendStatus(500);
    }
})

// Execution tracker, it is false the first time only,
// when true even if someone logs into the server the function won't be called
let executed = false;

app.get('/',
    async (req, res) => {
        res.send('Hello world from create_collection_index_main')

        // function to avoid firing the past data function more than one by accident
        let one_execution = (function() {

            return async function() {
                if (!executed) {
                    executed = true;

                    collections_data_main()

                }
            };
        })();

        one_execution()

    })

app.listen(PORT, () => {
    logger.info('Server is up on ', PORT)
})

 */
