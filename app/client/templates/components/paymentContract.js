/*
Template Controllers
@module Templates
*/

/*
The vendor contract template.

@class [template] components_vendorContract
@constructor
*/

// Construct Multiply Contract Object and contract instance
var contractInstance;
var contractAddr;
var minFee;
var boxData;



var startTime;
var disturbedDuration;
var lastDisturbed;
var bounty;

var qualitypayContract = web3.eth.contract([{"constant":false,"inputs":[{"name":"disturbType","type":"string"}],"name":"recordBoxFixed","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"_boxID","type":"address"}],"name":"endBox","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"commandCenter","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"bPayout","type":"uint256"},{"name":"cPayout","type":"uint256"},{"name":"_boxID","type":"address"},{"name":"change","type":"uint256"}],"name":"payoutBox","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"minShippingCost","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"Boxes","outputs":[{"name":"bounty","type":"uint256"},{"name":"disturbedDuration","type":"uint256"},{"name":"lastDisturbed","type":"uint256"},{"name":"onTrip","type":"bool"},{"name":"currentCourier","type":"address"},{"name":"sender","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"_boxID","type":"address"},{"name":"_currentCourier","type":"address"}],"name":"startBox","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"disturbType","type":"string"}],"name":"recordBoxDisturbed","outputs":[],"type":"function"},{"inputs":[],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"boxID","type":"address"},{"indexed":true,"name":"courier","type":"address"},{"indexed":false,"name":"disturbType","type":"string"},{"indexed":false,"name":"timestamp","type":"uint256"}],"name":"LogBoxDisturbed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"boxID","type":"address"},{"indexed":true,"name":"courier","type":"address"},{"indexed":false,"name":"disturbType","type":"string"},{"indexed":false,"name":"timestamp","type":"uint256"}],"name":"LogBoxFixed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"boxID","type":"address"},{"indexed":true,"name":"courier","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"},{"indexed":false,"name":"bounty","type":"uint256"}],"name":"LogStartTrip","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"boxID","type":"address"},{"indexed":true,"name":"courier","type":"address"},{"indexed":false,"name":"timestamp","type":"uint256"}],"name":"LogEndTrip","type":"event"}]);


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

function addToPayoutTable(party, payout, datestamp) {
    var table = document.getElementById("payoutTable");

    var row = table.insertRow(table.length);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    cell1.innerHTML = party;
    cell2.innerHTML = web3.fromWei(payout);
    cell3.innerHTML = Helpers.formatTime(datestamp,"YYYY-MM-DD hh:mm");
}
function addToEventTable(boxID, courierID, disturptionType, status, datestamp) {
    var table = document.getElementById("paymentTable");

    var row = table.insertRow(table.length);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var cell4 = row.insertCell(3);
    var cell5 = row.insertCell(4);

    cell1.innerHTML = boxID;
    cell2.innerHTML = courierID;
    cell3.innerHTML = disturptionType;
    cell4.innerHTML = status;
    cell5.innerHTML = Helpers.formatTime(datestamp,"YYYY-MM-DD hh:mm");;

}

