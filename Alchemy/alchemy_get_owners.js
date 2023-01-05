const fetch = require('node-fetch');
require('dotenv').config({path: "../../.env"})
const {logger} = require("../utils/logger")
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
    minTime: 400,
    maxConcurrent: 3,
});

const limited_alchemy_get_owners = limiter.wrap(alchemy_get_owners);
exports.limited_alchemy_get_owners = limited_alchemy_get_owners

async function alchemy_get_owners(collection_address, pageKey) {
    try {

        const options = {
            method: 'GET',
            redirect: 'follow'
        };

        const apiKey = process.env.ALCHEMY_KEY
        //logger.info(apiKey)
        const baseURL = `https://eth-mainnet.alchemyapi.io/nft/v2/${apiKey}/getOwnersForCollection`;
        let url = null
        if(pageKey){
            url = `${baseURL}?contractAddress=${collection_address}&withTokenBalances=true&pageKey=${pageKey}`;
        }
        else{
            url = `${baseURL}?contractAddress=${collection_address}&withTokenBalances=true`;
        }


        const response = await fetch(url, options)
        const json = await response.json();

        return json


    } catch (error) {
        logger.info("Alchemy get owners error: \n",error)
        return false
    }
}
exports.alchemy_get_owners = alchemy_get_owners

//alchemy_get_owners("")

/*
if(i.ownerAddress ==="0x000000000000000000000000000000000000dead"){
                console.log(i.tokenBalances)
            }

{
  ownerAddress: '0x470e99a20f2dd39190a1df2ee2cd7726fa489d17',
  tokenBalances: [
    {
      tokenId: '0x0000000000000000000000000000000000000000000000000000000000000486',
      balance: 1
    }
  ]
}

 */

function test(){

    let object = {
        a : 1,
        b : [
            {lol: 2},
            {lol: 2},
            {lol: 2},
            {lol: 2},
        ]
    }

    let test = JSON.stringify(object)
    let test_2 = JSON.parse(test)

    let sum = 0
    let array = [1,3,5]
    array = array.sort((a,b)=>b-a)
    sum = array.slice(0,2).reduce((total, n)=> total + n)
    console.log(sum)
}

