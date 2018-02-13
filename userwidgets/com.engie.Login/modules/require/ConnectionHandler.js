define(function () {
  kony.print("ConnectionHandler.js.require");
  var MBaasConfiguration = require("com/engie/Login/MBaasConfiguration");
  var Message = require("com/engie/Login/Message");
  var User = require("com/engie/Login/User");

  /**
   * V1.5_20170317: provides persistent login
   *
   * This manages the whole login and authentication process for a given landscape
   * REQUIRES aaa_timers_monkeypatch and q
   */
  var ConnectionHandler = (function () { 
    kony.print("ConnectionHandler.js.constructor");
    //Minimum mandatory inputs
    var _mbaasConfig = null;
    var _oktaLoginServiceId = null;
    //Optional additional inputs
    var _loginUser = null;//for native login form support, needs to provide loginName and 
    var _browserWidget = null;//for oauth login support, needs to provde a widget reference
    var _groupRoleMapping = null;//nulti-role support
    var _oktaRefreshServiceId = null;//refresh login support
    var _axwayServiceId = null;//API management support
    var _userInfoServiceId = null;//force from server user profile support
    var _persistRefreshToken = false;
    var _authRefreshTokenStoreKey = "ConnectionHandler_authRefreshToken";
    var _retrieveRefreshToken = function () {
      var token = kony.store.getItem(_authRefreshTokenStoreKey);
      kony.print("ConnectionHandler.js._retrieveRefreshToken->"+token);
      return token;
    };
    var _storeRefreshToken = function (token) { 
      kony.print("ConnectionHandler.js._storeRefreshToken->"+token);
      if (token!==undefined && token!==null) {
        kony.store.setItem(_authRefreshTokenStoreKey,token);
        kony.print("ConnectionHandler.js._storeRefreshToken->SET");
      } else {
        kony.store.removeItem(_authRefreshTokenStoreKey);
        kony.print("ConnectionHandler.js._storeRefreshToken->REMOVED");
      }
    };
    var _refreshFailureCallback = null;
    function setLoginUser(user) {
      _loginUser=user;
    }
    function setBrowser(browser) {
      _browserWidget=browser;
    }
    function setMBaaSConfiguration(mbaasConfiguration) {
      _mbaasConfig=mbaasConfiguration;
    }
    function setGroupRoleMapping(groupRoleMapping) {
      _groupRoleMapping=groupRoleMapping;
    }
    function setLoginAuthenticationServiceId(serviceId) {
      _oktaLoginServiceId=serviceId;
    }
    function setRefreshAuthenticationServiceId(serviceId) {
      _oktaRefreshServiceId=serviceId;
    }
    function setAdditionalAuthenticationServiceId(serviceId) {
      _axwayServiceId=serviceId;
    }
    function setAdditionalUserInfoServiceId(serviceId) {
      _userInfoServiceId=serviceId;
    }
    //Default is false which means that the refresh token WILL NOT BE STORED
    //This means that we will use the refresh token only for keeping this session alive
    //If set to "true" we will store the refresh token with the _retrieveRefreshToken
    //and _storeRefreshToken functions (either the default ones or the ones passed with the 
    //two functions below)
    function setPersistRefreshToken (boolean) {
      _persistRefreshToken = boolean;
    }
    function setRefreshTokenRetrievalFunction(retrieveRefreshTokenFunction) {
      _retrieveRefreshToken = retrieveRefreshTokenFunction;
    }
    function setRefreshTokenStoreFunction(storeRefreshTokenFunction) {
      _storeRefreshToken = storeRefreshTokenFunction;
    }
    function setRefreshFailureCallback(action) {
      _refreshFailureCallback = action;
    }
    function hasRefreshToken() {
      var refreshToken = _retrieveRefreshToken();
      return (refreshToken!==undefined && refreshToken!==null);
    }

    //Internal / output variables
    var _isMobileFabricInitialized = false;
    var _isAuthenticated = false;
    var _isAuthorized = false;
    var _profile = {};//Okta profile
    var _user = null;//User based on okta profile with mapped roles
    var _additionalAccessToken = null;//API management access token which all integration services need (Axway)
    var _authAccessToken = null;//Identity provider access token for main authentication (Okta) 
    var _authRefreshToken = null;//Identity provider refresh token for main authentication (Okta)
    var _mbaasClient;//mobile fabric identity and integration
    var _authClient;//okta authentication
    var _tokenClient;//axway authorization
    var _authClientProviderType = "UNKNOWN";//set when auth client is used

    //Initialize the MBaasClient and execute either a .then successCallback or .fail failureCallback
    function initMBaaS() {
      kony.print("ConnectionHandler.js.initMBaaS.promise");
      Q = kony.Q;
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js.initMBaaS.run");//: kony.sdk.currentBackEndToken " + kony.sdk.getCurrentInstance().currentBackEndToken);

        try {
          _mbaasClient = new kony.sdk();//kony.sdk.getDefaultInstance();
          _mbaasClient.init(
            _mbaasConfig.getAppKey(),// App key of application to use MBaaS APIs,
            _mbaasConfig.getAppSecret(),// App secret of application to use MBaaS APIs,
            _mbaasConfig.getServiceUrl(),// URL for App's Service Document,
            function _initSuccess(results){
              //kony.print("ConnectionHandler.js.initMBaaS: Kony SDK initialization success with results:"+JSON.stringify(results));// _mbaasClient.currentBackEndToken " + _mbaasClient.currentBackEndToken);
              _isMobileFabricInitialized=true;
              resolve(results);//triggers the "successCallback" passed through .then()
              return;
            },
            function _initError(error){
              //kony.print("ConnectionHandler.js.initMBaaS: Kony SDK initialization error: " + JSON.stringify(error));
              _isMobileFabricInitialized=false;
              reject(new Message(error, 
                                 Message.type.ERROR, 
                                 Message.code.INITFAILED, 
                                 "MobileFabric initialisation failed with error:"+JSON.stringify(error)));//triggers the "failureCallback" passed through .fail()
              return;
            }
          );
        } catch (e) {
          reject(new Message(JSON.stringify(e), 
                             Message.type.ERROR, 
                             Message.code.INITFAILED, 
                             "MobileFabric initialisation failed with exception:"+JSON.stringify(e)));//triggers the "failureCallback" passed through .fail()
          return;
        }
      });
      return promise;
    }

    function _refreshAuthentication() {
      kony.print("ConnectionHandler.js._refreshAuthentication.promise");
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js._refreshAuthentication.run");
        if(typeof _mbaasClient === "undefined") {
          var error = new Error("The SDK client has not yet been initialised. You must call initMBaaS() before you can call authenticate()");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.LOGINFAILED_NOTINITIALIZED, 
                             "MobileFabric not initialized."));
          return;
        } else if (_oktaRefreshServiceId===null) {
          var error = new Error("No Refresh Authentication Service has been configured.");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.LOGINFAILED_NOREFRESHSERVICEAVAILABLE, 
                             "No Refresh Service."));
          return;
        }

        //Get the token from the local storage 
        if (_persistRefreshToken===true) {
          _authRefreshToken = _retrieveRefreshToken();
        }
        kony.print("ConnectionHandler.js._refreshAuthentication using "+_oktaRefreshServiceId);
        kony.print("DEBUG ConnectionHandler.js._refreshAuthentication with token "+_authRefreshToken);
        if (_authRefreshToken!==undefined && _authRefreshToken!==null) {

          try {
            _authClient = _mbaasClient.getIdentityService(_oktaRefreshServiceId);
            _authClient.login(
              {"refresh_token":_authRefreshToken},//options,
              function _loginSuccess(results){
                kony.print("ConnectionHandler.js._refreshAuthentication_loginSuccess");
                //kony.print("ConnectionHandler.js._refreshAuthentication_loginSuccess results "+JSON.stringify(results));
                var forceFromServer = false;
                
    			//Resetting the tokens (important for subsequent detection if tokens where already filled -> no additional token call)
                _authAccessToken = null;
                _additionalAccessToken = null;

                //Get and persist refresh token from identity provider          
                _authClient.getSecurityAttributes(function _getSecurityAttributesSuccess (securityAttributes) {
                  //kony.print("ConnectionHandler.js._refreshAuthentication_loginSuccess securityAttributes: "+JSON.stringify(securityAttributes));
                  if (securityAttributes !== undefined && securityAttributes !== null &&
                      securityAttributes.refresh_token !== undefined && securityAttributes.refresh_token !== null) {
                    _authRefreshToken = securityAttributes.refresh_token;
                    _authAccessToken = securityAttributes.access_token;
                    if (securityAttributes.access_token_api !== undefined && securityAttributes.access_token_api !== null) {
                      _additionalAccessToken = securityAttributes.access_token_api;
                    }
                    if (_persistRefreshToken===true) {
                      _storeRefreshToken(_authRefreshToken);
                    }
                    //kony.print("ConnectionHandler.js._refreshAuthentication_loginSuccess.getSecurityAttributes security_attributes.refresh_token "+securityAttributes.refresh_token);
                    //kony.print("ConnectionHandler.js._refreshAuthentication_loginSuccess.getSecurityAttributes security_attributes.access_token "+securityAttributes.access_token);
                    //Ready to get user profile from identity provider
                    resolve(results);
                    return;
                  }
                }, function _getSecurityAttributesError (error) {
                  //TODO Differentiate the error codes / types and produce the following messages:
                  //- Message.code.LOGINFAILED_BADCREDENTIALS
                  //- Message.code.LOGINFAILED_INVALIDREFRESHTOKEN
                  //etc.
                  kony.print("ERROR ConnectionHandler.js._refreshAuthentication: get sec attr error: " + JSON.stringify(error)); 
                  reject(new Message(error, 
                                     Message.type.ERROR, 
                                     Message.code.LOGINFAILED_NOCONNECTION,
                                     "Authentication error: failed to connect to authentication service"));
                  return;
                });
              },
              function _loginError(error){
                kony.print("ERROR ConnectionHandler.js._refreshAuthentication: login error: " + JSON.stringify(error)); 
                reject(new Message(error, 
                                   Message.type.ERROR, 
                                   Message.code.LOGINFAILED_NOCONNECTION, 
                                   "Authentication error: failed to connect to authentication service"));
                return;
              }
            );
          } catch (e) {
            reject(new Message(JSON.stringify(e), 
                               Message.type.ERROR, 
                               Message.code.LOGINFAILED_NOCONNECTION, 
                               "Authentication error: failed to connect to authentication service"));
            return;
          }
        } else {
          kony.print("WARNING ConnectionHandler.js._refreshAuthentication: NO REFRESH TOKEN YET"); 
          reject(new Message(new Error("No Refresh Token"), 
                             Message.type.ERROR, 
                             Message.code.LOGINFAILED_NOREFRESHTOKEN, 
                             "Authentication error: failed to connect to authentication service"));
          return;
        }

      });
      return promise;
    }

    //Log into Okta and execute either a .then successCallback or .fail failureCallback
    function _doAuthentication(){
      kony.print("ConnectionHandler.js._doAuthentication.promise");
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js._doAuthentication.run");
        if(typeof _mbaasClient === "undefined") {
          var error = new Error("The SDK client has not yet been initialised. You must call initMBaaS() before you can call authenticate()");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.LOGINFAILED_NOTINITIALIZED, 
                             "MobileFabric not initialized."));
          return;
        } else if (_oktaLoginServiceId===null) {
          var error = new Error("No Authentication Service has been configured.");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.LOGINFAILED_NOAUTHSERVICEAVAILABLE, 
                             "No Authentication Service."));
          return;
        }


        try {
          _authClient = _mbaasClient.getIdentityService(_oktaLoginServiceId);
          _authClientProviderType = _authClient.getProviderType();
          var loginOptions = {};

          //TODO CONT HERE for distinguishing OAUTH from NATIVE OKTA
          kony.print("ConnectionHandler.js._doAuthentication.run-OAUTH2");
          if (_authClientProviderType.toUpperCase()=="OAUTH2") {
            if (_browserWidget===undefined || _browserWidget===null) {
              kony.print("ConnectionHandler.js._doAuthentication.run-OAUTH2 no browser");
              var error = new Error("No browser widget has been provided for the login.");
              reject(new Message(error, 
                                 Message.type.ERROR, 
                                 Message.code.LOGINFAILED_NOBROWSER, 
                                 "No credentials have been provided for the login."));
              return;
            } else {
              //We will execute the refresh failure callback in order to show
              //the browser
              kony.print("ConnectionHandler.js._doAuthentication.run-OAUTH2 refresh failure?");
              if (_refreshFailureCallback!==undefined && _refreshFailureCallback!==null) {
                kony.print("ConnectionHandler.js._doAuthentication.run-OAUTH2 exec refresh failure and continue");
                _refreshFailureCallback();
              }
              loginOptions = {
                browserWidget:_browserWidget
              };
            }
          } else {
            kony.print("ConnectionHandler.js._doAuthentication.run-NATIVE refresh failure?");
            //We will execute the refresh failure callback ONCE in order to open
            //the native panel if needed
            if (_refreshFailureCallback!==undefined && _refreshFailureCallback!==null) {
              kony.print("ConnectionHandler.js._doAuthentication.run-NATIVE exec refresh failure and stop");
              _refreshFailureCallback();
              _refreshFailureCallback=null;
              return;
            }
            else if (_loginUser===undefined || _loginUser===null) {
              kony.print("ConnectionHandler.js._doAuthentication.run-NATIVE no user");
              var error = new Error("No credentials have been provided for the login.");
              reject(new Message(error, 
                                 Message.type.ERROR, 
                                 Message.code.LOGINFAILED_NOCREDENTIALS, 
                                 "No credentials have been provided for the login."));
              return;
            } else {
              kony.print("ConnectionHandler.js._doAuthentication.run-NATIVE login as "+_loginUser.getLoginName());
              loginOptions = {
                "username": _loginUser.getLoginName(),
                "password": _loginUser.getPassword()
              };
            }
          }
          
		  //kony.print("DEBUG ConnectionHandler.js._doAuthentication with loginOptions: "+JSON.stringify(loginOptions));
          _authClient.login(loginOptions,
                            function _loginSuccess(results){
            kony.print("ConnectionHandler.js._doAuthentication_loginSuccess");

            //Resetting the tokens (important for subsequent detection if tokens where already filled -> no additional token call)
            _authAccessToken = null;
            _additionalAccessToken = null;

            //Get and persist refresh token from identity provider          
            _authClient.getSecurityAttributes(function _getSecurityAttributesSuccess (securityAttributes) {
              //kony.print("ConnectionHandler.js securityAttributes "+JSON.stringify(securityAttributes));
              if (securityAttributes !== undefined && securityAttributes !== null &&
                  securityAttributes.refresh_token !== undefined && securityAttributes.refresh_token !== null) {
                _authRefreshToken = securityAttributes.refresh_token;
                if (_persistRefreshToken===true) {
                  _storeRefreshToken(_authRefreshToken);
                }
                kony.print("DEBUG ConnectionHandler.js._doAuthentication_loginSuccess.getSecurityAttributes security_attributes.refresh_token "+securityAttributes.refresh_token);
              } else {
                kony.print("WARNING ConnectionHandler.js._doAuthentication: login exception: no refresh_token available, make sure that offline_access is part of your app's identity service's scope."); 
              }
              if (securityAttributes !== undefined && securityAttributes !== null &&
                  securityAttributes.access_token !== undefined && securityAttributes.access_token !== null) {
                _authAccessToken = securityAttributes.access_token;
                if (securityAttributes.access_token_api !== undefined && securityAttributes.access_token_api !== null) {
                  _additionalAccessToken = securityAttributes.access_token_api;
                }
                //kony.print("ConnectionHandler.js._doAuthentication_loginSuccess.getSecurityAttributes security_attributes.access_token "+securityAttributes.access_token);
                //Ready to get user profile from identity provider
                resolve(results);
                return;
              } else {
                kony.print("ERROR ConnectionHandler.js._doAuthentication: login exception: no access_token available"); 
                reject(new Message(new Error("No access_token available."), 
                                   Message.type.ERROR, 
                                   Message.code.LOGINFAILED_NOREFRESHTOKEN, 
                                   "Authentication error: failed to connect to authentication service"));
                return;
              }
            }, function _getSecurityAttributesError (error) {
              reject(new Message(error, 
                                 Message.type.ERROR, 
                                 Message.code.LOGINFAILED_NOCONNECTION, 
                                 "Authentication error: failed to connect to authentication service"));
              return;
            });
          },
                            function _loginError(error){
            reject(new Message(error, 
                               Message.type.ERROR, 
                               Message.code.LOGINFAILED_NOCONNECTION, 
                               "Authentication error: failed to connect to authentication service"));
            return;
          }
                           );
        } catch (e) {
          reject(new Message(JSON.stringify(e), 
                             Message.type.ERROR, 
                             Message.code.LOGINFAILED_NOCONNECTION, 
                             "Authentication error: failed to connect to authentication service"));
          return;
        }
      });
      return promise;
    }

    function _getProfileFromAuthClient() {
      kony.print("ConnectionHandler.js._getProfileFromAuthClient.promise");
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js._getProfileFromAuthClient.run");
        var forceFromServer = false;
        //Get user profile from identity provider
        if(typeof _mbaasClient === "undefined") {
          var error = new Error("The SDK client has not yet been initialised. You must call initMBaaS() before you can call authenticate()");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.LOGINFAILED_NOTINITIALIZED, 
                             "MobileFabric not initialized."));
          return;
        } 

        //TODO: BU PATCH, remove when issue was solved by platform team
        if (_authClientProviderType.toUpperCase()=="OKTA") {
          if (_userInfoServiceId===null) {
            var error = new Error("No dedicated User Info Service has been configured.");
            reject(new Message(error, 
                               Message.type.ERROR, 
                               Message.code.LOGINFAILED_NOUSERINFOSERVICEAVAILABLE, 
                               "No User Info Service."));
            return;
          }

          //TODO workaround "triggering the Intergration Service directly to get user information" waiting for the Okta connector bug to be fixed.

          try {
            var userInfoService = _mbaasClient.getIntegrationService(_userInfoServiceId);
            kony.print("ConnectionHandler.js._getProfileFromAuthClient start call userinfo:"+_authAccessToken);
            var inputParams ={};
            var svcHeaders= {"Authorization": "Bearer "+_authAccessToken, "Content-Type": "application/x-www-form-urlencoded"};

            userInfoService.invokeOperation("userinfo", svcHeaders, inputParams,
                                            function(result) {
              kony.print("ConnectionHandler.js._getProfileFromAuthClient success profile");
              _profile = result;
              _user = new User(_profile);
              if (_groupRoleMapping!==undefined && _groupRoleMapping!==null) {
                _user.setRoles(_groupRoleMapping.getRoles());
              }
              _isAuthenticated = true;
              kony.setUserID(_user.getEmail());
              resolve(result);
              return;
            },
                                            function(error) {
              kony.print("ERROR ##########ConnectionHandler.js._getProfileFromAuthClient: Failed to fetch : " + JSON.stringify(error));
              _isAuthenticated = false;
              reject(new Message(error, 
                                 Message.type.ERROR, 
                                 Message.code.LOGINFAILED_NOPROFILE, 
                                 "Authentication error: failed to get user profile"));
              return;
            });
          } catch (e) {
            reject(new Message(JSON.stringify(e), 
                               Message.type.ERROR, 
                               Message.code.LOGINFAILED_NOPROFILE, 
                               "Authentication error: failed to get user profile"));
            return;
          }
        } else {
          var forceFromServer = false;
          //Get user profile from identity provider
          _authClient.getProfile(
            forceFromServer,
            function(profile) {
              kony.print("ConnectionHandler.js._getProfileFromAuthClient success profile");
              //kony.print("ConnectionHandler.js._getProfileFromAuthClient success profile "+JSON.stringify(profile));
              _profile = profile;
              _user = new User(_profile);
              if (_groupRoleMapping!==undefined && _groupRoleMapping!==null) {
                _user.setRoles(_groupRoleMapping.getRoles());
              }
              _isAuthenticated = true;
              kony.setUserID(_user.getEmail());
              resolve(profile);
              return;
            },
            function(error) {
              kony.print("ERROR ConnectionHandler.js._getProfileFromAuthClient: Failed to fetch : " + JSON.stringify(error));
              _isAuthenticated = false;
              reject(Message(error, 
                             MVCApp.util.Message.type.ERROR, 
                             MVCApp.util.Message.code.LOGINFAILED_NOPROFILE, 
                             "Authentication error: failed to get user profile"));
            });
        }
      });
      return promise;
    }

    function authenticate(){
      kony.print("ConnectionHandler.js.authenticate.promise");
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js.authenticate.run");
        if(typeof _mbaasClient === "undefined") {
          var error = new Error("The SDK client has not yet been initialised. You must call initMBaaS() before you can call authenticate()");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.LOGINFAILED_NOTINITIALIZED, 
                             "MobileFabric not initialized."));
          return;
        } else {
          kony.print("ConnectionHandler.js.authenticate->refresh");
          _refreshAuthentication().then(function () {
            kony.print("ConnectionHandler.js.authenticate->refresh->success->profile");
            _getProfileFromAuthClient().then(function (profile) {
              kony.print("ConnectionHandler.js.authenticate->refresh->success->profile->success->resolve");
              resolve(profile);
              return;
            }).fail(function (message) {
              kony.print("ERROR ConnectionHandler.js.authenticate->refresh->success->profile->fail: "+JSON.stringify(message));
              reject(message);
              return;
            });
          }).fail(function () {
            kony.print("WARNING ConnectionHandler.js.authenticate->refresh->fail->authenticate");
            _doAuthentication().then(function () {
              kony.print("ConnectionHandler.js.authenticate->refresh->fail->authenticate->success->profile");
              _getProfileFromAuthClient().then(function (profile) {
                kony.print("ConnectionHandler.js.authenticate->refresh->fail->authenticate->success->profile->success->resolve");
                resolve(profile);
                return;
              }).fail(function (message) {
                kony.print("ERROR ConnectionHandler.js.authenticate->refresh->fail->authenticate->success->profile->fail: "+JSON.stringify(message));
                reject(message);
                return;
              });
            }).fail(function (message) {
              kony.print("ERROR ConnectionHandler.js.authenticate->refresh->fail->authenticate->fail: "+JSON.stringify(message));
              reject(message);
              return;
            });
          });
        }
      });
      return promise;
    }

    //Authorize against Axway
    //Input params 'assertion' and 'scope' are injected by the orchestration service
    function authorize() {
      kony.print("ConnectionHandler.js.getAxwayAuthorization.authorize");
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js.authorize.run");
        if (_axwayServiceId===null) {
          //Not wanting to use an additional token service (e.g. API management)
          //is not an error condition -> return the main login service's token
          resolve(getToken());
          return;
          /*var error = new Error("No Additional Token Service has been configured.");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.LOGINFAILED_NOTOKENSERVICEAVAILABLE, 
                             "No Token Service."));
          return;*/
        } else if (_additionalAccessToken!==undefined && _additionalAccessToken!==null) {
          //The login process resets the additional access token to null
          //If the token is already present, then it was directly returned
          //by the primary or refresh login service as access_token_api
          //In this case the additional service call is not required
          resolve(getToken());
          return;
        }
        //TODO move to identity service
        try {
          _tokenClient = _mbaasClient.getIntegrationService(_axwayServiceId);
          var headers = {};
          var inputParams ={};
          //injects the currently used identity service name in our ochestrated service
          //so that the assertion and scope parameters will be pulled automatically from 
          //the Mobile Fabric session 
          inputParams.provider=_authClient.getProviderName();
          //kony.print("ConnectionHandler.js.getAxwayAuthorization with inputParams: " + JSON.stringify(inputParams));
          _tokenClient.invokeOperation("login", headers, inputParams,
                                       function _connectionSuccess(results){
            kony.print("ConnectionHandler.js.getAxwayAuthorization connected");
            kony.print("ConnectionHandler.js.getAxwayAuthorization results: " + JSON.stringify(results));
            if (results !== null && results.opstatus === 0) {
              try {
                if(results.security_attributes_api!==undefined &&
                   results.security_attributes_api!==null &&
                   results.security_attributes_api.access_token_api!==undefined &&
                   results.security_attributes_api.access_token_api!==null){
                  _additionalAccessToken=results.security_attributes_api.access_token_api;
                  _isAuthorized = true;
                  resolve(getToken());
                  return;
                }
                else {
                  var error = new Error("Issue retrieving authorization token from API Management response");
                  reject(new Message(error, 
                                     Message.type.ERROR, 
                                     Message.code.AUTHFAILED_NOTOKEN, 
                                     "Authorization error: token was empty"));
                  return;
                }
              } catch (e) {
                kony.print("ERROR ConnectionHandler.js.getAxwayAuthorization issue retrieving token: " + JSON.stringify(e));
                _isAuthorized = false;
                var error = new Error("Issue retrieving authorization token from API Management response");
                reject(new Message(error, 
                                   Message.type.ERROR, 
                                   Message.code.AUTHFAILED_NOTOKEN, 
                                   "Authorization error: failed to retrieve token"));
                return;
              }
            }
            else{
              _isAuthorized = false;
              var error = new Error("Service call failed with opstatus " + results.opstatus);
              reject(new Message(error, 
                                 Message.type.ERROR, 
                                 Message.code.AUTHFAILED_NORESULT, 
                                 "Authorization error: failed to retrieve authorization response"));
              return;
            }
          },
                                       function _connectionError(error){
            kony.print("ERROR ConnectionHandler.js.getAxwayAuthorization error: " + JSON.stringify(error));
            _isAuthorized = false;
            reject(new Message(error, 
                               Message.type.ERROR, 
                               Message.code.AUTHFAILED_NOCONNECTION, 
                               "Authorization error: failed to connect to authorization service"));
            return;
          }
                                      );
        } catch (e) {
          reject(new Message(JSON.stringify(e), 
                             Message.type.ERROR, 
                             Message.code.AUTHFAILED_NOCONNECTION, 
                             "Authorization error: failed to connect to authorization service"));
          return;
        }
      });
      return promise;
    }

    //Log out of Okta and execute either a .then successCallback or .fail failureCallback
    function logoutOfAuthenticator(){
      kony.print("ConnectionHandler.js.logoutOfAuthenticator.promise");
      _isAuthenticated = false;
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js.logoutOfAuthenticator.run");

        try {
          _authClient.logout(
            function _logoutSuccess(results){
              kony.print("ConnectionHandler.js.logoutOfOkta succeeded");
              //kony.print("ConnectionHandler.js.logoutOfOkta results: " + JSON.stringify(results));
              resolve(results);
              return;
            },
            function _logoutError(error){
              //alert("logoutOfAuthenticator_logoutError");
              //alert(error);
              kony.print("ERROR ConnectionHandler.js.logoutOfOkta error: " + JSON.stringify(error));
              reject(new Message(error, 
                                 Message.type.WARNING, 
                                 Message.code.LOGOUTFAILED_AUTHENTICATION, 
                                 "Warning: failed to disconnect user properly"));
              return;
            }
          );
        } catch (e) {
          reject(new Message(JSON.stringify(e), 
                             Message.type.ERROR, 
                             Message.code.LOGOUTFAILED_AUTHENTICATION, 
                             "Warning: failed to disconnect user properly"));
          return;
        }
      });
      return promise;	
    }

    //TODO implement tests for error codes
    //Log out of Axway
    function logoutOfAuthorizer() {
      kony.print("ConnectionHandler.js.logoutOfAuthorizer.promise");
      _isAuthorized = false;
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js.logoutOfAuthorizer.run");

        try {
          _tokenClient.invokeOperation("logout", {token:getToken()}, {},
                                       function _connectionSuccess(results){
            kony.print("ConnectionHandler.js.getAxwayAuthorization connected");
            //kony.print("ConnectionHandler.js.getAxwayAuthorization results: " + JSON.stringify(results));
            if (results !== null && results.opstatus === 0) {
              resolve(results);
              return;
            }
            else{
              var error = new Error("Authorization logout call failed with opstatus " + results.opstatus);
              reject(new Message(error, 
                                 Message.type.WARNING, 
                                 Message.code.LOGOUTFAILED_AUTHORIZATION, 
                                 "Warning: failed to logout user properly"));
              return;
            }
          },
                                       function _connectionError(error){
            kony.print("ERROR ConnectionHandler.js.getAxwayAuthorization error: " + JSON.stringify(error));
            reject(new Message(error, 
                               Message.type.WARNING, 
                               Message.code.LOGOUTFAILED_AUTHORIZATION, 
                               "Warning: failed to logout user properly"));
            return;
          }
                                      );
        } catch (e) {
          reject(new Message(JSON.stringify(e), 
                             Message.type.ERROR, 
                             Message.code.LOGOUTFAILED_AUTHORIZATION, 
                             "Warning: failed to logout user properly"));
          return;
        }
      });
      return promise;
    }

    function connect(loginUser) {
      kony.print("ConnectionHandler.js.connect.promise");
      if (loginUser!==undefined && loginUser!==null) {
        _loginUser = loginUser;
      }
      Q = kony.Q;
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js.connect.run");
        Q.fcall(initMBaaS)
          .then(authenticate)
          .then(authorize)
          .fail(function (error) {
          //Handle any error from all above steps
          kony.print("ConnectionHandler.js.connect error: " + error);
          reject(error);
          return;
        })
          .fin(function () {
          resolve({user:getUser(),profile:getProfile(),token:getToken()});
          return;
        });
      });
      return promise;
    }

    function _reconnect() {
      kony.print("ConnectionHandler.js._reconnect.promise");
      Q = kony.Q;
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js._reconnect.run");
        Q.fcall(_refreshAuthentication)
          .then(_getProfileFromAuthClient)
          .then(authorize)
          .catch(function (error) {
          //Handle any error from all above steps
          kony.print("ERROR ConnectionHandler.js.connect error: " + error);
          reject(error);
          return;
        })
          .fin(function () {
          resolve({user:_user,profile:_profile,token:getToken()});
          return;
        });
      });
      return promise;
    }

    //Aggregated logout service
    //This function will
    //- log out of the authorizer (e.g. Axway)
    //- log out of the authentictor (e.g. Okta)
    //It is VITAL that even if Axway logout fails (e.g. already logged out)
    //that we still log out of Okta
    function logout() {
      kony.print("ConnectionHandler.js.logout.promise");
      Q = kony.Q;
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js.logout.run");
        logoutOfAuthorizer().then(function(results){
        })
          .fail(function (error) {
          kony.print("ERROR ConnectionHandler.js.logout token client error: " + error);
          reject(error);
          return;
        })
          .fin(function() {
          logoutOfAuthenticator().then(function(results){
          })
            .fail(
            function (error) {
              kony.print("ERROR ConnectionHandler.js.logout authentication client error: " + error);
              reject(error);
              return;
            }).fin(function () {
            resolve();
            return;
          });
        });
      });
      return promise;
    }

    //The actual function which makes the service calls
    function _makeMBaaSServiceCall(serviceId,operationId,headers,inputParams,_bypassAuth){
      kony.print("ConnectionHandler.js._makeMBaaSServiceCall.promise: serviceId "+ serviceId +" with "+ operationId);
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js._makeMBaaSServiceCall.run");
        if (isNetworkAvailable()===false) {
          var error = new Error("No network available. Please check your network connectivity and try again.");
          kony.print("ConnectionHandler.js._makeMBaaSServiceCallisNetworkAvailable: Rejected Service Call to "+ serviceId +" with "+ operationId);
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.NETWORK_FAILED, 
                             "Error: No Network"));
          return;
        }
        else if (_isMobileFabricInitialized===false) {
          var error = new Error("The App is not connected to the cloud. You may have to restart it.");
          kony.print("ConnectionHandler.js._makeMBaaSServiceCall_isMobileFabricInitialized: Rejected Service Call to "+ serviceId +" with "+ operationId);
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.SERVICECALL_NOTINITIALIZED, 
                             "Error: not connected to MobileFabric"));
          return;
        }
        else if (_isAuthenticated===false && _bypassAuth!==true) {
          var error = new Error("You are not logged in.");
          kony.print("ConnectionHandler.js._makeMBaaSServiceCall_isAuthenticated: Rejected Service Call to "+ serviceId +" with "+ operationId);
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.SERVICECALL_NOTLOGGEDIN, 
                             "Error: not logged in"));
          return;
        }
        else if (_isAuthorized===false && _bypassAuth!==true) {
          var error = new Error("You are not authorized to make service calls. Please log back in with valid credentials.");
          kony.print("ConnectionHandler.js._makeMBaaSServiceCall_isAuthorized: Rejected Service Call to "+ serviceId +" with "+ operationId);
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.SERVICECALL_NOTAUTHORIZED, 
                             "Error: not authorized"));
          return;
        }
        else {

          try {
            var integrationObj = _mbaasClient.getIntegrationService(serviceId);

            var svcHeaders = headers? headers : {};
            var token = getToken();
            if(token!==undefined && token!==null) {
              //Injects the Axway Bearer token required for all authorized calls
              //if (svcHeaders.Authorization===undefined || svcHeaders.Authorization===null) {
              svcHeaders.Authorization = "Bearer " + token;
              //}
            }

            //kony.print("ConnectionHandler.js._makeMBaaSServiceCall_executeServiceCall: Making Service Call to "+ serviceId +" with "+ operationId+" headers: "+JSON.stringify(svcHeaders)+" params: "+JSON.stringify(inputParams));
            integrationObj.invokeOperation(operationId, svcHeaders, inputParams,
                                           function _operationSuccess(results) {
              var isError = false;
              var opstatus = "undefined";
              if (results !== null) {
                opstatus = results.opstatus;
                if (results.opstatus === 0 && results.httpStatusCode === 200) 
                {
                  try {
                    //kony.print("ConnectionHandler.js._makeMBaaSServiceCall_executeServiceCall: Done Service Call to "+ serviceId +" with "+ operationId + ": "+JSON.stringify(results));
                    resolve(results);
                    return;
                  } catch (e) {
                    var error = new Error("Exception when executing callback function.");
                    reject(new Message(error, 
                                       Message.type.ERROR, 
                                       Message.code.SERVICECALL_CALLBACKERROR, 
                                       "Error: Issue treating received data"));
                    return;
                  }
                }
                else {
                  isError = true;
                }
              }
              else
              {
                isError = true;
              }
              if (isError === true) {
                var error = new Error("Service call failed with opstatus " + opstatus);
                //alert("Service call failed with opstatus " + opstatus);
                reject(new Message(error, 
                                   Message.type.ERROR, 
                                   Message.code.SERVICECALL_NORESULT, 
                                   "Error: failed to retrieve service response"));
                return;
              }
            }, 
                                           function _operationError(error) {
              //alert("Service call failed with error " + JSON.stringify(error));
              reject(new Message(error, 
                                 Message.type.ERROR, 
                                 Message.code.SERVICECALL_NOCONNECTION, 
                                 "Error: failed to connect to data service"));
              return;
            });
          } catch (e) {
            reject(new Message(JSON.stringify(e), 
                               Message.type.ERROR, 
                               Message.code.SERVICECALL_NOCONNECTION, 
                               "Error: failed to connect to data service"));
            return;
          }
        }
      });
      return promise;
    }

    //The actual function which makes the service calls
    function _makeFileServerCall(fileServerURL,resourcePathOrURL){
      resourcePathOrURL = resourcePathOrURL.trim();
      kony.print("ConnectionHandler.js._makeFileServerCall.promise");
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js._makeFileServerCall.run");
        var request = new kony.net.HttpRequest();
        function serviceCallback () {
          try {
            if(request.readyState == constants.HTTP_READY_STATE_HEADERS_RECEIVED){
              kony.print("ConnectionHandler.js._makeFileServerCall headers received");
            }else if(request.readyState == constants.HTTP_READY_STATE_DONE){     
              kony.print("ConnectionHandler.js._makeFileServerCall service call done");
              resolve(request.response);
              return;
            }
          } catch (e) {
            reject(new Message(new Error("An unexpected error occurred. ("+e+")"), 
                               Message.type.ERROR, 
                               "UNKNOWN", 
                               "Error!"));
            return;
          }
        }
        if (isNetworkAvailable()===false) {
          var error = new Error("No network available. Please check your network connectivity and try again.");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.NETWORK_FAILED, 
                             "Error: No Network"));
          return;
        }
        else if (_isMobileFabricInitialized===false) {
          var error = new Error("The App is not connected to the cloud. You may have to restart it.");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.SERVICECALL_NOTINITIALIZED, 
                             "Error: not connected to MobileFabric"));
          return;
        }
        else if (_isAuthenticated===false) {
          var error = new Error("You are not logged in.");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.SERVICECALL_NOTLOGGEDIN, 
                             "Error: not logged in"));
          return;
        }
        else if (_isAuthorized===false) {
          var error = new Error("You are not authorized to make service calls. Please log back in with valid credentials.");
          reject(new Message(error, 
                             Message.type.ERROR, 
                             Message.code.SERVICECALL_NOTAUTHORIZED, 
                             "Error: not authorized"));
          return;
        }
        else {
          request.onReadyStateChange=serviceCallback;
          //alert("ConnectionHandler.js.makeFileServerCall url \""+fileServerURL+""+resourcePathOrURL+"\"");

          try {
            request.open(constants.HTTP_METHOD_GET, fileServerURL+""+resourcePathOrURL);
            var token = getToken();
            if(token!==undefined && token!==null) {
              //Injects the Axway Bearer token required for all authorized calls
              request.setRequestHeader("Authorization", "Bearer " + token);
            }
            request.send();
          } catch (e) {
            reject(new Message(JSON.stringify(e), 
                               Message.type.ERROR, 
                               Message.code.UNKNOWN, 
                               "Error: failed to make file server request"));
            return;
          }
        }
      });
      return promise;
    }

    function makeMBaaSServiceCall(serviceId,operationId,headers,inputParams,autoSessionRefreshAndRetry,_bypassAuth){
      kony.print("ConnectionHandler.js.makeMBaaSServiceCall.promise");
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js.makeMBaaSServiceCall.run - First try of the service call");
        _makeMBaaSServiceCall(serviceId,operationId,headers,inputParams,_bypassAuth).then(function onFirstResolve(results) {
          resolve(results);
          return;
        }).fail(function onFirstFailure(error) {
          if (autoSessionRefreshAndRetry!==false) {
            kony.print("WARNING ConnectionHandler.js.makeMBaaSServiceCall - On first failure we try to reconnect");
            _reconnect().then(function onReconnectSuccess() {
              kony.print("WARNING ConnectionHandler.js.makeMBaaSServiceCall - If we succeed, we try our service call again");
              _makeMBaaSServiceCall(serviceId,operationId,headers,inputParams,_bypassAuth).then(function onSecondResolve(results) {
                resolve(results);
                return;
              }).fail(function onSecondFailure(error) {
                kony.print("ERROR ConnectionHandler.js.makeMBaaSServiceCall - If our service call fails again, we fail definitely");
                reject(error);
                return;
              });
            }).fail(function onReconnectFailure(error) {
              kony.print("ERROR ConnectionHandler.js.makeMBaaSServiceCall - And if we cannot even reconnect, we fail as well");
              reject(error);
              return;
            });
          } else {
            kony.print("ERROR ConnectionHandler.js.makeMBaaSServiceCall - fail without reconnecting");
            reject(error);
            return;
          }
        });
      });
      return promise;
    }

    function makeFileServerCall(fileServerUrl,resourcePathOrURL){
      kony.print("ConnectionHandler.js.makeFileServerCall.promise");
      var promise = Q.Promise(function(resolve, reject, notify) {
        kony.print("ConnectionHandler.js.makeFileServerCall.run");
        //First try of the service call
        _makeFileServerCall(fileServerUrl,resourcePathOrURL).then(function onFirstResolve(results) {
          resolve(results);
          return;
        }).fail(function onFirstFailure() {
          //On first failure we try to reconnect
          _reconnect().then(function onReconnectSuccess() {
            //If we succeed, we try our service call again
            _makeFileServerCall(fileServerUrl,resourcePathOrURL).then(function onSecondResolve(results) {
              resolve(results);
              return;
            }).fail(function onSecondFailure(error) {
              //If our service call fails again, we fail definitely
              reject(error);
              return;
            });
          }).fail(function onReconnectFailure(error) {
            //And if we cannot even reconnect, we fail as well
            reject(error);
            return;
          });
        });
      });
      return promise;
    }

    function isNetworkAvailable() {
      kony.print("ConnectionHandler.js.isNetworkAvailable");
      var isAvailable = false;
      if (kony.net.isNetworkAvailable(constants.NETWORK_TYPE_ANY)) {
        kony.print("Network is available");
        isAvailable = true;
      } else {
        kony.application.getCurrentForm().onDeviceBack = function() {};
        kony.print("Network is NOT available");
      }
      return isAvailable;
    }

    function isMBaaSInitialized() {
      return _isMobileFabricInitialized;
    }
    function isAuthenticated() {
      return _isAuthenticated;
    }
    function isAuthorized() {
      return _isAuthorized;
    }
    function getProfile() {
      return _profile;
    }
    function getUser() {
      return _user;
    }
    function setToken(token) {
      _additionalAccessToken=token;
    }
    //Returns the additional token services's token, otherwise the main login service's token
    function getToken() {
      return _additionalAccessToken? _additionalAccessToken : _authAccessToken;
    }
    function getIdentityAccessToken() {
      return _authAccessToken? _authAccessToken : "";
    }
    function getAdditionalAccessToken() {
      return _additionalAccessToken? _additionalAccessToken : "";
    }
    function getRefreshToken() {
      //if current token not defined and if we use persistence, try to retrieve it
      if ((_authRefreshToken === undefined || _authRefreshToken === null) && _persistRefreshToken===true) {
        _authRefreshToken = _retrieveRefreshToken();
      }
      return _authRefreshToken;
    }
    function setRefreshToken(token) {
      _authRefreshToken=token;
      if (_persistRefreshToken===true) {
        _storeRefreshToken(token);
      }  
    }

    function getClient() {
      return _mbaasClient;
    }

    //Here we expose the public variables and functions
    return {
      setLoginUser: setLoginUser,
      setBrowser: setBrowser,
      setMBaaSConfiguration: setMBaaSConfiguration,
      setGroupRoleMapping: setGroupRoleMapping,
      setLoginAuthenticationServiceId: setLoginAuthenticationServiceId,
      setRefreshAuthenticationServiceId: setRefreshAuthenticationServiceId,
      setAdditionalAuthenticationServiceId: setAdditionalAuthenticationServiceId,
      setAdditionalUserInfoServiceId: setAdditionalUserInfoServiceId,
      setPersistRefreshToken: setPersistRefreshToken,
      setRefreshTokenRetrievalFunction: setRefreshTokenRetrievalFunction,
      setRefreshTokenStoreFunction: setRefreshTokenStoreFunction,
      setRefreshFailureCallback: setRefreshFailureCallback,
      initMBaaS: initMBaaS,
      authenticate: authenticate,
      authorize: authorize,
      connect: connect,
      logout: logout,
      logoutOfAuthorizer: logoutOfAuthorizer,
      logoutOfAuthenticator: logoutOfAuthenticator,
      makeMBaaSServiceCall: makeMBaaSServiceCall,
      makeFileServerCall: makeFileServerCall,
      isMBaaSInitialized: isMBaaSInitialized,
      isAuthenticated: isAuthenticated,
      isAuthorized: isAuthorized,
      isNetworkAvailable: isNetworkAvailable,
      setRefreshToken: setRefreshToken,//use for removal with null, or for setting dummy values for testing
      getRefreshToken: getRefreshToken,
      hasRefreshToken: hasRefreshToken,
      setToken: setToken,//use for simulating expiration of Axway session
      getToken: getToken,//returns the relevant access token
      getIdentityAccessToken: getIdentityAccessToken,//returns the access token of the main authentication service (standard or refresh)
      getAdditionalAccessToken: getAdditionalAccessToken,//returns the access token of the additional authentication service
      getProfile: getProfile,
      getUser: getUser,
      getClient: getClient
    };
  });
  return ConnectionHandler;
});