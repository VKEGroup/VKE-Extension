
// Browser detection
// Firefox 1.0+
var _jQuery = jQuery;
if (typeof InstallTrigger !== 'undefined'){
    configuration.images.lock = browser.extension.getURL('icons/lock.png');
    configuration.images.unlock = browser.extension.getURL('icons/unlock.png');
    configuration.images.key = browser.extension.getURL('icons/key.png');
    configuration.images.newKey = browser.extension.getURL('icons/newkey.png');
    $ = jQuery;
}

// Safari 3.0+ "[object HTMLElementConstructor]" 
if (/constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || safari.pushNotification)){

}

// Internet Explorer 6-11
var isIE = /*@cc_on!@*/false || !!document.documentMode;
if(isIE){

}

// Edge 20+
if (!isIE && !!window.StyleMedia){

    configuration.images.lock = browser.extension.getURL('icons/lock.png');
    configuration.images.unlock = browser.extension.getURL('icons/unlock.png');
    configuration.images.key = browser.extension.getURL('icons/key.png');
    configuration.images.newKey = browser.extension.getURL('icons/newkey.png');
}

// Chrome 1+, Opera
var isChrome = !!window.chrome/* && !!window.chrome.webstore*/;
if (isChrome){
    configuration.images.lock = chrome.runtime.getURL('icons/lock.png');
    configuration.images.unlock = chrome.runtime.getURL('icons/unlock.png');
    configuration.images.key = chrome.runtime.getURL('icons/key.png');
    configuration.images.newKey = chrome.runtime.getURL('icons/newkey.png');
}

// 
var onDialogPage = false;

// 0 - NATIVE DIALOG
// 1 - VKE BOX
// 2 - PASSWORD BOX
var interfaceState = 0;
var browser = null;
var dialogObserver = null;
var messagesObserver = null;

var tmpMessageObserver = null;
var tmpMessagesObserved = 0;

// Global methods

var arrayEquality = function(a, b){
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
};

var toInt32 = function(number){
    if (!isNaN(number)){
        return number;
    }
    if (number.length > 4)
        return false;
    switch (number.length){
        case 4:
            return (number[0] << 24) + (number[1] << 16) + (number[2] << 8) + number[3];
        case 3:
            return (number[0] << 16) + (number[1] << 8) + number[2];
        case 2:
            return (number[0] << 8) + number[1];
        case 3:
            return number[0];
    }
};

var toBytesInt32 = function(num, size) {
    if (size == null){
        if (num > 0x00ffffff){
            return new Uint8Array([
                (num & 0xff000000) >> 24,
                (num & 0x00ff0000) >> 16,
                (num & 0x0000ff00) >> 8,
                (num & 0x000000ff)
            ]);
        } else if (num > 0x0000ffff){
            return new Uint8Array([
                (num & 0x00ff0000) >> 16,
                (num & 0x0000ff00) >> 8,
                (num & 0x000000ff)
            ]);
        } else if (num > 0x000000ff){
            return new Uint8Array([
                (num & 0x0000ff00) >> 8,
                (num & 0x000000ff)
            ]);
        } else {
            return new Uint8Array([
                (num & 0x000000ff)
            ]);
        }
    } else {
        if (isNaN(size) || size > 4 || size < 0){
            size = 4;
        }
        
        var arr = new Uint8Array([
            (num & 0xff000000) >> 24,
            (num & 0x00ff0000) >> 16,
            (num & 0x0000ff00) >> 8,
            (num & 0x000000ff)
        ]);
        return arr.slice(4 - size);
    }
};

function setMessage(){

    if (dialogObserver != null){
        return;
    }

    var target = null;
    if (configuration.currentMode == configuration.desktopMode){
        target = document.getElementById(configuration.nativeSelectors.vkBodyId);
    }

    if (configuration.currentMode == configuration.mobileMode){
        target = $(configuration.mobile.nativeSelectors.vkBody);
        if (target && target.length){
            target = target[0];
        }
    }

    if (target == null){
        return;
    }

    dialogObserver = new MutationObserver(mutationObserver);

    var config = { characterData: false, subtree: true, childList : true, attributes : true, attributeOldValue : true };

    dialogObserver.observe(target, config);

    setTimeout(function(){
        interfaceInit();
        mutationObserver([{}]);
    }, 250);
}

