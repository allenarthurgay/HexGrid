goog.provide('hexgrid.player');

function Player(hexGrid) {
    var me;
	function currentLocation(){
		var canvasSize = hexGrid.getCanvasSize();
		return hexGrid.findByPixel(canvasSize[0]/2, canvasSize[1]/2);
	}
    function tick() {
        if(me) {
            me.color = [1,1,1,1];
        }
        me = currentLocation();

        if(me) {
            me.color = [1,0,0,1];
        }
    }
    return {
        tick: tick,
		currentLocation: currentLocation
    }
}