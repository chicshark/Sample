/*
#
#  Created by Team Kony.
#  Copyright (c) 2017 Kony Inc. All rights reserved.
#
*/
define(function() {
    var konyLoggerModule = require('com/konymp/facebooklogin/konyLogger');
    var konymp = konymp || {};
    konymp.logger = (new konyLoggerModule("Facebook login Component")) || function() {};
    konymp.logger.setLogLevel("DEBUG");
    konymp.logger.enableServerLogging = true;
    constants.DEFAULT_SUCCESS_MESSAGE = "Login Success";
    constants.DEFAULT_FAILURE_MESSAGE = "Login Failed";
    constants.MF_ALERT_MESSAGE = "Please connect to MobileFabric";
    return {
        constructor: function(baseConfig, layoutConfig, pspConfig) {

        },
        //Logic for getters/setters of custom properties
        initGettersSetters: function() {

        },
        invokeInit: function() {
          	this._intialHeight=this.view.height;
          	this._initialWidth=this.view.width;
          	this._initalTop=this.view.top;
          	this._initalLeft=this.view.left;
          	this._initalRight=this.view.right;
          	this._intialBottom=this.view.bottom;
          	this._centerX=this.view.centerX;
          	this._centerY=this.view.centerY;
          	this.view.zIndex=10;
          	this.view.left = "0%";
          	this.view.top = "0%";
            this.view.height = "100%";
            this.view.width = "100%";
            this.view.flxMain.isVisible = false;
            this.view.flxIdentity.isVisible = true;
          	this.view.forceLayout();
            this.invokeIdentityService("reusableFacebookLogin");
        },
        invokeIdentityService: function(providerName) {
            konymp.logger.trace("---------------Entering invokeIdentityService api---------------", konymp.logger.FUNCTION_ENTRY);
            if (!kony.net.isNetworkAvailable(constants.NETWORK_TYPE_ANY)) {
				this.resetPosition();
                alert("No Internet Connection Available");
                return;
            }
            try {
                var argument = {};
                var authorizationClient = null;
                kony.application.showLoadingScreen(null, "Loading...", constants.LOADING_SCREEN_POSITION_ONLY_CENTER, false, true, {});
                var sdkClient = new kony.sdk.getCurrentInstance();
                if (Object.keys(sdkClient).length !== 0) {
                    authorizationClient = sdkClient.getIdentityService(providerName);
                }
                if (authorizationClient === null || authorizationClient === undefined) {
                    kony.application.dismissLoadingScreen();
                    konymp.logger.info("Authorization object null - Connect to MF");
					this.resetPosition();
                    alert(constants.MF_ALERT_MESSAGE);
                    return;
                }
                this.view.forceLayout();
                argument.browserWidget = this.view.brwsrIdentity;
                kony.application.dismissLoadingScreen();
                konymp.logger.info("Network call to MF for identity authentication", konymp.logger.SERVICE_CALL);
                authorizationClient.login(argument, this.successWrapper.bind(this), this.failureWrapper.bind(this));
            } catch (exception) {
                kony.application.dismissLoadingScreen();
				this.resetPosition();
                konymp.logger.error(JSON.stringify(exception), konymp.logger.EXCEPTION);
            }
            konymp.logger.trace("---------------Exiting invokeIdentityService api---------------", konymp.logger.FUNCTION_EXIT);
        },
        /**
         * @function successWrapper
         * @description Success callback for invokeIdentityService
         * @private
         * @param {Object} response
         * @callback invokeIdentityServiceCallback
         * @event loginSuccessEvent
         */
        successWrapper: function(response) {
            konymp.logger.trace("---------------Entering successWrapper function---------------", konymp.logger.FUNCTION_ENTRY);
            konymp.logger.info("Invoke identity service success---" + JSON.stringify(response), konymp.logger.SUCCESS_CALLBACK);
            try {
                kony.application.dismissLoadingScreen();
                this.resetPosition();
                if (this.onLoginSuccess != null && this.onLoginSuccess != undefined) {
                    this.onLoginSuccess(response);
                } else {
                    alert(constants.DEFAULT_SUCCESS_MESSAGE);
                }
            } catch (exception) {
                konymp.logger.error(JSON.stringify(exception), konymp.logger.EXCEPTION);
            }
            konymp.logger.trace("---------------Exiting successWrapper function---------------", konymp.logger.FUNCTION_EXIT);
        },
        /**
         * @function failureWrapper
         * @description Failure callback for invokeIdentityService
         * @private
         * @param {Object} response
         * @callback invokeIdentityServiceCallback
         * @event loginFailureEvent
         */
        failureWrapper: function(response) {
            konymp.logger.trace("---------------Entering failureWrapper function---------------", konymp.logger.FUNCTION_ENTRY);
            konymp.logger.info("Invoke identity service failure" + JSON.stringify(response), konymp.logger.ERROR_CALLBACK);
            try {
                kony.application.dismissLoadingScreen();
                this.resetPosition();
                if (this.onLoginFailure !== null && this.onLoginFailure !== undefined) {
                    konymp.logger.info("Invoking Login Failure event");
                    this.onLoginFailure(response);
                } else {
                    alert(constants.DEFAULT_FAILURE_MESSAGE);
                }
            } catch (exception) {
                konymp.logger.error(JSON.stringify(exception), konymp.logger.EXCEPTION);
            }
            konymp.logger.trace("---------------Exiting failureWrapper function---------------", konymp.logger.FUNCTION_EXIT);
        },
        /**
         * @function resetPosition
         * @description Resets the position of the icon and browser
         * @private
         */
        resetPosition: function() {
            konymp.logger.trace("---------------Entering resetPosition function---------------", konymp.logger.FUNCTION_ENTRY);
            try {
              	this.view.zIndex=5;
              	this.view.height=this._intialHeight;
          		this.view.width=this._initialWidth;
          		this.view.top=this._initalTop;
          		this.view.left=this._initalLeft;
          		this.view.right=this._initalRight;
          		this.view.bottom=this._intialBottom;
          		this.view.centerX=this._centerX;
          		this.view.centerY=this._centerY;
                this.view.flxIdentity.isVisible = false;
              	this.view.flxMain.isVisible = true;
            } catch (exception) {
                konymp.logger.error(JSON.stringify(exception), konymp.logger.EXCEPTION);
            }
            konymp.logger.trace("---------------Exiting resetPosition function---------------", konymp.logger.FUNCTION_EXIT);
        }
    };
});