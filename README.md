# DEDA COLLECTION DATA

This program works for [DEDA](https://www.deda.app/)

It has the job retrieve the NFT collection data from different API endpoints, clean and modify them
and then upload the transformed data to the mongo db database, it runs once every hour.

--- 

To make it as automated as possible the function works as follows:
1. Gets information about the different currencies (ETH, BTC, EUR, USD)
   - There is a list used that controls which currencies the app needs
   - The function currencies_data_analyzers also check if the currency we are included is new or not, if 
   it's new it will also download the historical data
2. From mongo get a list of all the collection known at the moment
    - Each one categorized in Supported, partially supported and not supported
3. Depending on the support level of the collection it is filtered to a different function
   - There are 3 function that get the data, 2 for the supported one 1 for the partially supported
4. Once the data are obtained they are saved in the relative database

For this function to run there are 10 API endpoints that get the data, from 3 different providers
`Currently this program is running at limited capacity to avoid paying for the APIs`

This program is running as a docker container in AWS on a t2.micro machine, which is set up so that it starts at the
beginning of each hour and end when the function finishes to collect the data.

--- 
Technologies used:
1. Node JS
   - Express
   - Dotenv
   - log4js
   - mongodb
   - moralis
   - node-fetch
   - bottleneck
   - require
2. Docker
3. AWS EC2
4. MongoDB