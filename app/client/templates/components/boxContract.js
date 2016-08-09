/**
Template Controllers

@module Templates
*/

/**
The vendor contract template.

@class [template] components_boxContract
@constructor
*/

// Construct Multiply Contract Object and contract instance
var contractInstance;
var contractAddr;
var aFee;
var latestTime;
var theContractEndDate;

// box Stuff
var startTime;
var disturbedDuration;
var lastDisturbed;
var bounty;

var boxcontractContract = web3.eth.contract([{"constant":false,"inputs":[{"name":"_boxID","type":"address"}],"name":"endBox","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"commandCenter","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"bPayout","type":"uint256"},{"name":"cPayout","type":"uint256"},{"name":"_boxID","type":"address"},{"name":"change","type":"uint256"}],"name":"payoutBox","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"minShippingCost","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"Boxes","outputs":[{"name":"bounty","type":"uint256"},{"name":"disturbedDuration","type":"uint256"},{"name":"lastDisturbed","type":"uint256"},{"name":"onTrip","type":"bool"},{"name":"currentCourier","type":"address"},{"name":"sender","type":"address"}],"type":"function"},{"constant":false,"inputs":[],"name":"recordBoxFixed","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"_boxID","type":"address"},{"name":"_currentCourier","type":"address"}],"name":"startBox","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"_currentCourier","type":"address"}],"name":"recordBoxDisturbed","outputs":[],"type":"function"},{"inputs":[],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"boxID","type":"address"},{"indexed":true,"name":"courier","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"}],"name":"LogBoxDisturbed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"boxID","type":"address"},{"indexed":true,"name":"courier","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"}],"name":"LogBoxFixed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"boxID","type":"address"},{"indexed":true,"name":"courier","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"},{"indexed":false,"name":"bounty","type":"uint256"}],"name":"LogStartTrip","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"boxID","type":"address"},{"indexed":true,"name":"courier","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"}],"name":"LogEndTrip","type":"event"}]);

function getIsValid(abool){
  if (abool)
  return "valid";
  else {
    return "not valid";
  }
};

function secondsToMinutes(sec){
  return sec/60;
}

function addToSignedTable(signer, datestamp) {
    var table = document.getElementById("signedTable");

    var row = table.insertRow(table.length);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    cell1.innerHTML = signer;
    cell2.innerHTML = Helpers.formatTime(datestamp,"YYYY-MM-DD hh:mm");
}
function addToPaymentTable(productID, machineID, paymentAmount, datestamp) {
    var table = document.getElementById("paymentTable");

    var row = table.insertRow(table.length);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var cell4 = row.insertCell(3);

    cell1.innerHTML = productID;
    cell2.innerHTML = machineID;
    cell3.innerHTML = web3.fromWei(paymentAmount);
    cell4.innerHTML = Helpers.formatTime(datestamp,"YYYY-MM-DD hh:mm");;
}

function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

