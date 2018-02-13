define({
    /*
      This is an auto generated file and any modifications to it may result in corruption of the action sequence.
    */
    /** onTouchStart defined for flxImageholder **/
    AS_FlexContainer_af76b314344c4d37a2949de468b46b2a: function AS_FlexContainer_af76b314344c4d37a2949de468b46b2a(eventobject, x, y) {
        var self = this;
        this.setOnTouchIndex(x);
    },
    /** onTouchEnd defined for flxImageholder **/
    AS_FlexContainer_b6f078d2abae478fa1d56b88775d4087: function AS_FlexContainer_b6f078d2abae478fa1d56b88775d4087(eventobject, x, y) {
        var self = this;
        this.setOnTouchendIndex(x);
        this.findGesture();
    },
    /** postShow defined for CardWithPeek **/
    AS_FlexContainer_h9e7986fd51840c1a318d68d099e7a56: function AS_FlexContainer_h9e7986fd51840c1a318d68d099e7a56(eventobject) {
        var self = this;
        this.initImageWidgets(null);
    }
});