function prepareNativeDialogUi(){
    if (configuration.currentMode == configuration.desktopMode){
        $(configuration.nativeSelectors.windowContainer).css("min-height", "120px");
        $(configuration.nativeSelectors.chatHistoryContainer).css("border-bottom-width", "120px");
        $(configuration.nativeSelectors.buttonsContainer).css("top", "-20px");
    }

    if (configuration.currentMode == configuration.mobileMode){
        $(configuration.mobile.nativeSelectors.chatBox).css("min-height", "48px");
        $(configuration.mobile.nativeSelectors.windowContainer).css("min-height", "110px");
    }
}

function interfaceInit(){

    var iconContainer = null;
    var nativeForm = null;

    if (configuration.currentMode == configuration.desktopMode){
        iconContainer = $(configuration.nativeSelectors.attachmentButton).first();
        nativeForm = $(configuration.nativeSelectors.form).first();
    }

    if (configuration.currentMode == configuration.mobileMode){
        //.uMailWrite__main.Mention_inited - all controls (attach, edittext, smiles, send)
        //.uMailWrite__button.uMailWrite__buttonAttach - attach container (has onlick event)
        iconContainer = $(configuration.mobile.nativeSelectors.attachmentButton).first();
        nativeForm = $(configuration.mobile.nativeSelectors.formContainer).first();
    }

    var enableButton = $(configuration.vkeSelectors.enableCB);

    if (enableButton && enableButton.length){
        // Button initialized, no action needed.
    }
    else{
        // Add enable button.
        iconContainer.after(configuration.html.enableButton);

        var enableButton = $(configuration.vkeSelectors.enableCB);
        enableButton.on("click", toggleVKE);
        $(configuration.vkeSelectors.enableCBImage).attr("src", configuration.images.unlock);
    }

    var vkeForm = $(configuration.vkeSelectors.form);

    if (vkeForm && vkeForm.length){
        // VKE UI was initialized, reset.
        $(configuration.vkeSelectors.messageBox).val("");
        $(configuration.vkeSelectors.passwordField).val("");
        $(configuration.vkeSelectors.form).css("display", "none");
    }
    else{
        // Initialize VKE UI.
        nativeForm.append(configuration.html.form);

        var disableButton = $(configuration.vkeSelectors.disableCB).first();
        disableButton.on("click", toggleVKE);
        $(configuration.vkeSelectors.disableCBImage).attr("src", configuration.images.lock);

        var passwordButton = $(configuration.vkeSelectors.setPasswordButton).first();
        passwordButton.on("click", togglePasswordWindow);
        $(configuration.vkeSelectors.setPasswordButtonImage).attr("src", configuration.images.key);

        var generatePasswordButton = $(configuration.vkeSelectors.generatePasswordButton).first();
        generatePasswordButton.on("click", handlePasswordGeneration);
        $(configuration.vkeSelectors.generatePasswordButtonImage).attr("src", configuration.images.newKey);

        var showPassword = $(configuration.vkeSelectors.passwordDisplay);
        showPassword.on("change", toggleShowPassword);

        var okPassword = $(configuration.vkeSelectors.passwordOK);
        okPassword.on("click", passwordOK);

        var cancelPassword = $(configuration.vkeSelectors.passwordCancel);
        cancelPassword.on("click", passwordCancel);

        var chatbox = $(configuration.vkeSelectors.messageBox);
        chatbox.on("keydown", vkeEnter);

        var sendButton = $(configuration.vkeSelectors.messageSend);
        sendButton.on("click", vkeSendClick);
    }
}

function interfaceDeinit(){
    displayNativeVKDialog(true);

    displayPasswordDialog(false);
    displayVKEDialog(false);
    displayVKEForm(false);

    $(configuration.vkeSelectors.messageBox).val("");
    $(configuration.vkeSelectors.passwordField).val("");
}

function displayNativeVKDialog(display){

    var form = null;

    if (configuration.currentMode == configuration.desktopMode){
        form = $(configuration.nativeSelectors.windowContainer).first();
    }

    if (configuration.currentMode == configuration.mobileMode){
        form = $(configuration.mobile.nativeSelectors.windowContainer).first();
    }

    if (form){
        if (display){
            form.css("display", "");
        }
        else{
            form.css("display", "none");
        }
    }
}

