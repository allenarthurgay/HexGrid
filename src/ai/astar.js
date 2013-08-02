define(function(){
	/**
	 *
	 * @param {Function} findNeighborsDelegate
	 * @param {Function} heuristicsDelegate
	 * @constructor
	 */
	function AStarPathFinderFactory(hexGrid, heuristicsDelegate){
		var heuristics = heuristicsDelegate;

		function removeNodeFromList(list, node){
			for(var i=0; i < list.length; i++){
				if(list[i].equals(node)){
					list.splice(i, 1);
					return;
				}
			}
		}

		function isNodeInList(list, node){
			for(var i=0; i < list.length; i++){
				if(list[i].equals(node)){
					return true;
				}
			}
			return false;
		}

		function clearNodeOfAddProperties(node){
			node.g = 0;
			node.h = 0;
			node.parent = null;
			node.f = 0;
		}

		function findPath(startHex, endHex){
			var openList = [];
			var closedList = [];
			openList.push(startHex);

			while(openList.length > 0){
				var lowInd = 0;
				for(var i = 0; i < openList.length; i++){
					if(openList[i].f < openList[lowInd].f) { lowInd = i; }
				}
				var currentHex = openList[lowInd];

				if(currentHex.equals(endHex)) {
					var curr = currentHex;
					var ret = [];
					while(curr.parent) {
						ret.push(curr);
						curr = curr.parent;
					}
	                ret.push(startHex);
					var path = ret.reverse();
					hexGrid.applyToAllHexes(clearNodeOfAddProperties);
					return path;
				}

				removeNodeFromList(openList, currentHex);
				closedList.push(currentHex)

				var neighbors = hexGrid.findNeighbors(currentHex);

				for(var i=0; i<neighbors.length;i++) {
					var neighbor = neighbors[i];
					if(isNodeInList(closedList, neighbor) || hexBlocked(neighbor)) {
						// not a valid node to process, skip to next neighbor
						continue;
					}

					// g score is the shortest distance from start to current node, we need to check if
					//	 the path we have arrived at this neighbor is the shortest one we have seen yet
					if(currentHex.g == undefined){
						currentHex.g = 0;
					}
					var gScore = currentHex.g + 1; // 1 is the distance from a node to it's neighbor
					var gScoreIsBest = false;


					if(!isNodeInList(openList, neighbor)) {
						// This the the first time we have arrived at this node, it must be the best
						// Also, we need to take the h (heuristic) score since we haven't done so yet

						gScoreIsBest = true;
						neighbor.h = heuristics(neighbor, endHex);
						openList.push(neighbor);
					}
					else if(gScore < neighbor.g) {
						// We have already seen the node, but last time it had a worse g (distance from start)
						gScoreIsBest = true;
					}

					if(gScoreIsBest) {
						// Found an optimal (so far) path to this node.	 Store info on how we got here and
						//	just how good it really is...
						neighbor.parent = currentHex;
						neighbor.g = gScore;
						neighbor.f = neighbor.g + neighbor.h;
					}
				}

			}
		}

		return {
			findPath : findPath
		};
	}
	return AStarPathFinderFactory;
});