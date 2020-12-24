var navigationModule = function(){

	this.key = "";
	this.author = "";

	var getRequestParams = function(prmstr){
	    var params = {};
	    var prmarr = prmstr.split("&");
	    for ( var i = 0; i < prmarr.length; i++) {
	        var tmparr = prmarr[i].split("=");
	        params[tmparr[0]] = tmparr[1];
	    }
	    return params;
	};

	// returns previous value if different
	this.updateNavigationState = function(address){

		var params = getRequestParams(address);

		var result = null;

		if (configuration.currentMode == configuration.desktopMode){

			// "sel" - general name for the selected dialog, be it conference or not.
			if (params["sel"]){
				if (this.key != params["sel"]) result = this.key;
				this.key = params["sel"];
			}
			else{
				this.key = "";
			}

			return result;
		}

		if (configuration.currentMode == configuration.mobileMode){
			// For mobile version - "peer" is used for dialogs, "chat" is used for conferences.
			if (params["peer"]){
				if (this.key != params["peer"]) result = this.key;
				this.key = params["peer"];
			}
			else if (params["chat"]) {
				if (this.key != params["chat"]) result = this.key;
				this.key = "c" + params["chat"];
			}
			else{
				this.key = "";
			}

			return result;
		}
	};

	this.setAuthor = function(auth){
		if (this.author != auth){
			configuration.clearAll();
			this.author = auth;
		}
	};

	this.isConference = function(){
		// Desktop version conferences contains prefix "c" by default.
		// Mobile version conferences doesn't have prefixes, it is added here for convenience.
		return key.indexOf("c") != -1;
	};

	return this;
}();