function displayVKEForm(display){

    var form = $(configuration.vkeSelectors.form);

    if (display){
        form.css("display", "");
    }
    else{
        form.css("display", "none");
    }
}

function displayVKEDialog(display){

    var messageWindow = $(configuration.vkeSelectors.messageWindow);

    if (display){
        messageWindow.css("display", "");
    }
    else{
        messageWindow.css("display", "none");
    }
}

function displayPasswordDialog(display){
    var passwordWindow = $(configuration.vkeSelectors.passwordWindow);
    var setPasswordButton = $(configuration.vkeSelectors.setPasswordButton);
    var generatePasswordButton = $(configuration.vkeSelectors.generatePasswordButton);

    if (display){
        passwordWindow.css("display", "");
        setPasswordButton.css("display", "none");
        if (!navigationModule.isConference()){
            generatePasswordButton.css("display", "");
        };
    }
    else{
        passwordWindow.css("display", "none");
        setPasswordButton.css("display", "");
        generatePasswordButton.css("display", "none");
    }
}

function toggleVKE(){
    switch(interfaceState){
        case 0:
            displayVKEForm(true);
            displayVKEDialog(true);
            displayNativeVKDialog(false);
            interfaceState = 1;
            break;
        case 1:
            displayVKEForm(false);
            displayVKEDialog(false);
            displayNativeVKDialog(true);
            interfaceState = 0;
            break;
        case 2:
            displayPasswordDialog(false);
            displayVKEDialog(false);
            displayVKEForm(false);

            displayNativeVKDialog(true);
            interfaceState = 0;
            break;
    }
    initializeDialogHistory();
}

function togglePasswordWindow(){
    switch(interfaceState){
        case 0:
            return;
        case 1:
            displayPasswordDialog(true);
            displayVKEDialog(false);
            interfaceState = 2;
            break;
        case 2:
            displayPasswordDialog(false);
            displayVKEDialog(true);
            interfaceState = 1;
            break;
    }
}

function handlePasswordGeneration(){

    if (!interfaceState){
        return;
    }

    // Send request.
    var request = prepareExchangeRequest();
    request = encryptFully(request.value.package);
    sendMessage(request);

    // Close window.
    togglePasswordWindow();
}

function handlePasswordGenerationResponse(event){
    var result = event.data.exchangeResult;
    var button = event.data.button;
    var msg = event.data.message;
    var author = event.data.author;
    var messageId = event.data.messageId;

    var response = prepareExchangeRequest(result);
    
    button.css("display", "none");
    messageText = configuration.text.keyExchangeRequest;

    msg.text(messageText);
    storage.storeModifiedMessage(messageId, author, messageText);

    // Calculate and store by new identifier secret key (response identifier)
    var secretKey = keyexchangeModule.calculateSecretKey(result.value.publicKey, response.value.privateKey);
    storage.setExchangeSecretKey(response.value.identifier, secretKey);

    var encryptedResponse = encryptFully(response.value.package);
    sendMessage(encryptedResponse);
}

generateExchangedKey = function(exchangedKey){
    var xPart = exchangedKey.getX().toBigInteger().toByteArray();
    var yPart = exchangedKey.getY().toBigInteger().toByteArray();

    var passwordBytes = xPart.concat(yPart);
    if (passwordBytes.length > configuration.maxPasswordLength){
        passwordBytes = passwordBytes.slice(0, configuration.maxPasswordLength);
    }

    encryptModule.generateKey(new Uint8Array(passwordBytes), navigationModule.key);
}

function toggleShowPassword(){

    if (!interfaceState){
        return;
    }

    var passwordField = $(configuration.vkeSelectors.passwordField);
    if (passwordField.attr("type") == "password"){
        passwordField.attr("type", "text");
    }
    else{
        passwordField.attr("type", "password");
    }
}

function passwordOK(){

    if (!interfaceState){
        return;
    }

    var passwordField = $(configuration.vkeSelectors.passwordField);
    var passwordText = passwordField.val();
    var passwordBytes = new TextEncoder().encode(passwordText);
    if (passwordBytes.length > configuration.maxPasswordLength){
        alert(configuration.alerts.passwordIsTooLong);
        return false;
    }
    encryptModule.generateKey(passwordBytes, navigationModule.key);
    passwordField.val("");
    togglePasswordWindow();
}

