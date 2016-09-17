var request = require('request');
var utf8 = require('utf8');
var fs = require('fs');
var formidable = require("formidable");
var util = require("util");

var data = require('./data.js');
var config = require('./config');

var url = 'http://www.zkillboard.com/api/kills/no-attackers/no-items/corporationID/'+config.zkill_corp_id+'/limit/'
var limit = '20'
var options = {
  url: url + limit,
  headers: {
    'Accept-Encoding': 'gzip',
    'User-Agent': "David Heiberg/Echo Utrigas dhdavvie@gmail.com Discord Bot"
	}
};


function main(){
	var new_kills = []
	
	function callback(error, response, body){
		if(error) {
			console.log(error)
		}

		var lastID = data.lastKillID
		if(response.statusCode == 200){
			var kills = JSON.parse(body);
			if (lastID == 0) {
				new_kills.push(kills[0].killID);
				lastID = kills[0].killID;
			} else if (lastID) {
				//check if limit is big enough, otherwise double
				if (lastID < kills[kills.length-1].killID){
					limit = (parseInt(limit) * 2).toString();
					options.url = url + limit;
					request(options.url, callback);
				} else {
					for(var x = parseInt(limit)-1; x > -1; x--){
						if(lastID < kills[x].killID) {
							new_kills.push(kills[x].killID);
							lastID = kills[x].killID;
						}

					}
				}
			}
		}
		console.log(new_kills)
		data.setKillID(lastID)
	}



	function getKills(){
		var req = request(options.url, callback);
	}

	getKills()
	return new_kills
}