function qualityPayListener(myContract){

  var disturbed = false;
  // var startTime;
  // var disturbedDuration = 0;
  // var lastDisturbed;
  // var bounty;
  var leeway = 60;

  console.log("Starting contract Listeners");

  var StartingTrip = myContract.LogStartTrip();
  StartingTrip.watch(function(error, result){
      if (!error){
        if(boxData[3]){
          console.log("Already on a Trip");
        } else {
          console.log("*********************************************************************************");
          console.log("Box " + result.args.boxID + " is starting trip with courier " + result.args.courier + " at "+ timeConverter(result.args.timestamp) +"!");
          console.log("*********************************************************************************");
          startTime = result.args.timestamp;
          bounty = result.args.bounty;
          disturbedDuration = 0;
        }
      }
      else {
        console.log("oops something went wrong...");
      }
  });

  var BoxDisturbed = myContract.LogBoxDisturbed();
  BoxDisturbed.watch(function(error, result){
      if (!error && boxData[3]){
        if(disturbedDuration === undefined){
          disturbedDuration = 0;
        }
        console.log("*********************************************************************************");
        console.log("Box " + result.args.boxID + " with courier " + result.args.courier + " at "+ timeConverter(result.args.timestamp) +" has been disturbed with " + result.args.disturbType + "!");
        console.log("*********************************************************************************");
        addToEventTable(result.args.boxID, result.args.courier, result.args.disturbType, "Start", result.args.timestamp);
        lastDisturbed = result.args.timestamp;
        disturbed = true;
      }
      else {
        console.log("oops something went wrong...");
      }
  });

  var BoxFixed = myContract.LogBoxFixed();
  BoxFixed.watch(function(error, result){
    console.log(error + " " + boxData[3] + " " + disturbed);
      if (!error){
        if (boxData[3]){
          if (disturbed){
            var penalty = firebase.database().ref('penalty');
            disturbedDuration += result.args.timestamp - lastDisturbed;
            penalty.set(disturbedDuration);
            console.log("*********************************************************************************");
            console.log("Box " + result.args.boxID + " with courier " + result.args.courier + " at "+ timeConverter(result.args.timestamp) +" has been fixed!");
            console.log("Box has been disturbed for a total of " + disturbedDuration + " seconds on this trip.");
            console.log("*********************************************************************************");
            document.getElementById('Penalties').innerHTML = disturbedDuration;
            disturbed = false;
            addToEventTable(result.args.boxID, result.args.courier, result.args.disturbType, "Ended after " + secondsToMinutes(result.args.timestamp - lastDisturbed) + " minutes", result.args.timestamp);
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

  var EndingTrip = myContract.LogEndTrip();
  EndingTrip.watch(function(error, result){
      if (!error && boxData[3]){
        if(disturbed){
          disturbedDuration += result.args.timestamp - lastDisturbed;
        }

        var disturbedCost = disturbedDuration * 1000000000000000;
        var payout = boxData[0] - disturbedCost;
        var bPayout = .1 * payout;
        var cPayout = .9 * payout;
        console.log("*********************************************************************************");
        console.log("Box " + result.args.boxID + " is ending trip with courier " + result.args.courier + " at "+ timeConverter(result.args.timestamp) +"!");
        console.log("The Box was disturbed for " + disturbedDuration + " seconds out of a trip " + (result.args.timestamp - startTime) + " seconds long.");
        console.log("The original services payout is " + web3.fromWei(bounty) + " - " + web3.fromWei(disturbedCost) + " for the box disturbances for a total of " + web3.fromWei(payout));
        console.log("10% goes to the box to cover transaction fees, refunds, maintenance. 90% goes to the courier.");
        console.log("So " + web3.fromWei(bPayout) + " goes to the box to cover transaction fees, refunds, maintenance. " + web3.fromWei(cPayout) + " goes to the courier.");
        console.log("*********************************************************************************");
        // payout to the courier 
        // estimatedGasCost = eth.estimateGas({from:eth.coinbase,to:myContract.address,data:myContract.payoutBox.getData(payout,eth.accounts[1])});
        addToPayoutTable("Change to Sender", disturbedCost, result.args.timestamp);
        addToPayoutTable("Payout to Courier", cPayout, result.args.timestamp);
        addToPayoutTable("Payout to Box", bPayout, result.args.timestamp);
        
        myContract.payoutBox(bPayout, cPayout, result.args.boxID, disturbedCost, {from: "0x334f5742b9ee85e4e1755ebaea071560e7033ae8", gas: 3423232});
        disturbedDuration = 0;
        boxData[3] = false;
        disturbed = false;
      }
      else {
        console.log("oops something went wrong...");
      }
  });
}

/***************************************************************
Template stuff
****************************************************************/

// When the template is rendered
Template['components_paymentContract'].onRendered(function(){
    TemplateVar.set('state', {isNotAddressed: true});
});

Template['components_paymentContract'].helpers({

	/*
	Get multiply contract source code.

	@method (source)
	*/

	'source': function(){
		return source;
	},
});

Template['components_paymentContract'].events({

	/*
	On "Create New Contract" click

	@event (click .btn-default)
	*/

  "click [data-action='findContract']": function(event, template){

        TemplateVar.set('state', {contractExists: true});

        contractAddr = template.find("#qualityPayAddress").value;
        console.log("Found contract at: " + contractAddr);

        contractInstance = qualitypayContract.at(contractAddr);

		    contractInstance.minShippingCost.call(function(err, result){
            minFee=web3.fromWei(result);
            TemplateVar.set(template, 'minFee', minFee);

            if(err)
              console.log("Error when calling for minShippingCost");
        });
        boxData = contractInstance.Boxes('0x0171d54c207ccf841352f3ea6c1f07750ee8cdec');
        TemplateVar.set(template, 'boxInfo', boxData);
        TemplateVar.set(template, 'boxID', '0x0171d54c207ccf841352f3ea6c1f07750ee8cdec');
        TemplateVar.set(template, 'bounty', boxData[0]);
        TemplateVar.set(template, 'disturbedDuration', boxData[1]);
        TemplateVar.set(template, 'lastDisturbed', boxData[2]);
        TemplateVar.set(template, 'onTrip', boxData[3]);
        TemplateVar.set(template, 'courierID', boxData[4]);
        TemplateVar.set(template, 'senderID', boxData[5]);

        qualityPayListener(contractInstance);

        TemplateVar.set(template, 'contractAddr', contractAddr);

        console.log("Found contract at: " + contractAddr);
  },
});
