define(function () {
  kony.print("Message.js.require");
  var Message = (function(message,type,code,title,acceptCallback,rejectCallback){
    kony.print("Message.js.constructor");
    //Store the raw data
    var _message = {};	

    function setMessage(message){
      kony.print("Message.js.setMessage");
      message = message? message : {};//takes care of null or undefined errors
      if (message.typeOf=="Message"){//.typeOf) {
        _message = message.getMessage();
        kony.print("Message.js.setMessage from object with original message "+JSON.stringify(message.orgmessage));
      } else {
        kony.print("Message.js.setMessage from JSON "+JSON.stringify(message));
        _message.orgmessage = message;
        //check out an eventual httpresponse node -> content
        if (message.httpresponse !== undefined && message.httpresponse !== null && 
            message.httpresponse.errmsg !== undefined && message.httpresponse.errmsg !== null) {
          _message.content=message.httpresponse.errmsg;
        }
        //check out an eventual message node -> content
        else if (message.message !== undefined && message.message !== null) {
          _message.content=message.message;
        }
        //check out an eventual message node -> content
        else if (message.errmsg !== undefined && message.errmsg !== null) {
          _message.content=message.errmsg;
        }
        //check out an eventual message node -> content
        else if (message.error !== undefined && message.error !== null) {
          _message.content=message.error;
        }
        //checks out the details node -> content or title
        if (message.details !== undefined && message.details !== null) {
          //if we have a message sub node, then this is our content
          if (message.details.message !== undefined && message.details.message !== null) {
            _message.content=message.details.message;
          } 
          //if we do not have any subnodes, then this is our title as message.details
          //goes together with message.message (see below)
          else {
            _message.subtitle=message.details;
          }
        }
      }
      kony.print("Message.js.setMessage end");
    }

    //returns the property if it is part of the collection or the fallbackproperty or null
    function _getValidProperty(collection,property,fallbackProperty) {
      //set default type
      var prop=null;
      if (fallbackProperty!==undefined && fallbackProperty!==null) {
        prop=fallbackProperty;
      }
      //test if type is valid and use it if it exists
      for (var key in collection) {
        if (collection.hasOwnProperty(key)) {
          if (property==collection[key]) {
            prop=property; break;
          }
        }
      }
      return prop;
    }  

    function setType(type) {
      _message.type=_getValidProperty(Message.type,type,Message.type.UNKNOWN);
    }

    function setCode(code) {
      _message.code=_getValidProperty(Message.code,code,Message.code.UNKNOWN);
    }

    function setTitle(title) {
      if (title!==undefined && title!==null) {
        _message.title=title;
      }
    }

    /** INIT **/
    setMessage(message);
    setType(type);
    setCode(code);
    setTitle(title);

    function getMessage(){
      return  _message;
    }
    function getServerMessage(){
      return _message.orgmessage;
    }
    function getType() {
      return _message.type;
    }
    function getCode() {
      return _message.code;
    }
    function getTitle() {
      var title = kony.i18n.getLocalizedString("i18n.Message.title."+_message.code);
      if (title!==undefined && title!==null) return title;
      else return _message.title;
    }
    function getContent() {
      var content = kony.i18n.getLocalizedString("i18n.Message.content."+_message.code);
      if (content!==undefined && content!==null && content!=="") {
        return content;
      }
      else {
        return _message.content;
      }
    }

    //Here we expose the public variables and functions
    return {
      typeOf: Message.typeOf,
      setMessage:setMessage,
      getMessage:getMessage,
      getServerMessage:getServerMessage,
      getType: getType,
      getCode: getCode,
      getTitle: getTitle,
      getContent: getContent
    };
  });

  //Static constants
  Message.typeOf = "Message";
  Message.type = {
    INFO:"INFO",
    WARNING:"WARNING",
    ERROR:"ERROR",
    UNKNOWN:"UNKOWN"
  };
  Message.code = {
    INITFAILED:"INITFAILED",//failed to init MF
    LOGINFAILED_NOTINITIALIZED:"LOGINFAILED_NOTINITIALIZED",//prerequisite init'ed MF is missing
    LOGINFAILED_NOPROFILE:"LOGINFAILED_NOPROFILE",//got connection to Okta, but no profile
    LOGINFAILED_NOCONNECTION:"LOGINFAILED_NOCONNECTION",//other login failure (connection issue?)
    LOGINFAILED_NOCREDENTIALS:"LOGINFAILED_NOCREDENTIALS",
    LOGINFAILED_NOBROWSER:"LOGINFAILED_NOBROWSER",
    LOGINFAILED_NOAUTHSERVICEAVAILABLE:"LOGINFAILED_NOAUTHSERVICEAVAILABLE",
    LOGINFAILED_NOREFRESHSERVICEAVAILABLE:"LOGINFAILED_NOREFRESHSERVICEAVAILABLE",
    LOGINFAILED_NOUSERINFOSERVICEAVAILABLE:"LOGINFAILED_NOUSERINFOSERVICEAVAILABLE",
    LOGINFAILED_NOTOKENSERVICEAVAILABLE:"LOGINFAILED_NOTOKENSERVICEAVAILABLE",
    AUTHFAILED_NOTOKEN:"AUTHFAILED_NOTOKEN",//failed to retrieve bearer token
    AUTHFAILED_NORESULT:"AUTHFAILED_NORESULT",//failed to retrieve results from the call
    AUTHFAILED_NOCONNECTION:"AUTHFAILED_NOCONNECTION",//failed to connect to token client
    LOGOUTFAILED_AUTHENTICATION:"LOGOUTFAILED_AUTHENTICATION",
    LOGOUTFAILED_AUTHORIZATION:"LOGOUTFAILED_AUTHORIZATION",
    LOGINFAILED_NOREFRESHTOKEN:"LOGINFAILED_NOREFRESHTOKEN",
    SERVICECALL_NOTINITIALIZED:"SERVICECALL_NOTINITIALIZED",
    SERVICECALL_NOTLOGGEDIN:"SERVICECALL_NOTLOGGEDIN",
    SERVICECALL_NOTAUTHORIZED:"SERVICECALL_NOTAUTHORIZED",
    SERVICECALL_CALLBACKERROR:"SERVICECALL_CALLBACKERROR",
    SERVICECALL_NORESULT:"SERVICECALL_NORESULT",
    SERVICECALL_NOCONNECTION:"SERVICECALL_NOCONNECTION",
    UNKNOWN:"UNKNOWN"
  };
  return Message;
});