define(function() {

  return {
    constructor: function(baseConfig, layoutConfig, pspConfig) {
      this.view.imgCard2.onTouchStart = this.cardTouch;
      this.view.imgCard3.onTouchStart = this.cardTouch;
      this.view.imgCard4.onTouchStart = this.cardTouch;
      this.view.imgCard5.onTouchStart = this.cardTouch;
      this.view.imgCard6.onTouchStart = this.cardTouch;
    },
    cardTouch : function(eventobject,x,y){
      var temp = eventobject.src;
      var id =eventobject.id;
      this.view[id].src = this.view.imgCard1.src;
      this.view.imgCard1.src= temp;
    }
  };
});