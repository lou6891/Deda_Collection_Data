const{logger} = require("../utils/logger")
const fetch = require("node-fetch");
//const sdk = require('api')('@reservoirprotocol/v1.0#2fkbk3fl6e9wi9x');
const skd = require('api')('@reservoirprotocol/v5.0#2fkbk3fl6e9wi9x');
require('dotenv').config({path: "../.env"})

const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 450, // pick a value that makes sense for your use case
});

const limited_reservoir_ask_listings = limiter.wrap(reservoir_ask_listings);
exports.limited_reservoir_ask_listings = limited_reservoir_ask_listings

async function reservoir_ask_listings (address, continuation){

    const api_key = process.env.RESORVOIR
    let data_tracker = null
    try {

        const initial_url = "https://api.reservoir.tools/orders/asks/v3?contracts=" + address.toLowerCase() +
         "&status=active&includePrivate=false&includeMetadata=false&includeRawData=false&sortBy=createdAt"
        const final_url = '&limit=1000'
        let url = null

        if(continuation){
            let middle_url = "&continuation=" + continuation.toString() + "&"
            url = initial_url + middle_url + final_url;
        }
        else {
            url = initial_url + final_url;
        }

        const options = { method: 'GET',  headers: {Accept: '*/*', 'x-api-key': api_key} };

        const response = await fetch(url, options)
        const json = await response.json();
        data_tracker = response
        //logger.info(json.orders.length)

        return  json


    } catch (error) {
        logger.info("Error in reservoir ask listings, data returned: \n", data_tracker)
        logger.info("Error type: \n",error)
        return false
    }

}
//reservoir_ask_listings_test("0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e", null)

exports.reservoir_ask_listings = reservoir_ask_listings

/*
{
  id: '0x5067d218e26292346398108bd4a6271f49829d82c742e3a356b6c9f8fbe8bfe9',
  kind: 'seaport',
  side: 'sell',
  status: 'active',
  tokenSetId: 'token:0x8a90cab2b38dba80c64b7734e58ee1db38b8992e:7334',
  tokenSetSchemaHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  contract: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e',
  maker: '0x81d6e8dfde5d9ad36a0b3c303e21cf8975661ed0',
  taker: '0x0000000000000000000000000000000000000000',
  price: {
    currency: {
      contract: '0x0000000000000000000000000000000000000000',
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    amount: {
      raw: '15300000000000000000',
      decimal: 15.3,
      usd: 23754.21338,
      native: 15.3
    },
    netAmount: {
      raw: '14152500000000000000',
      decimal: 14.1525,
      usd: 21972.64738,
      native: 14.1525
    }
  },
  validFrom: 1662063097,
  validUntil: 1662667897,
  source: {
    id: '0x5b3256965e7c3cf26e11fcaf296dfc8807c01073',
    name: 'OpenSea',
    icon: 'https://raw.githubusercontent.com/reservoirprotocol/indexer/v5/src/models/sources/opensea-logo.svg',
    url: 'https://opensea.io/assets/0x8a90cab2b38dba80c64b7734e58ee1db38b8992e/7334'
  },
  feeBps: 750,
  feeBreakdown: [
    {
      bps: 250,
      kind: 'marketplace',
      recipient: '0x0000a26b00c1f0df003000390027140000faa719'
    },
    {
      bps: 500,
      kind: 'royalty',
      recipient: '0xd1f124cc900624e1ff2d923180b3924147364380'
    }
  ],
  expiration: 1662667897,
  isReservoir: null,
  createdAt: '2022-09-01T20:15:40.810Z',
  updatedAt: '2022-09-01T20:15:40.810Z'
}

 */
