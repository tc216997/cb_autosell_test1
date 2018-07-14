require('dotenv').config();
const request = require('request');
const Gdax = require('gdax');
const sandboxUrl = 'https://api-public.sandbox.pro.coinbase.com';
const key = process.env.API_KEY;
const secret = process.env.API_SECRET;
const passphrase = process.env.PASSPHRASE;
const publicClient = new Gdax.PublicClient(sandboxUrl);
const authedClient = new Gdax.AuthenticatedClient(key, secret, passphrase, sandboxUrl);
let port = process.env.PORT || 5000;
let queue = [];


// run main function once and every 30 seconds after
main();
setInterval(() => {
  main()
}, 10000);

function main() {
  // cancel all open orders in case partial fill and latency
  authedClient.cancelOrders()
  .then((data) => {
    sweepAccounts();
  })
  .catch(err => {
    console.log(err)
  });
}

function checkMinimumSize(size, pair) {
  let minimum = {
    'BTC': '.001',
    'ETH': '.01',
    'LTC': '.1',
    'BCH': '.01',
  };
  return (parseFloat(size) >= parseFloat(minimum[pair]));
}

function sweepAccounts() {
  authedClient
  .getAccounts()
  .then(accounts => {
    accounts.map(account => {
      let isCrypto = account.currency === 'BTC' || account.currency === 'ETH' || account.currency === 'LTC' || account.currency === 'BCH';
      if (checkMinimumSize(account.balance, account.currency) && isCrypto) {
        console.log(`We have ${account.balance} ${account.currency}`);
        queue.push(account);
      }
    });
    convertToFiat();
  })
  .catch(err => {
    console.log(err);
  }); 
}

function convertToFiat() {
  queue.map(accountObj => {
    //get best bid
    let tradePair = `${accountObj.currency}-USD`;
    publicClient
      .getProductOrderBook(tradePair)
      .then(data => {
        // only allow orders to execute if there are bids
        if (data.bids.length !== 0) {
          // [price, size, num-orders]
          let bookSize = data.bids[0][1];
          let bidPrice = data.bids[0][0];
          let ourSize = accountObj.available;
          console.log(`order book available to absorb: ${bookSize} ${accountObj.currency}`);
          // sell everything if our size is less than or equal to the book bid size
          if (parseFloat(ourSize) <= parseFloat(bookSize)) {
            let sellParam = prepSell(bidPrice, ourSize, tradePair);
            fireSellOrder(sellParam, tradePair, ourSize);
          } else {
            // sell what the book can absorb, and come back around
            let sellParam = prepSell(bidPrice, bookSize, tradePair);
            fireSellOrder(sellParam, tradePair, bookSize);
          }
        } else {
          // no bids are available. loop again
          console.log('No bids are available!\n')
        }
        // find and remove item from queue
        queue = queue.filter(object => object !== accountObj);
      })
      .catch(err => {
        console.log(err);
      })
  });
}

function prepSell(bestPrice, lotSize, pair) {
  return {
    price: bestPrice,
    size: lotSize,
    product_id: pair
  };
}

function fireSellOrder(param, pair, size) {
  authedClient
  .sell(param)
  .then((data) => {
    console.log(`Order placed for ${pair} for ${size} amount\n`)
  })
  .catch(err => {
    console.log(err)
  });  
}


