// Constants
var rom_code = '0d4f6bd7-3a51-11e7-ae4c-5b62a123505b';
var status_channel = '';

var version = 'v2.4';
var rom = {};
var iv = Array.apply(null, new Array(252)).map(Number.prototype.valueOf,1);
var known = []; // keeps track of Pokemon already notified
var overload = 0; // tracks Discord notification overload

// 0) Discord gateway
function DiscordGateway() {
	var ws = new WebSocket('wss://gateway.discord.gg');
	gateway = JSON.stringify({
		"op": 2,
		"d": {
			"token": rom.keys.bot,
			"properties": {"$os": "linux", "$browser": "sometestingbrowser", "$device": "sometestingdevice", "$referrer": "", "$referring_domain": "",},
			"compress": true,
			"large_threshold": 250,
		}
	});
	setTimeout(function(){ws.send(gateway)}, 2 * 1000);
}


// 1) converts timecodes into legible times (call with no parameter for time now)
function time(timecode) {
    if (typeof timecode == 'undefined') {var date = new Date();} else {var date = new Date(timecode);};
    var hours = date.getHours();
    var minutes = "0" + date.getMinutes();
    var seconds = "0" + date.getSeconds();
    return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
}


// 2) updates ROM and iv filter array
function ROMUpdate() {
	var xhr = new XMLHttpRequest;
	xhr.open('GET', 'https://jsonblob.com/api/jsonBlob/'+rom_code, false);
	xhr.onload = function() {
		if (xhr.status == 200) {
			try {rom = JSON.parse(xhr.response)} catch(error) {notifyD("Failed to parse ROM", status_channel)}
		} else {
			notifyD("Failed to fetch ROM; "+xhr.status, status_channel)
		}
	};
	xhr.send();

	for (i = 1, len = iv.length; i < len; i++) {
		if (!!rom.allTarget[i]) {
			iv[i] = -48;
			if (!!rom.allIV[i]) {iv[i] = rom.allIV[i]};
		} else {
			iv[i] = 0;
			if (!!rom.highIV[i]) {iv[i] = rom.highIV[i]};
		}
	}
}


// 3) converts Pokemon spawns into text notifications for Discord
function tellD(pokemon) {
	var iv_text = ''; var cp_text = ''; var moves_text = '';
	if (pokemon.attack != -1 && pokemon.defence != -1 && pokemon.stamina != -1){
		iv_text = Math.round(((pokemon.attack + pokemon.defence + pokemon.stamina)/45)*100) + '% | ';
	}
	if (pokemon.cp != -1) {cp_text = pokemon.cp + 'CP | '};
	if (pokemon.move1 != -1 && pokemon.move2 != -1) {moves_text = movesDict[pokemon.move1] + ' / ' + movesDict[pokemon.move2] + ' | '};

    // tries to retrieve postcode and suburb from OpenStreetMap
    urlrg = 'https://nominatim.openstreetmap.org/reverse?format=json&lat='+pokemon.center.lat+'&lon='+pokemon.center.lng;
    var xhs = new XMLHttpRequest();
	xhs.open('GET', urlrg, false);
	xhs.onload = function() {if (xhs.status != 200) {notifyD("Failure: OSM; "+xhs.status, status_channel)}};
	xhs.send();
    try {var address = JSON.parse(xhs.response).address; var suburb = address.suburb; var postcode = address.postcode;} catch(error) {}
    if (typeof postcode == 'undefined') {var postcode = "?"; };
    if (typeof suburb == 'undefined') {var suburb = ""; } else {var suburb = ' ' + suburb};
    if (postcode.indexOf(' ') != -1) {postcode = postcode.substr(0,postcode.indexOf(' '));};

    // tries to retrieve more-accurate postcode from postcodes.io, and replaces OSM postcode if successful, adds ? if not
    urlps = 'https://api.postcodes.io/postcodes?lat='+pokemon.center.lat+'&lon='+pokemon.center.lng;
    var xht = new XMLHttpRequest();
	xht.open('GET', urlps, false);
	xht.onload = function() {if (xht.status != 200) {notifyD("Failure: postcodes.io; "+xht.status,status_channel)}};
	xht.send();
    try {postcode = JSON.parse(xht.response).result[0].outcode;} catch(error) {postcode += '?'; };

    url = 'http://www.google.com/maps/place/' + pokemon.center.lat + ',' + pokemon.center.lng;

    var name = pokeDict[pokemon.id].name;
    if (pokemon.id == 201 && pokemon.form != 0) {name = name + ' ' + String.fromCharCode(pokemon.form + 64)}

    var expiry_time = time(pokemon.despawn*1000);
    var rem_time = timeToString(pokemon.remainingTime());

    return name+' | '+iv_text+cp_text+postcode+suburb+' | '+rem_time+' (until '+expiry_time+') | '+moves_text+url;
}


