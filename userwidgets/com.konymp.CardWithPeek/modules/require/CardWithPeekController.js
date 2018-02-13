define(function() {

  constants.DEFAULT_CENTER = "20%";
  constants.DEFAULT_RIGHT = "85%";
  constants.DEFAULT_LEFT = "-45%";
  constants.RIGHT_SIDE_ANGLE=0;
  constants.LEFT_SIDE_ANGLE=0;
  constants.CENTER_IMAGE_HEIGHT="80%";
  constants.SIDE_IMAGE_HEIGHT="70%";
  constants.IMAGES_IN_LEFT="-120%";
  constants.IMAGES_IN_RIGHT="120%";
  return {
    constructor: function(baseConfig, layoutConfig, pspConfig) {
      this._flag = 0;
      this._dataIndex=0;
      this._flag2 = 0;
      this.dataDummy = [{
        "imgSlide" :"kony_mp_carousel3_slides1.png" ,
        "hotelName" : "Litore Resort Hotel & SPA",
        "hotelPrice" :"$119.94",
        "hotelLocation" :"Am Rehspung 35, Holzlar, 53229 New York, USA",
        "mapLocations":[{
          lat:"40.748817",
          lon:"-73.985428",
          image : "kony_mp_carousel3_pin.png",
        }],
        "hotelFacilities":{
          "wifi":true,
          "parking":true,
          "greatView" :true,
          "bedKing":true,
          "taxibook":true,
          "disGuest" :true
        }

      },{
        "imgSlide" :"kony_mp_carousel3_slides2.png" ,
        "hotelName" : "The Peninsula Chicago",
        "hotelPrice" :"$119.94",
        "hotelLocation" :"108 E Superior St, Chicago, IL 60611, USA",
        "mapLocations":[{
          lat:"41.881832",
          lon:"-87.623177",
          image : "kony_mp_carousel3_pin.png",
        }],
        "hotelFacilities":{
          "wifi":true,
          "parking":true,
          "greatView" :false,
          "bedKing":true,
          "taxibook":false,
          "disGuest" :true
        }

      },{
        "imgSlide" :"kony_mp_carousel3_slides3.png" ,
        "hotelName" : "Castille Paris",
        "hotelPrice" :"$119.94",
        "hotelLocation" :"33-37 Rue Cambon, 75001 Paris, France",
        "mapLocations":[{
          lat:"48.864716",
          lon:"2.349014",
          image : "kony_mp_carousel3_pin.png",
        }],
        "hotelFacilities":{
          "wifi":false,
          "parking":true,
          "greatView" :true,
          "bedKing":true,
          "taxibook":false,
          "disGuest" :true
        }

      },{
        "imgSlide" :"kony_mp_carousel3_slides4.png" ,
        "hotelName" : "Hotel München Palace",
        "hotelPrice" :"$119.94",
        "hotelLocation" :" Trogerstraße 21, 81675 München, Germany",
        "mapLocations":[{
          lat:"52.520645",
          lon:"13.409779",
          image : "kony_mp_carousel3_pin.png",
        }],
        "hotelFacilities":{
          "wifi":true,
          "parking":true,
          "greatView" :true,
          "bedKing":true,
          "taxibook":false,
          "disGuest" :false
        }

      }];

    },
    initGettersSetters: function() {},
    initImageWidgets: function(data) {
      if (data == null && data == undefined) {
        this.defaultInit();
      } else {
        this.manualInit(data);
      }

    },
    defaultInit: function() {
      try {
        this.length = 4;
        this.view.flx1.left = constants.DEFAULT_CENTER;
        for (var loop = 2; loop <= this.length; loop++) {
          this.animate(this.view["flx" + loop],constants.RIGHT_SIDE_ANGLE, constants.DEFAULT_RIGHT, constants.SIDE_IMAGE_HEIGHT);
        }
        this._currentIndex = 1;
        this.setDataToDataContainer(this._currentIndex);

      } catch (exception) {
        alert("in defaultinit exception");
      }

    },
    manualInit: function(data) {},
    animate: function(widget, angle, x, height) {
      try {
        var trans100 = kony.ui.makeAffineTransform();
        trans100.rotate3D(parseInt(angle), 0, 1, 0);
        widget.animate(
          kony.ui.createAnimation({

            "100": {
              "left": x,

              "stepConfig": {
                "timingFunction": kony.anim.EASE
              },
              "rectified": true,
              "transform": trans100
            },

          }), {
            "delay": 0,
            "iterationCount": 1,
            "fillMode": kony.anim.FILL_MODE_FORWARDS,
            "duration": 0.25
          });
      } catch (exception) {
        alert(JSON.stringify(exception));
      }
    },
    setOnTouchIndex: function(x) {
      this._startIndex = x;
    },
    setOnTouchendIndex: function(x) {
      this._endIndex = x;
    },
    findGesture: function() {
      try {
        var difference = this._startIndex - this._endIndex;
        this.moveWidgetToBackground(this._currentIndex);
        if ((this._currentIndex > 0 && this._currentIndex < this.length)) {
          if (difference < 0) {
            this._dataIndex--;
            if(this._dataIndex<=0)
            {
              this._dataIndex=0;
            }
            this._flag2=1;
            this.setDataToDataContainer();
            if (this._flag) {
              this._currentIndex = parseInt(this._currentIndex) - 1;
              this._flag = 0;
            }
            if (this.view["flx" + (parseInt(this._currentIndex) + 2)] !== null && this.view["flx" + (parseInt(this._currentIndex) + 2)] !== undefined) {
              this.animate(this.view["flx" + (parseInt(this._currentIndex) + 2)], constants.RIGHT_SIDE_ANGLE, constants.IMAGES_IN_RIGHT, constants.SIDE_IMAGE_HEIGHT);
            }
            this.animate(this.view["flx" + (parseInt(this._currentIndex) + 1)], constants.RIGHT_SIDE_ANGLE, constants.DEFAULT_RIGHT, constants.SIDE_IMAGE_HEIGHT);
            this.animate(this.view["flx" + (parseInt(this._currentIndex))], 0, constants.DEFAULT_CENTER, constants.CENTER_IMAGE_HEIGHT);
            if (this.view["flx" + (parseInt(this._currentIndex) - 1)] !== null && this.view["flx" + (parseInt(this._currentIndex) - 1)] !== undefined) {
              this.animate(this.view["flx" + (parseInt(this._currentIndex) - 1)], constants.LEFT_SIDE_ANGLE, constants.DEFAULT_LEFT, constants.SIDE_IMAGE_HEIGHT);
              this._currentIndex = parseInt(this._currentIndex) - 1;
            }
            else{
              this._flag2=0; 
            }

          } else {
            this._dataIndex++;
            if(this._dataIndex>=this.length)
            {
              this._dataIndex=this.length-1;
            }
            this.setDataToDataContainer();
            if (this._flag2  ) {
              this._flag2 = 0;
              this._currentIndex = parseInt(this._currentIndex) + 1;
            }

            if (this._currentIndex >= this.length) {
              this._currentIndex = this.length - 1;
            }
            this._flag = 1;
            if (this.view["flx" + (parseInt(this._currentIndex) - 1)] !== null && this.view["flx" + (parseInt(this._currentIndex) - 1)] !== undefined) {
              this.animate(this.view["flx" + (parseInt(this._currentIndex) - 1)], constants.LEFT_SIDE_ANGLE, constants.IMAGES_IN_LEFT,constants.SIDE_IMAGE_HEIGHT);
            }

            this.animate(this.view["flx" + this._currentIndex], constants.LEFT_SIDE_ANGLE, constants.DEFAULT_LEFT,constants.SIDE_IMAGE_HEIGHT);
            this.animate(this.view["flx" + (parseInt(this._currentIndex) + 1)], 0, constants.DEFAULT_CENTER, constants.CENTER_IMAGE_HEIGHT);
            if (this.view["flx" + (parseInt(this._currentIndex) + 2)] !== null && this.view["flx" + (parseInt(this._currentIndex) + 2)] !== undefined) {
              this.animate(this.view["flx" + (parseInt(this._currentIndex) + 2)], constants.RIGHT_SIDE_ANGLE, constants.DEFAULT_RIGHT, constants.SIDE_IMAGE_HEIGHT);
              this._currentIndex = parseInt(this._currentIndex) + 1;
            } else {
              this._flag = 0;
            }
          }
        }
      } catch (exception) {
        alert(" in exception");
      }
    },
    moveWidgetToBackground: function(selectedIndex) {
      for (var loop = selectedIndex - 1; loop > 0; loop--) {
        if (this.view["flx" + loop] !== null && this.view["flx" + loop] !== undefined) {
          this.view["flx" + loop].left = constants.IMAGES_IN_LEFT;
        }
      }
      for (var loop = selectedIndex + 2; loop <= this.length; loop++) {
        if (this.view["flx" + loop] !== null && this.view["flx" + loop] !== undefined) {
          this.view["flx" + loop].left = constants.IMAGES_IN_RIGHT;
        }
      }

    },
    setDataToDataContainer : function(){
      try{
        this.view.mapView.zoomLevel = 7;
        var data=this.dataDummy[this._dataIndex];

        this.view.lblHeading.text = data.hotelName;
        this.view.lblPrice.text =data.hotelPrice;
        this.view.lblLocation.text =data.hotelLocation;
        this.view.mapView.locationData=data.mapLocations;
        if(data.hotelFacilities.wifi ===true){
          this.view.flxWifi.isVisible=true;
        }else
        {this.view.flxWifi.isVisible=false;}
        if(data.hotelFacilities.parking ===true){
          this.view.flxParking.isVisible=true;
        }else
        {this.view.flxParking.isVisible=false;}
        if(data.hotelFacilities.greatView ===true){
          this.view.flxGreatView.isVisible=true;
        }else
        {this.view.flxGreatView.isVisible=false;}
        if(data.hotelFacilities.bedKing ===true){
          this.view.flxKingSizeBed.isVisible=true;
        }else
        {this.view.flxKingSizeBed.isVisible=false;}
        if(data.hotelFacilities.taxibook ===true){
          this.view.flxTaxiBook.isVisible=true;
        }else
        {this.view.flxTaxiBook.isVisible=false;}
        if(data.hotelFacilities.disGuest ===true){
          this.view.flxDisGuests.isVisible=true;
        }else
        {this.view.flxDisGuests.isVisible=false;}
      }
      catch(exception){
        alert(" error in setting");
      }
    }
  };
});