function passwordCancel(){
    if (!interfaceState){
        return;
    }

    togglePasswordWindow();
}

function vkeEnter(key){

    if (!interfaceState){
        return;
    }

    if (configuration.currentMode == configuration.mobileMode){
        // Mobile messages should be sent by 'Send' button.
        return true;
    }

    if(key && key.which == 13){

        var textbox = $(configuration.vkeSelectors.messageBox);
        var message = textbox.val();

        if (key.shiftKey){
            // If user pressed Shift + Enter, do not send the message.
            return true;
        }

        if (key.ctrlKey){
            // If user pressed CTRL + Enter, do not send the message and append new line.
            message = message + '\n';
            textbox.val(message);
            return false;
        }

        if (message == ""){
            return false;
        }

        message = prepareText(message);
        if (message === false){
            alert(configuration.alerts.messageIsTooLong);
            return false;
        }

        message = encryptFully(message.value);

        textbox.val("");

        sendMessage(message);
        return false;
    }
    key.stopPropagation();
}

function vkeSendClick(){
    if (!interfaceState){
        return;
    }

    var textbox = $(configuration.vkeSelectors.messageBox);
    var message = textbox.val();

    if (message == ""){
        return;
    }

    message = prepareText(message);
    if (message === false){
        alert(configuration.alerts.messageIsTooLong);
        return;
    }

    message = encryptFully(message.value);

    textbox.val("");

    sendMessage(message);
    
    textbox.focus();
}

function mutationObserver(mutations){
    // Might help to decrease amount of mutations caused by extension itself
    disableMessagesObserver();
    initializeDialogHistory(mutations);
    enableMessagesObserver();
}

function initializeDialogHistory(mutations){
    var results = [];
    handleTmpMessages(mutations);
    var selector = null;

    if (configuration.currentMode == configuration.desktopMode){
        selector = configuration.nativeSelectors.vkIterateMessagesSelector;
    }

    if (configuration.currentMode == configuration.mobileMode){
        selector = configuration.mobile.nativeSelectors.vkIterateMessagesSelector;
    }

    $(selector).each(function(mes){
        try{
            var result = messageHandler(this);
            if (result){
                results.push(result);
            }
        }
        catch(e){
            // For debug purposes.
            // console.log(e);
        }
    });

    // After all messages were handled
    postMessageHandling(results);
}

