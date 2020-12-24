var storage = function(){

	var defaultKey = [];

	this.setDefaultKey = function(key){
		defaultKey = key;
	}

	this.keys = {};

	this.messages = {};
	this.modifiedMessages = {};
	this.messagesState = {};
	this.nonVKEMessages = {};
	this.messagesColor = {};
	this.dialogsMessages = {};
	this.temporaryMessagesIds = [];

	this.exchangePublicKeys = {};
	this.exchangePrivateKeys = {};
	this.exchangeHandledIdentifiers = {};
	this.exchangeSecretKeys = {};

	this.addKey = function(key, path){
		keys[path] = key;
	};

	this.getKey = function(path){
		if (this.keys[path] != null){
			return this.keys[path];
		}
		return defaultKey;
	};

	this.storeOriginalMessage = function(id, dialog, author, message){
		this.messages[id] = { author : author, message : message };
		this.setMessageState(id, false);
		if (!this.dialogsMessages[dialog]) this.dialogsMessages[dialog] = [];
		this.dialogsMessages[dialog].push(id);
	};

	this.getOriginalMessage = function(id){
		if (this.messages[id]){
			return this.messages[id];
		}
		else{
			return null;
		}
	};

	this.isCached = function(id){
		return ((id in modifiedMessages) || (id in nonVKEMessages) || (messagesState[id]));
	};

	this.storeModifiedMessage = function(id, author, message){
		this.modifiedMessages[id] = { author : author, message : message };
		this.setMessageState(id,true);
	};

	this.getModifiedMessage = function(id){
		if (this.modifiedMessages[id]){
			return this.modifiedMessages[id];
		}
		else{
			return null;
		}
	};

	this.clearMessagesInfo = function(){
		this.messages = {};
		this.modifiedMessages = {};
		this.messagesState = {};
		this.nonVKEMessages = {};
		this.dialogsMessages = {};
		this.messagesColor = {};
		this.temporaryMessagesIds = [];
	};

	this.clearExchangeInfo = function(){
		this.exchangePublicKeys = {};
		this.exchangePrivateKeys = {};
		this.exchangeHandledIdentifiers = {};
		this.exchangeSecretKeys = {};
	};

	this.clearKeys = function(){
		this.keys = {};
	};

	this.clearAll = function(){
		clearMessagesInfo();
		clearExchangeInfo();
		clearKeys();
	};

	this.messageEncryptionState = function(id){
		return this.messagesState[id];
	};

	this.setMessageState = function(id, state){
		this.messagesState[id] = state;
	};

	this.addNonVKEMessage = function(id){
		this.nonVKEMessages[id] = true;
	};

	this.setMessagesColor = function(id, color){
		this.messagesColor[id] = color;
	};

	this.resetDialogMessagesState = function(dialog){
		if (!this.dialogsMessages[dialog]) return;
		for (var i = 0; i < this.dialogsMessages[dialog].length; i++) {
			setMessageState(this.dialogsMessages[dialog][i], false);
		}
	};

	this.belongsToDialog = function(dialog, id){
		if (!this.dialogsMessages[dialog]) return false;
		return this.dialogsMessages[dialog].indexOf(id) != -1;
	};

	this.storeExchangePrivateKey = function(key, identifier){
		this.exchangePrivateKeys[identifier] = key;
	};

	this.storeExchangePublicKey = function(key, identifier){
		this.exchangePublicKeys[identifier] = key;
	};

	this.getExchangePrivateKey = function(identifier){
		if (!this.exchangePrivateKeys[identifier]) return false;
		return this.exchangePrivateKeys[identifier];
	};

	this.getExchangePublicKey = function(identifier){
		if (!this.exchangePublicKeys[identifier]) return false;
		return this.exchangePublicKeys[identifier];
	};

	this.isExchangeRequestHandled = function(identifier){
		return this.exchangeHandledIdentifiers[identifier];
	}

	this.setExchangeRequestAsHandled = function(identifier){
		this.exchangeHandledIdentifiers[identifier] = true;
	}

	this.setExchangeSecretKey = function(identifier, key){
		this.exchangeSecretKeys[identifier] = key;
	}

	this.getExchangeSecretKey = function(identifier){
		if (!this.exchangeSecretKeys[identifier]) return false;
		return this.exchangeSecretKeys[identifier];
	}

	this.addTemporaryMessageId = function(id){
		this.temporaryMessagesIds.push(id);
	}

	this.setPermanentMessageId = function(oldId, newId){
		// Process all of the messages in storage to replace old message id with new one
		this.messages[newId] = this.messages[oldId];
		if (this.modifiedMessages[oldId]) this.modifiedMessages[newId] = this.modifiedMessages[oldId];
		if (this.messagesColor[oldId]) this.messagesColor[newId] = this.messagesColor[oldId];
		this.messagesState[newId] = false;
		var dialog = navigationModule.key;
		if (!this.dialogsMessages[dialog]) this.dialogsMessages[dialog] = [];
		this.dialogsMessages[dialog].push(newId);

		delete this.messages[oldId];
		if (this.modifiedMessages[oldId]) delete this.modifiedMessages[oldId];
		if (this.messagesColor[oldId]) delete this.messagesColor[oldId];
		if (this.messagesState[oldId]) delete this.messagesState[oldId];
		var index = this.dialogsMessages[dialog].indexOf(oldId);
		if (index != -1){
			this.dialogsMessages[dialog].splice(index, 1);
		}

		index = this.temporaryMessagesIds.indexOf(oldId);
		if (index != -1){
			this.temporaryMessagesIds.splice(index, 1);
		}
	}

	return this;
}();