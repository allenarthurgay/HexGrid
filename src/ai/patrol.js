define(function(){
	function PatrolAI(hexGrid, start, end) {
	    var path = hexGrid.getLine(start,end);
	    var time = new Date().getTime();
	    var tickTime = 300;
	    var pathPos = 0;
	    var pathDir = 1;
	    var activePathColor = [0.8,0.8,0.8,1];
	    var clearPathColor = [1,1,1,1];
	    var myColor = [0.5,0.3,0.3,1];
	    var deadColor= [0.3,0,0,1];
	    var dead = false;

	    function colorPath(color) {
	        for(var i = 0; i < path.length; ++i) {
	            path[i].color = color;
	        }
	    }

	    function setNewPatrolPath(hex) {
	        colorPath(clearPathColor);
	        var me = path[pathPos];
	        path = hexGrid.getPath(me,hex);

	        colorPath(activePathColor);
	        me.color = myColor;
	        pathPos = 0;
	    }
	    function posHex() {
	        return path[pathPos];
	    }
	    function die() {
	        dead = true;
	    }
	    function reCalculatePath() {
	        if(dead) {
	            return;
	        }
			var me = path[pathPos];
			me.color = clearPathColor;

	        pathPos = 0;
	        setNewPatrolPath(path[path.length-1])
	    }

	    function tick() {
	        if(dead) {
	            colorPath(clearPathColor);
	            path[pathPos].color = deadColor;
	            return;
	        }
	        var delta = new Date().getTime() - time;

	        if(tickTime < delta) {
	            path[pathPos].color = activePathColor;
	            pathPos += pathDir;
	            if(pathPos > path.length-1 || pathPos < 0) {
	                pathDir = -pathDir;
	                pathPos += pathDir;
	            }
	            path[pathPos].color = myColor;
	            time = new Date().getTime();
	        }
	    }

	    return {
	        tick: tick,
	        setNewPatrolPath: setNewPatrolPath,
	        reCalculatePath: reCalculatePath,
	        posHex: posHex,
	        die: die
	    }
	}
	return PatrolAI;
});