function messageHandler(msg){
    var result = false;

    if ($(msg)){
        msg = $(msg);
    }

    var text = msg.text();

    var messageIdResult = getMessageIdentifier(msg);
    if (messageIdResult == null || messageIdResult.value == null){
        return;
    }

    var originalMessage = msg.html();
    var messageId = messageIdResult.value;
    var author = getMessageAuthor(msg);

    // Handle temporary message id
    if (messageIdResult.isTemporary && storage.temporaryMessagesIds.indexOf(messageId) == -1){
        // Message is temporary, id will be changed shortly as soon it will be delivered/processed
        storage.addTemporaryMessageId(messageId);
    }

    if(storage.nonVKEMessages[messageId]){
        return;
    }

    if (storage.getOriginalMessage(messageId) != null){

        if (!storage.belongsToDialog(navigationModule.key, messageId)) return;

        if (interfaceState == 0 && storage.messageEncryptionState(messageId)){
            storage.setMessageState(messageId, false);
            msg.html(storage.getOriginalMessage(messageId).message);
            msg.css("background", "");
            return;
        }
    }
    else{
        if (navigationModule.key != "")
            storage.storeOriginalMessage(messageId, navigationModule.key, author, originalMessage);
    }

    if (interfaceState == 0){
        return;
    }

    if (storage.getModifiedMessage(messageId) != null){
        if (!storage.messageEncryptionState(messageId)){
            storage.setMessageState(messageId, true);
            msg.html(storage.getModifiedMessage(messageId).message);
            msg.css("background", storage.messagesColor[messageId]);
        }

        return;
    }

    if (storage.isCached(messageId)){
        // If message was already handled but not saved for other reasons
        //! Check if this message is the request
        result = {
            actionIfNotLastMessage : function(){
                var exchangeText = configuration.text.keyExchangeRequest + configuration.text.keyExchangeRequestTimeout;
                msg.text(exchangeText);
                storage.storeModifiedMessage(messageId, author, exchangeText);
            }
        };
        return result;
    }

    var decryptedResult = decryptFully(text, author, messageId);

    if(decryptedResult.state){
        switch(decryptedResult.moduleKey){
            case configuration.textModuleKey:
                // Handle plain text messages

                // Sanitize message, but recreate lines formatting.
                var messageContent = decryptedResult.value.value;
                var messageStrings = messageContent.split('\n');

                var messageContainer = document.createElement("div");

                for (var i = 0; i < messageStrings.length; i++){
                    if (messageStrings[i]){
                        var lineSpan = document.createElement("span");
                        lineSpan.textContent = messageStrings[i];

                        messageContainer.appendChild(lineSpan);
                        messageContainer.appendChild(document.createElement("br"));
                    }
                }

                msg.html(messageContainer);

                storage.storeModifiedMessage(messageId, author, messageContainer);
                if (decryptedResult.warning){
                    storage.setMessagesColor(messageId, "palevioletred");
                }
                else{
                    storage.setMessagesColor(messageId, "lightgreen");
                }
                msg.css("background", storage.messagesColor[messageId]);
                break;

            case configuration.keyExchangeModuleKey:
                // Handle key exchange messages
                var exchangeMessage = keyexchangeModule.parsePackage(decryptedResult.value.value.package);
                storage.setMessagesColor(messageId, "sandybrown");
                msg.css("background", storage.messagesColor[messageId]);
                if (isNaN(exchangeMessage.value.secondIdentifier)){
                    // Incoming request
                    if (author == navigationModule.author){
                        // Our own request, no handlers required
                        msg.text(configuration.text.keyExchangeRequest);
                        storage.storeModifiedMessage(messageId, author, configuration.text.keyExchangeRequest);
                    }
                    else{
                        // Time check - initially each message could have a timeout, currently this idea is scrapped
                        // Generation completion check - to prevent additional handlers from displaying
                        // No storage usage - button cannot be cached and should be applied each time when user enables protected mode

                        var defaultAcion = function(){
                            var exchangeText = configuration.text.keyExchangeRequest + configuration.text.keyExchangeRequestTimeout;
                            msg.text(exchangeText);
                            storage.storeModifiedMessage(messageId, author, exchangeText);
                        };

                        result = {
                            actionIfNotLastMessage : function(){
                                defaultAcion();
                            },
                            actionIfLastMessage : function(){
                                if (storage.isExchangeRequestHandled(exchangeMessage.value.identifier) || navigationModule.isConference()){
                                    defaultAcion();
                                    return;
                                }

                                var exchangeText = configuration.text.keyExchangeRequest + configuration.text.keyExchangePressButton;
                                msg.text(exchangeText);
                                msg.append(configuration.html.responseKeyButton);
                                storage.setMessageState(messageId, true);
                                var exchangeButton = msg.find(configuration.vkeSelectors.responseKeyButton);
                                exchangeButton
                                  .attr("src", configuration.images.newKey)
                                  .on("click",  
                                  { 
                                    exchangeResult : exchangeMessage, 
                                    button : exchangeButton,
                                    message : msg,
                                    author : author,
                                    messageId : messageId 
                                  },
                                    handlePasswordGenerationResponse);
                            }
                        };
                    }
                }
                else{
                    // Incoming response, no handlers required
                    var messageText = "";
                    var secretKey = storage.getExchangeSecretKey(exchangeMessage.value.identifier);

                    if (author == navigationModule.author && secretKey){
                        // Our own request, set calculated and stored secret key
                        generateExchangedKey(secretKey);
                        messageText = configuration.text.keyIsGenerated;
                    }
                    else{
                        // Generate new password, save generation indication
                        if (!$.isEmptyObject(exchangeMessage.value.privateKey)){
                            // Calculate secret key
                            secretKey = keyexchangeModule.calculateSecretKey(exchangeMessage.value.publicKey, exchangeMessage.value.privateKey);
                            generateExchangedKey(secretKey);

                            messageText = configuration.text.keyIsGenerated;
                        }
                        else{
                            messageText = configuration.text.keyExchangeResponse;
                        }
                    }

                    msg.text(messageText);
                    storage.storeModifiedMessage(messageId, author, messageText);

                    // This message was handled
                    storage.setExchangeRequestAsHandled(exchangeMessage.value.secondIdentifier);
                }

                break;
        }
    }

    if (decryptedResult.errorMessage == errorModule.wrongHeader()){
        storage.addNonVKEMessage(messageId);
    }

    return result;
}

