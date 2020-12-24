var timeModule = function(){

	if (!Date.now) {
    	Date.now = function() { return new Date().getTime(); };
	}

	this.timestamp = 0;
	this.seed = 0;

	this.unixtimeStamps = {};
	this.ids = {};

	this.generateUnixtime = function(){
		this.timestamp = Math.floor(Date.now() / 100);
		return this.timestamp;
	};

	this.generateSeed = function(){
		// 0x100000000
		this.seed = Math.floor(Math.random()*4294967296);
		return this.seed;
	};

	this.getLastUnixtime = function(author){
		if (author == null){
			if (this.timestamp){
				return this.timestamp;
			}
			return this.generateUnixtime();
		}
		else{
			// Get latest available unixtime for the exact user
			if(ids[author]){
				if (unixtimeStamps[sender]){
					return unixtimeStamps[sender];
				}
			}
			return false;
		}
	};

	this.getLastSeed = function(){
		if(this.seed){
			return this.seed;
		}
		return this.generateSeed();
	};

	this.setLastUnixtime = function(sender,time,id){

		if(ids[sender]){
			if (ids[sender] < id){
				ids[sender] = id;
				if (unixtimeStamps[sender] < time){
					unixtimeStamps[sender] = time;
				}
			}
		}
		else{
			ids[sender] = id;
			unixtimeStamps[sender] = time;
		}

	};

	this.checkLastUnixtime = function(sender,time,id){

		if(ids[sender] && (ids[sender] < id) && (unixtimeStamps[sender] >= time)){
			return false;
		}
		
		return true;
	};

	return this;
}();