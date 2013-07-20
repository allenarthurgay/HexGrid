goog.provide('hexgrid');

goog.require('hexgrid.player');
goog.require('hexgrid.hex');
goog.require('hexgrid.render.camera');
goog.require('hexgrid.ai');
goog.require('hexgrid.util');
goog.require('hexgrid.render.renderengine');

function HexGrid(canvas, use3D) {
	var hexSize = 10.0;
	var hexRenderList = [];
	var hexLookup = {};
	var map = null;

	var renderer = new HexRenderEngine(canvas, use3D);

    this.numTextures = function() {
        return renderer.numTextures();
    }
    this.loop = function() {
        this.update();
        this.renderOneFrame();
    }

    this.getCanvasSize = function() {return [canvas.width, canvas.height];}

	function makeHexToMapKey(q, r) {
		return q + "_" + r ;
	}

	function mapHexToTile(hex, mapTile) {
		hexLookup[makeHexToMapKey(hex.q, hex.r)] = {
			hex: hex,
			tile: mapTile
		};
	}

	function addHexFromTile(mapTile) {
		var hex = new Hex(mapTile.x, mapTile.y, hexSize);
		mapHexToTile(hex, mapTile);
		hexRenderList.push(hex);
	}

	this.getLine = function(hex1, hex2){
		var vecDistance = this.vectorDistanceBetween(hex1, hex2);
		var distance = this.scalarDistance(hex1, hex2);
		var hexes = [];
		for (var i = 0; i < distance; i++) {
			var factor = i / distance;
			var dX = Math.round(vecDistance.x * factor);
			var dY = Math.round(vecDistance.y * factor);
			var dZ = Math.round(vecDistance.z * factor);

			var nextX = hex1.x + dX;
			var nextY = hex1.y + dY;
			var nextZ = hex1.z + dZ;
			var blah = new convertXYZtoQR(nextX, nextY, nextZ);
			var realHex = this.find(blah.q, blah.r);
			if (realHex) {
				hexes.push(realHex);
			}
		}
		return hexes;
	};

	this.vectorDistanceBetween = function vectorDistanceBetween(hex1, hex2){
		var dX = hex2.x - hex1.x;
		var dY = hex2.y - hex1.y;
		var dZ = hex2.z - hex1.z;

		return {
			x: dX,
			y: dY,
			z: dZ
		};
	};

	this.scalarDistance = function hexDistance(hex1, hex2){
		var abs = Math.abs,
			x1 = hex1.x, y1=hex1.y, z1=hex1.z,
			x2 = hex2.x, y2 = hex2.y, z2 = hex2.z;

		return (abs(x1 - x2) + abs(y1 - y2) + abs(z1 - z2)) / 2;
	}

	this.loadMap = function(mapData) {
		map = mapData;
		mapData.forEach(addHexFromTile)
	};

	this.getMap = function() {
		return map;
	};

	this.draw = function() {
		renderer.drawHexes(hexRenderList);
	};

	this.clear = function() {
		renderer.clearCanvas();
	};

	function pixelToHex(x, y) {
		var q = ((1 / 3 * Math.sqrt(3) * (x) - 1 / 3 * y)) / hexSize;
		var r = (2 / 3 * y) / hexSize;
		var ret = {
			q: Math.round(q),
			r: Math.round(r)
		};
		return ret;
	};

	this.findByPixel = function(x, y) {
		var point = renderer.projectScreenCoordToXYPlane(x, y);
		x = point[0];
		y = point[1];
		var hexToFind = pixelToHex(x, y);
		return this.find(hexToFind.q, hexToFind.r);
	};

	this.find = function(x, y) {
		var key = makeHexToMapKey(x, y);
		var lookup = hexLookup[key];
		if(lookup){
			return lookup.hex;
		}
		return null;
	};

	this.remove = function(x, y) {
		var key = makeHexToMapKey(x, y);
		var lookup = hexLookup[key];
		if(lookup){
			hexLookup[key] = null;
		}
		var h = new Hex(x, y, hexSize);
		for (var i = 0; i < hexRenderList.length; ++i) {
			if (hexRenderList[i].equals(h)) {
				hexRenderList.splice(i, 1);
				break;
			}
		}
	}

	this.removeAll = function() {
		hexRenderList = [];
		map = {};
	}

	this.applyToAllHexes = function(func) {
		if (typeof func !== 'function') {
			return;
		}

		for (var i = 0; i < hexRenderList.length; ++i) {
			func(hexRenderList[i]);
		}
	}

	this.renderOneFrame = function() {
		this.clear();
		this.draw();
	}

	var neighborDeltas = [
		[+1, 0],
		[+1, -1],
		[ 0, -1],
		[-1, 0],
		[-1, +1],
		[ 0, +1]
	];

	this.getNeighbor = function(hex, neighborIdx){
		return this.find(hex.q + neighborDeltas[neighborIdx][0], hex.r + neighborDeltas[neighborIdx][1]);
	}

	this.findNeighbors = function(hex) {

		var neighbors = [];
		for (var i = 0; i < neighborDeltas.length; ++i) {
			var n = this.getNeighbor(hex,i);
			if (n) {
				neighbors.push(n);
			}
		}
		return neighbors;
	}

	this.getRing = function(hex,distance) {
		var q = hex.q-distance, r = hex.r + distance;
		var ring = [];

		for(var i = 0; i < neighborDeltas.length; ++i) {
			for(var j = 0; j < distance; ++j) {
				var h = this.find(q, r);
				if(h){
					ring.push(h);
				}
				q += neighborDeltas[i][0];
				r += neighborDeltas[i][1];
			}
		}
		return ring;
	}

	this.getRange = function(hex, distance) {
		var range = [hex];
		for(var dx = -distance; dx <=distance; ++dx) {
			for(var dy = Math.max(-distance, -dx-distance); dy <= Math.min(distance, -dx + distance); ++dy) {
				var dz = -dx-dy;

				var q = hex.x + dx;
				var r = hex.z + dz;
				var h = this.find(q,r);
				if(h) {
					range.push(h);
				}
			}
		}
		return range;
	}

	this.getRangeIntersection= function(h1,d1,h2,d2) {
		var r1 = this.getRange(h1, d1);
		var r2 = this.getRange(h2, d2);
		var intersection = [];
		for(var i = 0; i < r1.length; ++i){
			for(var j = 0; j < r2.length; ++j) {
				if(r1[i].equals(r2[j])){
					intersection.push(r1[i]);
				}
			}
		}
		return intersection;
	}

	this.update = function() {}

	this.getCamera = function() {
		return renderer.camera;
	}

	var pathFinder = AStarPathFinderFactory(this, function(){return 1;});
	this.getPath = pathFinder.findPath;
}