function getMessageIdentifier(msg){
    var result = {
        isTemporary : false,
        value : null
    };

    var messageId = null;

    // Desktop mode
    if (configuration.currentMode == configuration.desktopMode){
        var container = msg.parents(configuration.nativeSelectors.vkMessageContainerParentSelector);
        var element = container[0];
        messageId = container.attr(configuration.nativeSelectors.vkMessageIdAttribute);

        result.isTemporary = messageId.indexOf("rid") != -1;
        result.value = messageId;
    }

    // Mobile mode
    if (configuration.currentMode == configuration.mobileMode){

        var container = msg.parents(configuration.mobile.nativeSelectors.vkMessageContainerParentSelector);
        var element = container[0];
        var classes = element.className.split(' ');

        for (var i = 0; i < classes.length; i++){
            if (classes[i].indexOf(configuration.mobile.nativeSelectors.vkMessageServerIdClassPart) != -1){
                messageId = classes[i];
            }

            if (classes[i] == configuration.mobile.nativeSelectors.vkMessagePendingClass){
                result.isTemporary = true;
            }
        }

        result.value = messageId;
    }

    return result;
}

function getMessageAuthor(msg){

    var result = null;

    if (configuration.currentMode == configuration.desktopMode){
        result = msg.parents(configuration.nativeSelectors.messageGroupParent)
            .find(configuration.nativeSelectors.messageAuthorLinkSelector)
            .attr("href");
    }

    if (configuration.currentMode == configuration.mobileMode){
        result = msg.parents(configuration.mobile.nativeSelectors.vkMessageContainerParentSelector)
            .find(configuration.mobile.nativeSelectors.messageAuthorLinkSelector)
            .attr("href");
    }

    return result;
}

function postMessageHandling(messageResults){
    // Add key exchange button only on the last message
    if (messageResults.length > 0){
        var lastResult = messageResults[messageResults.length - 1];
        for (var i = 0; i < messageResults.length - 1; i++){
            if (messageResults[i].actionIfNotLastMessage){
                messageResults[i].actionIfNotLastMessage();
            }
        }

        if (lastResult.actionIfLastMessage){
            lastResult.actionIfLastMessage();
        }
    }
}

function sendMessage(message){

    if (configuration.currentMode == configuration.desktopMode){
        var nativebox = $(configuration.nativeSelectors.chatBox);
        var currentContent = nativebox.html();

        nativebox.html("");

        nativebox.append("<div>" + message + "</div>");
        
        $(configuration.nativeSelectors.sendButton).click();

        setTimeout(function(){nativebox.html(currentContent);}, 0);
    }

    if (configuration.currentMode == configuration.mobileMode){

        var nativebox = $(configuration.mobile.nativeSelectors.chatBox)[0];
        var currentContent = nativebox.value;

        nativebox.value = message;
        
        $(configuration.mobile.nativeSelectors.sendButton).click();

        setTimeout(function(){nativebox.value = currentContent;}, 0);
    }
}