// 4) converts Pokemon spawns into map image url
function StatIm(pokemon) {
    return 'https://maps.googleapis.com/maps/api/staticmap?markers='+pokemon.center.lat+','+pokemon.center.lng+'&zoom=15&size=400x400&sensor=false&key='+rom.keys.google;
}


// 5) sends messages to Discord
function notifyD(content, channel, embed_url) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', "https://discordapp.com/api/channels/"+channel+"/messages", false);
    xhr.setRequestHeader('Authorization', 'Bot '+rom.keys.bot);
    xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.onload = function() {
		if (xhr.status != 200) {
			console.log('Failed to post; ' + xhr.status);
			if (xhr.status == 429) {overload++};
		}
	};
	var sender = '{"content":"'+content+'"';
	if (!!embed_url) {sender += ',"embed": {"image": {"url":"'+embed_url+'"}}}'} else {sender += '}'};
	xhr.send(sender);
	if (!!embed_url) {console.log('[I] ['+channel+'] '+content)} else {console.log('['+channel+'] '+content)};
}


// 6) polls map for new desired Pokemon and returns list of Pokemon to notify
function poll() {
	output = [];
	for (i = 0, len = this.pokemons.length; i < len; i++) {
		test = this.pokemons[i];
		test.iv = (test.attack + test.defence + test.stamina) - 45;
		if (test.iv >= iv[test.id]) {
			if (indexOfPokemons(test,known) == -1) {
				known.push(test);
				output.push(test);
			};
		};
	};
	return output
}


// 7) for each Pokemon in list, runs tellD and StatIm, then selects channels and posts to them
function mail(list) {
	if (list.length != 0) {
		item = list.pop();
		var notif = tellD(item); var urlim = StatIm(item);
		// channel selection and posting
		if (!!rom.allTarget[item.id]) {
			notifyD(notif, rom.channels[rom.allTarget[item.id]], urlim);
			if (!!rom.secondTarget[item.id]) {
				if (!rom.secondIV[item.id] || (!!rom.secondIV[item.id] && item.iv >= rom.secondIV[item.id])) {
					notifyD(notif, rom.channels[rom.secondTarget[item.id]], urlim);
				};
			};
		};
		var highIVfilter = 0; if (!!rom.highIV[item.id]) {highIVfilter = rom.highIV[item.id]};
		if (rom.highchannel !="" && item.iv >= highIVfilter) {notifyD(notif, rom.channels[rom.highchannel], urlim)};
		// continue through list with delay = postdelay
		setTimeout(function(){mail(list)}, rom.postdelay*1000);
	}
}


// A) updates ROM from internet and refreshes Discord connection (every 20 minutes)
function load() {
// Discord gateway
	DiscordGateway();
// sets map filters (IV filter = 100%; select all)
	min_iv = 100; for (i = 1, len = 252; i < len; i++) {localStorage.setItem(i,1)};
// clears expired Pokemon
	j = known.length; while(j--){ if (known[j].remainingTime() < 0) {known.splice(j,1)} };
// updates ROM and IV filter
	setTimeout(ROMUpdate, 4 * 1000);
// checks overload and posts OK status
	var stat = version+' | '+rom.changelog+' | '+time()+' | '+known.length;
	if (overload != 0) {stat += (' | overload: ' + overload); overload = 0;};
	setTimeout(function(){notifyD(stat, status_channel)}, 6 * 1000);
}


// B) updates map, polls map, and mails Pokemon (every 20 seconds)
function loop(){
	try {reloadPokemons();} catch(error) {};
	setTimeout(function(){mail(poll())},2*1000);
	console.log('Ran at '+time());
}


// run load() every 20 minutes
load(); loader = setInterval(load, 20*60*1000);
// run loop() (poll() first time) every 20 seconds with 5 second offset
setTimeout(function() {poll(); timer = setInterval(loop, 20*1000);}, 5*1000);
