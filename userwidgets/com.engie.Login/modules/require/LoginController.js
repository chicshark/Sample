define(function() {
  var ConnectionHandler = require("com/engie/Login/ConnectionHandler");
  var MBaasConfiguration = require("com/engie/Login/MBaaSConfiguration");
  var GroupRoleMapping = require("com/engie/Login/GroupRoleMapping");
  var Message = require("com/engie/Login/Message");
  var User = require("com/engie/Login/User");

  return {
    constructor: function(baseConfig, layoutConfig, pspConfig) {
      kony.print("LoginController.js.constructor");
      this._connectionHandler = new ConnectionHandler();
      //Provide input for oauth2 auth client
      this._connectionHandler.setBrowser(this.view.browserLogin);
      this._successCallback = function () {};
      this._failureCallback = function () {};
      this._forgotPasswordCallback = function () {};
      this.view.imgLoginBack.onTouchEnd = this._showMain;
      this.view.btnLogin.onClick = this._login;
      this._authenticationServiceType = "NATIVE";
      this._nativeCredentialsNeeded = false;
    },
    //Logic for getters/setters of custom properties
    initGettersSetters: function() {

    },
    _validateLogin: function() {
      if (this.view.txtUsername.text!==undefined &&
          this.view.txtUsername.text!==null &&
          this.view.txtUsername.text.length>=6) {
        this.view.txtUsername.skin="skinLoginTextBox";
        this.view.lblUsernameError.setVisibility(false);
        return true;
      } else {
        this.view.txtUsername.skin="skinLoginTextBoxError";
        this.view.lblUsernameError.setVisibility(true);
        return false;
      }
    },
    _validatePassword: function() {
      if (this.view.txtPassword.text!==undefined &&
          this.view.txtPassword.text!==null &&
          this.view.txtPassword.text.length>=8) {
        this.view.txtPassword.skin="skinLoginTextBox";
        this.view.lblPasswordError.setVisibility(false);
        return true;
      }else {
        this.view.txtPassword.skin="skinLoginTextBoxError";
        this.view.lblPasswordError.setVisibility(true);
        return false;
      }
    },
    _login: function() {
      kony.print("LoginController.js._login");
      var isValid = true;
      if (this._authenticationServiceType == "NATIVE" && this._nativeCredentialsNeeded===true) {
        //If initial refresh failed, provide valid credentials for basic auth client
        var isLoginValid = this._validateLogin();
        var isPasswordValid = this._validatePassword();
        isValid = (isLoginValid && isPasswordValid);
        if (isValid===true) {
          var user = new User();
          user.setLoginName(this.view.txtUsername.text);
          user.setPassword(this.view.txtPassword.text);
          this.setLoginUser(user);
        }
      } 
      //if is oauth2, or refresh, or basic with valid credentials:
      if (isValid===true) {
        var controller = this;
        controller.toolbox.loading.hint();
        controller._connectionHandler.connect().then(function onSuccess (userProfileTokenMap) {
          controller.toolbox.loading.dismiss();
          kony.print("LoginController.js._login->onSuccess "+JSON.stringify(userProfileTokenMap));
          controller._successCallback(userProfileTokenMap);
          controller._reset();
        }).fail(function onFailure(message) {
          kony.print("LoginController.js._login->onFailure "+JSON.stringify(message));
          controller.toolbox.loading.dismiss();
          controller._failureCallback(message);
          controller._reset();
        });
      }
    },
    _reset: function() {
      if (this._authenticationServiceType == "NATIVE") {
         this.setLoginAuthenticationServiceTypeToNative();
      } else if (this._authenticationServiceType == "OAUTH2") {
         this.setLoginAuthenticationServiceTypeToOAuth2();
      }
    },
    _showMain: function() {
      kony.print("LoginController.js._showMain");
      if (this._authenticationServiceType == "OAUTH2") {
        this._hideBrowser();
      } else if (this._authenticationServiceType == "NATIVE") {
        this._hideNative();
      }
    },
    _showNative: function () {
      //Reset form
	  this.view.txtUsername.skin="skinLoginTextBox";
      this.view.txtUsername.text="";
      this.view.lblUsernameError.setVisibility(false);
      this.view.txtPassword.skin="skinLoginTextBox";
      this.view.txtPassword.text="";
      this.view.lblPasswordError.setVisibility(false);
      //this.view.flxNativeLogin.setVisibility(true);
      this._nativeCredentialsNeeded=true;
      this.toolbox.loading.dismiss();//needed as this is called during refresh failure
      
      this.view.flxNativeLogin.bottom="14%";
      this.view.imgLoginBlurred.bottom="-35%";
      /*this.view.flxNativeLogin.animate(
        kony.ui.createAnimation({  
          0:{
            "bottom": this.view.flxNativeLogin.bottom? this.view.flxNativeLogin.bottom : "-40%",
          },
          100:{
            "bottom": "14%",
            "stepConfig": {"timingFunction": kony.anim.EASIN_IN_OUT}
          } 
        }),{"fillMode": kony.anim.FILL_MODE_FORWARDS,"duration": 5.8,"delay" : 0});
      this.view.imgLoginBlurred.animate(
        kony.ui.createAnimation({  
          0:{
            "bottom": this.view.imgLoginBlurred.bottom? this.view.imgLoginBlurred.bottom : "100%",
          },
          100:{
            "bottom": "-35%",
            "stepConfig": {"timingFunction": kony.anim.EASIN_IN_OUT}
          } 
        }),{"fillMode": kony.anim.FILL_MODE_FORWARDS,"duration": 5.8,"delay" : 0});*/
      
    },
    _hideNative: function () {
      //this.view.flxNativeLogin.setVisibility(false);
      this.view.flxNativeLogin.bottom="-40%";
      this.view.imgLoginBlurred.bottom="100%";
      /*this.view.flxNativeLogin.animate(
        kony.ui.createAnimation({  
          0:{
            "bottom": this.view.flxNativeLogin.bottom? this.view.flxNativeLogin.bottom : "14%",
          },
          100:{
            "bottom": "-40%",
            "stepConfig": {"timingFunction": kony.anim.EASIN_IN_OUT}
          } 
        }),{"fillMode": kony.anim.FILL_MODE_FORWARDS,"duration": 5.8,"delay" : 0});
      this.view.imgLoginBlurred.animate(
        kony.ui.createAnimation({  
          0:{
            "bottom": this.view.imgLoginBlurred.bottom? this.view.imgLoginBlurred.bottom : "-35%",
          },
          100:{
            "bottom": "100%",
            "stepConfig": {"timingFunction": kony.anim.EASIN_IN_OUT}
          } 
        }),{"fillMode": kony.anim.FILL_MODE_FORWARDS,"duration": 5.8,"delay" : 0});*/
    },
    _showBrowser: function () {
      this.view.flxLoginBrowserContainer.setVisibility(true);
      this.view.imgLoginBack.setVisibility(true);
      this.view.flxLoginButton.setVisibility(false);
      this.toolbox.loading.dismiss();//needed as this is called during refresh failure
    },
    _hideBrowser: function () {
      this.view.flxLoginBrowserContainer.setVisibility(false);
      this.view.imgLoginBack.setVisibility(false);
      this.view.flxLoginButton.setVisibility(true);
    },
    _forgotPassword: function () {
      this._forgotPasswordCallback();
    },
    toolbox : {
      loading : {
        show : function (msg) {
          kony.application.showLoadingScreen(null, msg,constants.LOADING_SCREEN_POSITION_FULL_SCREEN , true, true, {shouldShowLabelInBottom: "true", separatorHeight: 50});
        },
        hint : function () {
          kony.application.showLoadingScreen(null, "",constants.LOADING_SCREEN_POSITION_ONLY_CENTER , false, true, {shouldShowLabelInBottom: "true", separatorHeight: 50});
        },
        dismiss : function () {
          kony.application.dismissLoadingScreen();
        }
      }
    },
    setSuccessCallback: function (action) {
      kony.print("LoginController.js.setSuccessCallback");
      this._successCallback = action;
    },
    setFailureCallback: function (action) {
      kony.print("LoginController.js.setFailureCallback");
      this._failureCallback = action;
    },
    setForgotPasswordCallback: function (action) {
      kony.print("LoginController.js.setForgotPasswordCallback");
      this._forgotPasswordCallback = action;
    },
    setLoginAuthenticationServiceTypeToOAuth2: function () {
      this._authenticationServiceType = "OAUTH2";
      this._hideNative();
      this._showMain();
      this._connectionHandler.setRefreshFailureCallback(this._showBrowser);
    },
    setLoginAuthenticationServiceTypeToNative: function () {
      this._authenticationServiceType = "NATIVE";
      this._hideNative();
      this._showMain();
      this._nativeCredentialsNeeded = false;//by default we try with refresh
      if (this._connectionHandler.hasRefreshToken()===false) {
        this._showNative();
      } else {
        this._connectionHandler.setRefreshFailureCallback(this._showNative);
      } 
    },
	setMBaaSConfiguration: function(mbaasConfiguration) {
      kony.print("LoginController.js.setMBaaSConfiguration");
      if(mbaasConfiguration.typeOf==MBaasConfiguration.typeOf) {
        this._connectionHandler.setMBaaSConfiguration(mbaasConfiguration);
      } else {
        kony.print("LoginController.js.setMBaasConfiguration: You must provide an instance of the com.engie.Login.MBaasConfiguration class.");
      }
    },
	setGroupRoleMapping: function(groupRoleMapping) {
      kony.print("LoginController.js.setGroupRoleMapping");
      if(groupRoleMapping.typeOf==GroupRoleMapping.typeOf) {
        this._connectionHandler.setGroupRoleMapping(groupRoleMapping);
      } else {
        kony.print("LoginController.js.setGroupRoleMapping: You must provide an instance of the com.engie.Login.GroupRoleMapping class.");
      }
    },
    setLoginUser: function(user) {
      kony.print("LoginController.js.setLoginUser");
      if(user.typeOf==User.typeOf) {
        this._connectionHandler.setLoginUser(user);
      } else {
        kony.print("LoginController.js.setLoginUser: You must provide an instance of the com.engie.Login.User class providing at least the LoginName and Password.");
      }
    },
    setLoginAuthenticationServiceId: function(serviceId) {
      kony.print("LoginController.js.setLoginAuthenticationServiceId");
      this._connectionHandler.setLoginAuthenticationServiceId(serviceId);
    },
    setRefreshAuthenticationServiceId: function(serviceId) {
      kony.print("LoginController.js.setRefreshAuthenticationServiceId");
      this._connectionHandler.setRefreshAuthenticationServiceId(serviceId);
    },
    setAdditionalAuthenticationServiceId: function(serviceId) {
      kony.print("LoginController.js.setAdditionalAuthenticationServiceId");
      this._connectionHandler.setAdditionalAuthenticationServiceId(serviceId);
    },
    setAdditionalUserInfoServiceId: function(serviceId) {
      kony.print("LoginController.js.setAdditionalUserInfoServiceId");
      this._connectionHandler.setAdditionalUserInfoServiceId(serviceId);
    },
    setPersistRefreshToken: function(boolean) {
      kony.print("LoginController.js.setPersistRefreshToken");
      this._connectionHandler.setPersistRefreshToken(boolean);
    },
    setRefreshTokenRetrievalFunction: function(action) {
      kony.print("LoginController.js.setRefreshTokenRetrievalFunction");
      this._connectionHandler.setRefreshTokenRetrievalFunction(action);
    },
    setRefreshTokenStoreFunction: function(action) {
      kony.print("LoginController.js.setRefreshTokenStoreFunction");
   	  this._connectionHandler.setRefreshTokenStoreFunction(action);
    },
    getRefreshToken: function () {
      kony.print("LoginController.js.getRefreshToken");
      return this._connectionHandler.getRefreshToken();
    },
    getToken: function () {
      kony.print("LoginController.js.getToken");
      return this._connectionHandler.getToken();
    },
    getProfile: function () {
      kony.print("LoginController.js.getProfile");
      return this._connectionHandler.getProfile();
    },
    getUser: function () {
      kony.print("LoginController.js.getUser");
      return this._connectionHandler.getUser();
    },
    getClient: function () {
      kony.print("LoginController.js.getClient");
      return this._connectionHandler.getClient();
    },
    getConnectionHandler: function () {
      return this._connectionHandler;
    },
    setRefreshToken: function (token) {//use for removal with null, or for setting dummy values for testing
      kony.print("LoginController.js.setRefreshToken");
      return this._connectionHandler.setRefreshToken(token);
    },
    setToken: function (token) {//use for simulating expiration of Axway session
      kony.print("LoginController.js.setToken");
      return this._connectionHandler.setToken(token);
    },
    isMBaaSInitialized: function () {
      kony.print("LoginController.js.isMBaaSInitialized");
      return this._connectionHandler.isMBaaSInitialized();
    },
    isAuthenticated: function () {
      kony.print("LoginController.js.isAuthenticated");
      return this._connectionHandler.isAuthenticated();
    },
    isAuthorized: function () {
      kony.print("LoginController.js.isAuthorized");
      return this._connectionHandler.isAuthorized();
    },
    isNetworkAvailable: function () {
      kony.print("LoginController.js.isNetworkAvailable");
      return this._connectionHandler.isNetworkAvailable();
    },
    logout: function () {
      kony.print("LoginController.js.logout");
      return this._connectionHandler.logout();
    },
    /*makeMBaaSServiceCall: function () {
      return this._connectionHandler.makeMBaaSServiceCall();
    },
    makeFileServerCall: function () {
      return this._connectionHandler.makeFileServerCall();
    },*/
  };
});