function handleTmpMessages(mutations){
    if (configuration.currentMode == configuration.mobileMode){
        //! Currently no solution is found.
        //! Temporary messages optimization for mobile mode will be ignored.
        return;
    }

    if (mutations && storage.temporaryMessagesIds.length != 0){
        // There is at least one not yet sent message and mutations can have information about old/new message id
        var oldId = null;
        var newId = null;

        // Iterate through the whole dialog
        mutations.forEach(function(mutation){
            if (!oldId && mutation.removedNodes && mutation.removedNodes.length != 0){
                for (var i = 0; i < mutation.removedNodes.length; i++) {
                    var node = mutation.removedNodes[i];
                    if (node.attributes){
                        var attribute = node.attributes["data-msgid"];
                        if (attribute && storage.temporaryMessagesIds.indexOf(attribute.value) != -1){
                            oldId = attribute.value;
                        }
                    }

                    if (!oldId){
                        var removedMessages = $(node).find("[data-msgid]");
                        if (removedMessages){
                            for (var j = 0; j < removedMessages.length; j++) {
                                var node = removedMessages[j];
                                if (node && node.attributes){
                                    var attribute = node.attributes["data-msgid"];
                                    if (attribute && storage.temporaryMessagesIds.indexOf(attribute.value) != -1){
                                        oldId = attribute.value;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (newId == null && mutation.addedNodes && mutation.addedNodes.length != 0){
                for (var i = 0; i < mutation.addedNodes.length; i++) {
                    var node = mutation.addedNodes[i];

                    if (node.attributes){
                        var attribute = node.attributes["data-msgid"];
                        if (node.attributes){
                            if (attribute){
                                newId = attribute.value;
                            }
                        }
                    }

                    var addedMessages = $(node).find("[data-msgid]");
                    if (addedMessages){
                        for (var j = 0; j < addedMessages.length; j++) {
                            var node = addedMessages[j];
                            if (node && node.attributes){
                                var attribute = node.attributes["data-msgid"];
                                if (attribute){
                                    newId = attribute.value;
                                }
                            }
                        }
                    }
                }
            }
        });

        if (oldId && newId){
            storage.setPermanentMessageId(oldId, newId);
        }
    }
}

function prepareText(message){
    // I - ENCODING
    var result = textModule.createText(message);
    if (!result.result || result.value.length > configuration.maxLength){
        return false;
    }

    return result;
}

function prepareExchangeRequest(previousRequest){
    var request = keyexchangeModule.generatePrivateKeyAndPublicValue();
    if (previousRequest == null){
        keyexchangeModule.populateInitialPackage(request);
    }
    else{
        keyexchangeModule.populateAnswerPackage(request, previousRequest);
    }

    return request;
}

function encryptFully(messageArray){
    // II - PREPARATION
    var preparedMessage = premodule.prepare(messageArray);
    // III - ENCRYPTION
    encryptModule.prepareForEncryption();
    var encryptedMessage = encryptModule.encrypt(preparedMessage, storage.getKey(navigationModule.key));
    // IV - BASE64
    var encoded64 = base64module.toBase64(encryptedMessage.encrypted);
    // V - HEADER
    var fullyEncoded = headerModule.addHeader(encoded64.message);
    return fullyEncoded;
}

function decryptFully(message, author, id){

    var result = {
        value : message,
        state : false,
        moduleKey : 0,
        warning : false,
        errorMessage : ""
    };

    var parsedHeader = headerModule.checkHeader(message);
    // V - HEADER
    if (parsedHeader.result){
        var decoded64 = base64module.fromBase64(parsedHeader.message);
        // IV - BASE64
        if (decoded64.result){
            encryptModule.prepareForDecryption(parsedHeader, author);
            var decryptedMessage = encryptModule.decrypt(decoded64.bytes, storage.getKey(navigationModule.key));
            // III - DECRYPTION
            if (decryptedMessage.result){
                var checkedMessage = premodule.check(decryptedMessage.decrypted);
                // II - PREPARATION
                if (checkedMessage){
                    // Backwards compatibility: since version 0.4.0 text is encoded in special module
                    if (isPrePackageVersion(parsedHeader.version)){
                        var fullyDecoded = new TextDecoder("utf-8").decode(checkedMessage);
                        result.value = { value : fullyDecoded, result : true };
                        result.moduleKey = configuration.textModuleKey;
                        result.state = true;
                    }
                    else{
                        var res = handlePackage(checkedMessage);
                        if (res.result){
                            result.moduleKey = checkedMessage[0];
                            result.value = res;
                            result.state = true;
                        }
                    }


                    if (!timeModule.checkLastUnixtime(author, parsedHeader.date, id)){
                        result.warning = errorModule.timestampWarninig();
                    }

                    timeModule.setLastUnixtime(author, parsedHeader.date, id);
                }
                else{
                    result.errorMessage = errorModule.wrongPassword();
                }
            }
            else{
                result.errorMessage = errorModule.decryptionError();
            }
        }
        else{
            result.errorMessage = errorModule.corruptedMessage();
        }
    }
    else{
        result.errorMessage = errorModule.wrongHeader();
    }

    return result;
}

function handlePackage(package){
    var result = { 
        result : false
    };
    switch(package[0]){
        case configuration.textModuleKey:
            return textModule.extractText(package);
        case configuration.keyExchangeModuleKey:
            return keyexchangeModule.parsePackage(package);
    }
    return result;
}

$(document).ready(function() {

    setTimeout(function(){

        defineMode();

        enableMessagesObserver();

        checkPageState();

        // Logout actions
        setupLogoutLink();

        // Set current author
        setupAuthor();
        //navigationModule.setAuthor($("#l_pr").children("a").attr("href"));

    }, 400);
});

function defineMode(){
    var address = document.location.href;
    if (address.indexOf("https://vk.com") != -1){
        configuration.currentMode = configuration.desktopMode;
    }

    if (address.indexOf("https://m.vk.com") != -1){
        configuration.currentMode = configuration.mobileMode;
    }
}

function setupLogoutLink(){
    // Desktop mode
    if (configuration.currentMode == configuration.desktopMode){
        $("#top_logout_link").on("click", storage.clearAll);
    }

    // Mobile mode
    if (configuration.currentMode == configuration.mobileMode){
        $(".mmi_logout").on("click", storage.clearAll);
    }
}

function setupAuthor(){
    // Desktop mode
    if (configuration.currentMode == configuration.desktopMode){
        var node = $(configuration.nativeSelectors.vkAuthor);
        navigationModule.setAuthor(node.attr("href"));
    }

    // Mobile mode
    if (configuration.currentMode == configuration.mobileMode){
        var node = $(configuration.mobile.nativeSelectors.vkAuthor);
        navigationModule.setAuthor(node.attr("href"));
    }
}

function enableMessagesObserver(){
    if (messagesObserver == null){
        messagesObserver = new MutationObserver(checkPageState);
    }

    var target = null;
    if (configuration.currentMode == configuration.desktopMode){
        target = document.getElementById(configuration.nativeSelectors.vkBodyId);
    }

    if (configuration.currentMode == configuration.mobileMode){
        target = $(configuration.mobile.nativeSelectors.vkBody)[0];
    }

    if (!target){
        // If target to observe is not present it's either updated design for vk or
        // user has logged out. Use default.
        target = document.body;
    }

    var config = { childList: true, characterData: false, subtree: true };

    if (target){
        messagesObserver.observe(target, config);
    }
}

function disableMessagesObserver(){
    if (messagesObserver != null){
        messagesObserver.disconnect();
    }
}

function checkPageState(mutations){
    try{
        var address = document.location.href;

        if (configuration.currentMode == configuration.desktopMode
            && (address.indexOf("https://vk.com/im") == -1 || address.indexOf("sel") == -1)){
            deinitialize();
            return;
        }

        if (configuration.currentMode == configuration.mobileMode
            && (address.indexOf("https://m.vk.com/mail") == -1 || address.indexOf("act=show") == -1)){
            deinitialize();
            return;
        }

        if (!configuration.currentMode){
            defineMode();
            return;
        }

        var dialogPage = null;
        
        if (configuration.currentMode == configuration.desktopMode){
            dialogPage = $(configuration.nativeSelectors.dialogContainer);
        }

        if (configuration.currentMode == configuration.mobileMode){
            // Check if the page contains necessary elements to display dialogs.
            dialogPage = $(configuration.mobile.nativeSelectors.chatHistoryContainer);
        }

        if (dialogPage && dialogPage.length){
            // Setup current dialog key.
            var previousDialog = navigationModule.updateNavigationState(window.location.search.substr(1));

            // Mobile version has no recent dialog options, ignore it.
            if (configuration.currentMode == configuration.desktopMode){
                // Desktop version HAS recent dialog options; this is addressed by retaining protected state between recent dialogs.

                if(previousDialog){
                    storage.resetDialogMessagesState(previousDialog);
                    if (interfaceState == 2){
                        // Force return of the user to the default protected state
                        // Issue can occur with the ability to use key generation in the conference
                        togglePasswordWindow();
                    }
                }
            }
            
            if (!onDialogPage){

                prepareNativeDialogUi();
                setMessage();
                onDialogPage = true;
            }
            
            initializeDialogHistory();
        }
        else{
            deinitialize();
        }
    }
    catch(e){
        // For debug purposes.
        // console.log(e);
    }
}

function deinitialize(){
    if (onDialogPage){
        onDialogPage = false;
        interfaceState = 0;
        interfaceDeinit();
        if (dialogObserver != null){
            dialogObserver.disconnect();
            dialogObserver = null;
        }
    }
}