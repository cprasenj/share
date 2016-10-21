var http = require('http');
var _ = require('lodash');
var exec = require('child_process').exec;

var command = "curl -s --user 'api:key-b058297bbb916a9026b9828ebd286d18' \
    https://api.mailgun.net/v3/sandbox511cc160f4a74545a7fca306dfcc31bf.mailgun.org/messages \
    -F from='Mailgun Sandbox <postmaster@sandbox511cc160f4a74545a7fca306dfcc31bf.mailgun.org>' \
    -F to='Prasenjit Chakraborty <prasenjitchk123@gmail.com>' \
    -F subject='Stock Alert' \
    -F text='You moght want to do something with the stocks %s' "

var googleFinanceUrl = 'http://finance.google.com/finance/info?client=ig&q=';
var exchange = 'NSE';

var stockList = ['VENKEYS', 'ITC'];
var stocksWithLimit = [
  {
    "symbol": 'VENKEYS',
    "sellPrice" : 650,
    "stopLossPrice": 520,
    "exchange": 'NSE'
  },
  {
    "symbol": "ITC",
    "sellPrice" : 280,
    "stopLossPrice": 230,
    "exchange": 'NSE'
  },
  {
    "symbol": "AVTNLP",
    "sellPrice" : 45,
    "stopLossPrice": 28,
    "exchange": 'NSE'
  },
  {
    "symbol": "JKTYRE",
    "sellPrice" : 185,
    "stopLossPrice": 140,
    "exchange": 'NSE'
  },
  {
    "symbol": "ICICIPRULI",
    "sellPrice" : 380,
    "stopLossPrice": 300,
    "exchange": 'NSE'
  },
  {
    "symbol": "SAIL",
    "sellPrice" : 60,
    "stopLossPrice": 38,
    "exchange": 'NSE'
  }
]

var excludeList = [];

var sendMail = function(command, message){
  command = command.replace('%s', message);
  exec(command, function(error, stdout, stderr){
    console.log("error", error);
    console.log("stdout", stdout);
    console.log("stderr", stderr);
  });
};
var actions = [_.partial(sendMail, command)];

var extractStockSummery = function(stockResponse) {
  return stockResponse.map(function(aStockDetail) {
    var details = {};
    details.symbol = aStockDetail.t;
    return details;
  })
};

var getMailMessage = function(extractedStockDetails) {
  return extractedStockDetails.map(function(detail) {
    return detail.symbol;
  }).join(',');
};

var takeAction = function(data) {
  actions.forEach(function(action) {
    return action(data);
  })
};

var isActioable = function(item, watchList) {
  console.log(item.t + ' last traded at ' + item.l);
  var watchListInfoForItem = _.find(stocksWithLimit, _.matchesProperty('symbol', item.t));
  var lastTradedPrice = item.l;

  var sellPriceDiff = watchListInfoForItem['sellPriceDiff'] - lastTradedPrice;
  var stopLossPriceDiff = lastTradedPrice - watchListInfoForItem['stopLossPrice'];
  if(sellPriceDiff < 5 || stopLossPriceDiff < 5) {
    return true;
  }
  return false;
};

var actionableItems = function(items) {
  var actionToBeTakenOn = items.filter((item) => {
    return isActioable(item, stocksWithLimit);
  });
  var filteredItems = _.difference(actionToBeTakenOn, excludeList);
  excludeList = _.concat(excludeList, filteredItems);
  return filteredItems;
};

var sleep = function(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

var getStockDetailsAndTakeAction = function(url, exchange, stockList) {
  var stringyfiedStockList =  _.map(stockList, (aStock) => {
    return exchange + ':' + aStock;
  }).join(',');
  http.get(_.add(url + stringyfiedStockList) , (res)=> {
    var body = '';
    res.on("data", function(chunk) {
      body+=chunk;
    });
    res.on('end', function() {
      body = JSON.parse(body.replace('//', ''));
      var alertItems = actionableItems(body);
      if(alertItems.length > 0) {
        _.flowRight(takeAction, getMailMessage, extractStockSummery)(alertItems);
      };
      console.log("Watching");
      for(i=1;i<10000000;i++){};
      getStockDetailsAndTakeAction(googleFinanceUrl, exchange, stockList);
    });
  }).on('error', (e)=> {
    console.log("error happened");
    console.log(e.message);
  })
};

getStockDetailsAndTakeAction(googleFinanceUrl, exchange, stockList);
// id     : ID,
// t      : StockSymbol,
// e      : Index,
// l      : LastTradePrice,
// l_cur  : LastTradeWithCurrency,
// ltt    : LastTradeTime,
// lt_dts : LastTradeDateTime,
// lt     : LastTradeDateTimeLong,
// div    : Dividend,
// yld    : Yield,
// s      : LastTradeSize,
// c      : Change,
// c      : ChangePercent,
// el     : ExtHrsLastTradePrice,
// el_cur : ExtHrsLastTradeWithCurrency,
// elt    : ExtHrsLastTradeDateTimeLong,
// ec     : ExtHrsChange,
// ecp    : ExtHrsChangePercent,
// pcls_fix: PreviousClosePrice
