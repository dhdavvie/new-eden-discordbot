var Discord = require('discord.js');
var feed = require("feed-read");
var moment = require('moment');
var config = require('./config');
var data = require('./data.js');
var zkill = require('./zkill.js');
var fs = require('fs');
var fits = require('./fits');
//get cleverbot ready
var Cleverbot = require('cleverbot-node');
cleverbot = new Cleverbot;
//set up youtube api
var YouTube = require('youtube-node');
var youtube = new YouTube();
youtube.setKey(config.youtube_api_key);
youtube.addParam('channelId', 'UCwF3VyalTHzL0L-GDlwtbRw'); //Eve online channel
youtube.addParam('order', 'date'); //sort by date


//various variables
var seconds = config.timer;
var timer = seconds * 1000;//timer for how often to check for updates
var channel;
var botOn = false;
var cleverBotOn = false;

console.log( getTime() + " - Starting Discord Bot");

//set up discord connection
var options = {
	autoReconnect : true
};
var bot = new Discord.Client(options);
bot.login(config.discord.token);

//function to return current time in neat format
function getTime() {
	var time = "["+moment().format('D/M/YY - h:mm:ss a')+"]";
	return time;
}

//check the user to see if they have the right to the command
function checkUser(username) {
	//Could be done using indexOf() but this allows for better error reporting I think
	for (var i = 0; i < config.admins.length; i++){
		if (username === config.admins[i]) return 1; //User is allowed to turn bot on
	}
	console.log(getTime() + " - Unauthorized use of Bot by:" + username);
	return 0 //User is not an admin and therefor can't turn it on
}

function logOutput(message) {
	console.log(getTime() + ' - Sent message: ${message.content}')
}

bot.on("ready", () => {
	console.log(getTime() + " - Bot is ready");
	bot.user.setStatus("online","Cocaine Simulator 2017");
});

bot.on('error', (error) => {
	bot.login(config.discord.token);
});

bot.on("message", function(message){
	if(message.content === "!BotOn" && !botOn && checkUser(message.author.username) ) {
		botOn = true;
		cleverBotOn = true;
		console.log(getTime() + " - Bot being turned ON");

		message.channel.sendMessage("Bot turning ON!", function(err) {if(err) throw err;});

		setInterval(function(){ 

			feed("https://newsfeed.eveonline.com/en-US/2/articles/page/1/20", function(err, devblogs){
				if(err) throw err;
				if(!(devblogs[0].title === data.lastDevBlog.title)) {
					//data.lastDevBlog = devblogs[0]; //set new data.last article
					data.setDev(devblogs[0].title);
					console.log(getTime() + " - New dev blog: "+devblogs[0].link);
					message.channel.sendMessage(devblogs[0].link).then(message => logOutput(message)).catch(console.log);
				}
			});
			feed("https://newsfeed.eveonline.com/en-US/44/articles/page/1/20", function(err, evenews){
				if(err) throw err;
				if(!(evenews[0].title === data.lastEveNews.title)) {
					//data.lastEveNews = evenews[0]; //set new data.last article
					data.setNews(evenews[0].title);
					console.log(getTime() + " - New Eve news: "+evenews[0].link);
					message.channel.sendMessage(evenews[0].link).then(message => logOutput(message)).catch(console.log);
				}
			});
			feed("https://newsfeed.eveonline.com/en-US/15/articles/page/1/5", function(err, patchnotes){
				if(err) throw err;
				if(!(patchnotes[0].title === data.lastPatchNotes.title)) {
					//data.lastPatchNotes = patchnotes[0]; //set new data.last article
					data.setPatch(patchnotes[0].title);
					console.log(getTime() + " - New patch notes: "+patchnotes[0].link);
					message.channel.sendMessage(patchnotes[0].link).then(message => logOutput(message)).catch(console.log);
				}
			});
			youtube.search('', 1, function(err, results) {
				if (err) {
					console.log(err);
				} else {
					var ytLink = "https://www.youtube.com/watch?v="+results.items[0].id.videoId;
					if(!(ytLink === data.lastYtLink)) {
						data.lastYtLink = ytLink;
						console.log(getTime() + " - New Youtube Video: "+ytLink);
						message.channel.sendMessage(ytLink).then(message => logOutput(message)).catch(console.log);
					}
				}
			});
			fs.writeFile("./data.json", JSON.stringify(data));
		}, timer);
	}
	if(message.content === "!BotOff" && botOn && checkUser(message.author.username)) {
		botOn = false;
		cleverBotOn = false;
		console.log(getTime() + " - Bot being turned OFF");
		message.channel.sendMessage("Bot turning OFF!", function(err){if(err) throw err;});
	}

	if(message.content === "!CleverBotOn" && !cleverBotOn && checkUser(message.author.username)) {
		cleverBotOn = true;
		console.log(getTime() +" - Clevebot turning ON");
		message.channel.sendMessage("CleverBot turning ON!", function(err){if(err) throw err;});
	}
	if(message.content === "!CleverBotOff" && cleverBotOn && checkUser(message.author.username)) {
		cleverBotOn = false;
		console.log(getTime() +" - Clevebot turning OFF");
		message.channel.sendMessage("CleverBot turning OFF!", function(err){if(err) throw err;});
	}
	
	//Problem with nickname system, library not updated to support it
	if(message.isMentioned(bot.user) && cleverBotOn) {
		Cleverbot.prepare(function(){
			cleverbot.write(message.content.replace(/ *<[^>]*> */, ""), function(response){
				bot.reply(message, response.message, function(err){
					if(err) console.log(getTime() + " - error : "+message.channel.id+" " + err);
				});
			});
		});
	}

	if(message.content.indexOf("!SaveFit") > -1) {
		console.log(getTime() + " - Saving fit");
		message.content = message.content.replace('!SaveFit', "");
		fits.saveFit(message, function(result){
			message.channel.sendMessage(result, function(err){if(err) throw err;});
		});
	}

	if(message.content.indexOf("!GetFit") > -1) {
		console.log(getTime() + " - Retrieving fit");
		message.content = message.content.replace('!GetFit', "").trim();
		fits.getFit(message.content, function(result){
			message.channel.sendMessage(result.replace(/`/g, "'"), function(err){if(err) throw err;});
		});
	}

	if(message.content.indexOf("!Killstream") > -1 && checkUser(message.author.username)) {
		setInterval(function(){
			console.log("Killstream search...")
			zkill.main(message, timer);
		}, timer);
	}
});
