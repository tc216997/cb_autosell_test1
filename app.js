// we start by importing the coinbase.pro module for nodeJS. No need to write our own since the library was provided for.
const Gdax = require('coinbase-pro');

// this is the url for the api
const url = 'https://api-public.sandbox.pro.coinbase.com';

// this is used to access the coinbase.pro public api endpoints
const publicClient = new Gdax.PublicClient(url);

// this is used to access coinbase.pro private api endpoints
const privateClient = new Gdax.AuthenticatedClient(process.env.API_KEY, process.env.API_SECRET, process.env.PASSPHRASE, url);

// create an empty array so we can queue orders to be fired
let queue = [];


// run the main function
main();
// this create an time loop of 10 seconds that keeps firing the main function
// It also stores the timerId in the event the loop has to be stopped in case of errors.
let timerId = setInterval(() => {
  main()
}, 10000);

// function name is name
function main() {
  // uses the private endpoint
  privateClient
  // first it cancels all pending order in case of partially filled orders because of latency
  .cancelOrders()
  .then((data) => {
    // checks the accounts
    sweepAccounts();
  })
  .catch(err => {
    // error catching in case something went wrong. prints the error message and error object in the console.
    console.log('Uh-oh. Something went wrong for function main()');
    console.log(err);
    // this stops the time loop and allows us to troubleshoot without wiping out the heroku logs
    clearInterval(timerId);
    timerId = null;  
  });
}

// this function checks the minimum size required to submit an order on coinbase.pro
// returns a boolean
function checkMinimumSize(size, pair) {
  let minimum = {
    'BTC': '.001',
    'ETH': '.01',
    'LTC': '.1',
    'BCH': '.01',
  };
  return (parseFloat(size) >= parseFloat(minimum[pair]));
}

// this function checks for accounts that has greater than minimum order size
// and queue up the orders
function sweepAccounts() {
  // uses the private endpoint
  privateClient
  // calls the getAccounts function
  .getAccounts()
  .then(accounts => {
    // loop through each account
    accounts.map(account => {
      // sets a bool where it only returns true for btc/eth/ltc/bch wallet
      let isCrypto = account.currency === 'BTC' || account.currency === 'ETH' || account.currency === 'LTC' || account.currency === 'BCH';
      // if the account is greater than or equal to minimum order size for the specific crypto and is a crypto
      if (checkMinimumSize(account.balance, account.currency) && isCrypto) {
        // prints on console the account balance and the account currency symbol
        console.log(`We have ${account.balance} ${account.currency}`);
        // push the order object to the queue array
        queue.push(account);
      }
    });
    // calls the sell to fiat function
    convertToFiat();
  })
  // error catching
  .catch(err => {
    // error catching in case something went wrong. prints the error message and error object in the console.
    console.log(`Uh-oh. Something went wrong for function sweepAccounts()`);
    console.log(err);
    // this stops the time loop and allows us to troubleshoot without wiping out the heroku logs
    clearInterval(timerId);  
    timerId = null;  
  }); 
}

// this function preps the order object and fires off the sell api function
function convertToFiat() {
  // loop through each order object in the queue array
  queue.map(accountObj => {
    
    //assign the trade pair symbol
    let tradePair = `${accountObj.currency}-USD`;
    
    // use the public endpoint
    publicClient
      // this fetches the current order book in regards to the current order object trade pair
      .getProductOrderBook(tradePair)
      .then(data => {
        // only allow orders to execute if there are bids
        // can't sell if there are 0 bids
        if (data.bids.length !== 0) {
          // data.bids returns a 2d array if there are bids
          // we're only interested in the bid size and bid price
          // here assign each to a named variable
          let bookSize = data.bids[0][1];
          let bidPrice = data.bids[0][0];
          // here we assigned what the size of our sell
          let ourSize = accountObj.available;
          // if the our sell is less than or equal to the size of the top order bid
          if (parseFloat(ourSize) <= parseFloat(bookSize)) {
            // we prep the sell object with our sell size
            let sellParam = prepSell(bidPrice, ourSize, tradePair);
            // we fire off the sell order
            fireSellOrder(sellParam, tradePair, ourSize);
          // if the book is less than what we want to sell, then we have to match the top order book size
          } else {
            // we prep the sell object with the top of the order book bid size
            let sellParam = prepSell(bidPrice, bookSize, tradePair);
            // fires off the sell
            fireSellOrder(sellParam, tradePair, bookSize);
          }
        // this is rare but in case there are no bids, we can't sell anything. 
        // we would have to come back around and wait for the bids to reappear.
        } else {
          // prints no bids are available
          console.log('No bids are available!\n')
        }
        // this creates a new array, filters out the current order object and assign it to the queue array
        // essentially this removes the order that has been executed.
        queue = queue.filter(object => object !== accountObj);
      })
      // error catching
      .catch(err => {
        // error catching in case something went wrong. prints the error message and error object in the console.
        console.log(`Uh-oh. Something went wrong for function convertToFiat()!`);
        console.log(err);
        // this stops the time loop and allows us to troubleshoot without wiping out the heroku logs
        clearInterval(timerId); 
        timerId = null;   
      })
  });
}

// this function preps the object to be ingested by coinbase.pro api for sell orders
function prepSell(bestPrice, lotSize, pair) {
  return {
    price: bestPrice,
    size: lotSize,
    product_id: pair
  };
}

// this function calls the coinbase.pro api sell function
function fireSellOrder(param, pair, size) {
  // uses the private endpoint
  privateClient
  // calls sell function
  .sell(param)
  .then((data) => {
    // prints our the order that was placed for the pair and the amount
    console.log(`Order placed for ${pair} for ${size} amount\n`)
  })
  // error catching
  .catch(err => {
    // error catching in case something went wrong. prints the error message and error object in the console.
    console.log(`Uh-oh. Something went wrong for function fireSellOrder() for ${pair}!`);
    console.log(err);
    // this stops the time loop and allows us to troubleshoot without wiping out the heroku logs
    clearInterval(timerId);  
    timerId = null;  
  });  
}