function qualityPayListener(myContract){
  var onTrip = false;
  var disturbed = false;
  // var startTime;
  // var disturbedDuration = 0;
  // var lastDisturbed;
  // var bounty;
  var leeway = 60;

  console.log("Setting contract Listeners")

  var StartingTrip = qualityPay.LogStartTrip();
  StartingTrip.watch(function(error, result){
      if (!error){
        console.log("*********************************************************************************");
        console.log("Box " + result.args.boxID + " is starting trip with courier " + result.args.courier + " at "+ timeConverter(result.args.timestamp) +"!");
        console.log("*********************************************************************************");
        onTrip = true;
        startTime = result.args.timestamp;
        bounty = result.args.bounty;
      }
      else {
        console.log("oops something went wrong...");
      }
  });

  var BoxDisturbed = qualityPay.LogBoxDisturbed();
  BoxDisturbed.watch(function(error, result){
      if (!error && onTrip){
        console.log("*********************************************************************************");
        console.log("Box " + result.args.boxID + " with courier " + result.args.courier + " at "+ timeConverter(result.args.timestamp) +" has been disturbed!");
        console.log("*********************************************************************************");
        lastDisturbed = result.args.timestamp;
        disturbed = true;
      }
      else {
        console.log("oops something went wrong...")
      }
  });

  var BoxFixed = qualityPay.LogBoxFixed();
  BoxFixed.watch(function(error, result){
    console.log(error + " " + onTrip + " " + disturbed);
      if (!error){
        if (onTrip){
          if (disturbed){
            disturbedDuration += result.args.timestamp - lastDisturbed;
            console.log("*********************************************************************************");
            console.log("Box " + result.args.boxID + " with courier " + result.args.courier + " at "+ timeConverter(result.args.timestamp) +" has been fixed!");
            console.log("Box has been disturbed for a total of " + disturbedDuration + " seconds on this trip.");
            console.log("*********************************************************************************");
            disturbed = false;
          } else {
            console.log("Failed because disturbed == false");
          }
        } else {
          console.log("Failed because onTrip == false");
        }
      } else {
        console.log("oops something went wrong...");
        console.log(error + " IS BAD!!!!");
      }
  });

  var EndingTrip = qualityPay.LogEndTrip();
  EndingTrip.watch(function(error, result){
      if (!error && onTrip){
        var disturbedCost = disturbedDuration * 1000000000000000;
        var payout = bounty - disturbedCost;
        var bPayout = .1 * payout;
        var cPayout = .9 * payout;
        console.log("*********************************************************************************");
        console.log("Box " + result.args.boxID + " is ending trip with courier " + result.args.courier + " at "+ timeConverter(result.args.timestamp) +"!");
        console.log("The Box was disturbed for " + disturbedDuration + " seconds out of a trip " + (result.args.timestamp - startTime) + " seconds long.");
        console.log("The original services payout is " + web3.fromWei(bounty) + " - " + web3.fromWei(disturbedCost) + " for the box disturbances for a total of " + web3.fromWei(payout);
        console.log("10% goes to the box to cover transaction fees, refunds, maintenance. 90% goes to the courier.");
        console.log("So " + web3.fromWei(bPayout) + " goes to the box to cover transaction fees, refunds, maintenance. " + web3.fromWei(cPayout) + " goes to the courier.");
        console.log("*********************************************************************************");
        // payout to the courier 
        // estimatedGasCost = eth.estimateGas({from:eth.coinbase,to:qualitypay.address,data:qualitypay.payoutBox.getData(payout,eth.accounts[1])});
        qualityPay.payoutBox(bPayout, cPayout, result.args.boxID, disturbedCost, {from: eth.coinbase, gas: 3423232});

        disturbedDuration = 0;
        onTrip = false;
      }
      else {
        console.log("oops something went wrong...");
      }
  });
}


// When the template is rendered
Template['components_boxContract'].onRendered(function(){
    TemplateVar.set('state', {isNotAddressed: true});
});

Template['components_boxContract'].helpers({

	/**
	Get multiply contract source code.

	@method (source)
	*/

	'source': function(){
		return source;
	},
});

Template['components_boxContract'].events({

	/**
	On "Create New Contract" click

	@event (click .btn-default)
	*/

  "click [data-action='findContract']": function(event, template){
        TemplateVar.set('state', {contractExists: true});

        contractAddr = template.find("#boxDeploymentAddress").value;
        console.log("Found contract at: " + contractAddr);

        contractInstance = boxcontractContract.at(contractAddr);

        // call MultiplyContract method `multiply` which should multiply the `value` by 7

        contractInstance.cycleEndDate.call(function(err, result){
          theContractEndDate=result;
            latestTime = web3.eth.getBlock('latest').timestamp;
            if (result > latestTime){
              aCycleEndDate=Helpers.formatTime(result,"YYYY-MM-DD hh:mm:ss");
            } else {
              aCycleEndDate="N/A";
            }
            TemplateVar.set(template, 'aCycleEndDate', aCycleEndDate);
            console.log("CYCLE END DATE" + aCycleEndDate);

            if(err)
              console.log("Error when calling for fee");
        });

		    contractInstance.fee.call(function(err, result){
            aFee=web3.fromWei(result);
            TemplateVar.set(template, 'aFee', aFee);

            if(err)
              console.log("Error when calling for fee");
        });

        contractInstance.cycle.call(function(err, result){
            aCycleNum=result.toNumber(10);
            aCycle=secondsToMinutes(aCycleNum)+" minutes";
            TemplateVar.set(template, 'aCycle', aCycle);

            if(err)
              console.log("Error when calling for fee");
        });

        contractInstance.vendorKey.call(function(err, result){
            aReceiver=result;
            TemplateVar.set(template, 'aReceiver', aReceiver);

            if(err)
              console.log("Error when calling for fee");
        });

        contractInstance.termsIPFSHash.call(function(err, result){
          ipfshash=result;
            TemplateVar.set(template, 'aIPFSHash', ipfshash);

            if(err)
              console.log("Error when calling for fee");
        });
        contractInstance.vendorPayoutPercentage.call(function(err, result){
          aPercent=result.toNumber(10);
          TemplateVar.set(template, 'aPercent', aPercent);

          if(err)
            console.log("Error when calling for fee");
        });

        contractInstance.isSigned.call(function(err, result){
          if (theContractEndDate > latestTime){
            isValid=getIsValid(result);
          } else {
            isValid="Not valid";
          }
          TemplateVar.set(template, 'aContractState', isValid);

          if(err)
            console.log("Error when calling for fee");
        });

        runContractListeners(contractInstance);

        TemplateVar.set(template, 'contractAddr', contractAddr);

        console.log("Found contract at: " + contractAddr);
  },



  "click [data-action='signContract']": function(event, template){
        TemplateVar.set('state', {contractExists: true});

        console.log("Found contract at: " + contractAddr);

        contractInstance = boxcontractContract.at(contractAddr);

        contractInstance.signContract.sendTransaction({from:web3.eth.accounts[2],value:web3.toWei(aFee),gas:4000000},function(err, result){
            if(err)
              console.log("Error when calling for fee");
        });
  },

  "click [data-action='refreshStatus']": function(event, template){

        contractInstance = boxcontractContract.at(contractAddr);
        contractInstance.cycleEndDate.call(function(err, result){
          theContractEndDate=result;
            latestTime = web3.eth.getBlock('latest').timestamp;
            if (result > latestTime){
              aCycleEndDate=Helpers.formatTime(result,"YYYY-MM-DD hh:mm:ss");
            } else {
              aCycleEndDate="N/A";
            }
            document.getElementById('conEnd').innerHTML = aCycleEndDate;
            console.log("CYCLE END DATE" + aCycleEndDate);

            if(err)
              console.log("Error when calling for fee");
        });

        contractInstance.isSigned.call(function(err, result){
          if (theContractEndDate > latestTime){
            isValid=getIsValid(result);
          } else {
            isValid="Not valid";
          }
          document.getElementById('conState').innerHTML = isValid;

          if(err)
            console.log("Error when calling for fee");
        });

  },


  "click [data-action='addRow']": function(event, template){

        console.log("FBolob: " + web3.eth.accounts[2]);
        myFunction();

  },

});