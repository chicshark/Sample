define(function () {   
  kony.print("MBaaSConfiguration.js.require");
  var MBaaSConfiguration = function(config) {
    kony.print("MBaaSConfiguration.js.constructor");
    var _config = config? config : {};
    
    function setAppKey(appKey) {
      _config.AppKey = appKey;
    }
    function setAppSecret(appSecret) {
      _config.AppSecret = appSecret;
    }
    function setServiceUrl(serviceUrl) {
      _config.ServiceURL = serviceUrl;
    }
    
	function getAppKey() {
      return _config.AppKey;
    }    
	function getAppSecret() {
      return _config.AppSecret;
    }    
	function getServiceUrl() {
      return _config.ServiceURL;
    }    
    
    function getMBaaSConfiguration() {
      return _config;
    }
    
    //Here we expose the public variables and functions
    return {
      typeOf:MBaaSConfiguration.typeOf,
      setAppKey: setAppKey,
      setAppSecret: setAppSecret,
      setServiceUrl: setServiceUrl,
      getAppKey: getAppKey,
      getAppSecret: getAppSecret,
      getServiceUrl: getServiceUrl,
      getMBaaSConfiguration: getMBaaSConfiguration
    };
  }; 
  MBaaSConfiguration.typeOf="MBaaSConfiguration";
  return MBaaSConfiguration;
});