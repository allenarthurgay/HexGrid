function Hex(x, y, radius) {
	this.q = x;
	this.r = y;

	this.x = this.q;
	this.z = this.r
	this.y = -this.x-this.z;

	this.size = radius;
    this.color=[1,1,1,1];
	this.height = function() {return this.size * 2;}
	this.width = function() {return 1.7320508 * this.size;} //﻿1.7320508 is ~ Math.sqrt(3)
	this.equals = function(rHex) {
		return this.q === rHex.q && this.r === rHex.r;
	}
}
var cam_x = 0;
var cam_y = 0;
var cam_z = 13;
var degree = -30.0;
function HexRenderEngine(canvas, use3dRendering) {
	// render stuff -------------------------------
	var use3D = use3dRendering | false;
	var gl = undefined;
	var ctx_2D = undefined;
	var drawHex = undefined;
	var pointUpHexVertexBuffer;
    var hexOutlineVertexBuffer;
	var fieldOfVision = 90;
	var mvMatrix = mat4.create(); //modelview
	var pMatrix = mat4.create();  //perspective
	var shaderProgram;

	var getShader = function(id) {
		var shaderScript = document.getElementById(id);
		if (!shaderScript) {
			return null;
		}

		var str = "";
		var k = shaderScript.firstChild;
		while (k) {
			if (k.nodeType == 3) {
				str += k.textContent;
			}
			k = k.nextSibling;
		}

		var shader;
		if (shaderScript.type == "x-shader/x-fragment") {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else if (shaderScript.type == "x-shader/x-vertex") {
			shader = gl.createShader(gl.VERTEX_SHADER);
		} else {
			return null;
		}

		gl.shaderSource(shader, str);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(shader));
			return null;
		}

		return shader;
	}

	var initShaders = function() {
		var fragmentShader = getShader("shader-fs");
		var vertexShader = getShader("shader-vs");

		shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert("Could not initialise shaders");
		}

		gl.useProgram(shaderProgram);

		shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
		shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");

        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
		shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	}

	var setMatrixUniforms = function() {
		gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
		gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	}

	var initBuffers = function() {

		/*
		 0,0.5       ___
		 *  #7         |
		 /   \           |
		 /       \         |
		 * #6        * #2,8  |
		 |    0,0    |       | 1
		 |     * #1  |       |
		 |           |       |
		 * #5        * #3    |
		 \       /         |
		 \   /           |
		 *  #4      ___|
		 0,-0.5
		 */
		pointUpHexVertexBuffer = gl.createBuffer();
        hexOutlineVertexBuffer = gl.createBuffer();

        var hexVerts = [0.0,0.0,0.0];
        var outlineVerts = [];

		for (var i = 0; i <= 6; i++) {
			var angle = 2 * Math.PI / 6 * (0.5 - i);

			var x_i = 0.5 * Math.cos(angle);
			var y_i = 0.5 * Math.sin(angle);

            hexVerts.push(x_i);
            hexVerts.push(y_i);
            hexVerts.push(0.0);
            outlineVerts.push(x_i);
            outlineVerts.push(y_i);
            outlineVerts.push(0.01);
		}

		// re add first point to complete fan
        hexVerts.push(0.5 * Math.cos(2 * Math.PI / 3));
        hexVerts.push(0.5 * Math.sin(2 * Math.PI / 3));
        hexVerts.push(0.0);

        //re add first point to complete outline
        outlineVerts.push(outlineVerts[0]);
        outlineVerts.push(outlineVerts[1]);
        outlineVerts.push(0.0);

		gl.bindBuffer(gl.ARRAY_BUFFER, pointUpHexVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hexVerts), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		pointUpHexVertexBuffer.itemSize = 3;
		pointUpHexVertexBuffer.numItems = 8;

        gl.bindBuffer(gl.ARRAY_BUFFER, hexOutlineVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outlineVerts), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        hexOutlineVertexBuffer.itemSize = 3;
        hexOutlineVertexBuffer.numItems = 7;
	}

    function unprojectPoint(sx, sy) {
        var cameraMatrix = mat4.create();
        var projectionMatrix = mat4.create();
        var inverseMatrix = mat4.create();
        var pvMat = mat4.create();

        mat4.identity(inverseMatrix);
        setViewMatrix(cameraMatrix);
        setProjectionMatrix(projectionMatrix);
        mat4.multiply(projectionMatrix, cameraMatrix, pvMat);
        mat4.inverse(pvMat, inverseMatrix);
        var inNear = [];
        inNear[0] = (sx - gl.viewportX)/gl.viewportWidth*2.0 - 1.0; // normalize window X coord to -1 to 1
        inNear[1] = (sy - gl.viewportY)/gl.viewportHeight*2.0 - 1.0; // normalize window Y coord to -1 to 1
        inNear[2] = -1.0; // 2.0 * sz - 1.0 but optimized for near plane click
        inNear[3] = 1.0; // 1 = point, 0 = vector

        var inFar = [];
        inFar[0] = (sx - gl.viewportX)/gl.viewportWidth*2.0 - 1.0; // normalize window X coord to -1 to 1
        inFar[1] = (sy - gl.viewportY)/gl.viewportHeight*2.0 - 1.0; // normalize window Y coord to -1 to 1
        inFar[2] = 1.0; // 2.0 * sz - 1.0 but optimized for far plane click
        inFar[3] = 1.0; // 1 = point, 0 = vector

        var near = [0,0,0,0];
        var far = [0,0,0,0];

        mat4.multiply(inverseMatrix, inNear, near);

        if(near[3] == 0.0) {
            console.log("unproject point resulted in 0 for w coordinate. Does this ever happen?");
            return null;
        }

        //normalize output
        near[3] = 1.0/near[3];
        near[0] = near[0]*near[3];
        near[1] = near[1]*near[3];
        near[2] = near[2]*near[3];


        mat4.multiply(inverseMatrix, inFar, far);

        if(far[3] == 0.0) {
            console.log("unproject point resulted in 0 for w coordinate. Does this ever happen?");
            return null;
        }

        //normalize output
        far[3] = 1.0/far[3];
        far[0] = far[0]*far[3];
        far[1] = far[1]*far[3];
        far[2] = far[2]*far[3];

        return [[near[0], near[1], near[2]],[far[0], far[1], far[2]]];
    }

    function setProjectionMatrix(m) {
        mat4.identity(m);
        mat4.perspective(fieldOfVision/2.0, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0, m);
    }

    function setViewMatrix(m) {
        mat4.identity(m);
        mat4.translate(m, [-cam_x,-cam_y,-cam_z]);
        mat4.rotate(m,degree*Math.PI/180.0,[1,0,0],m);
    }

    function setModelViewMatrix(x,y,r) {
        setViewMatrix(mvMatrix);
        mat4.translate(mvMatrix, [x,y,0]);
        mat4.scale(mvMatrix,[r*2,r*2,1]);

    }
    var drawHex3D = function(x,y,r,fillColor) {

        setModelViewMatrix(x,y,r);

        gl.bindBuffer(gl.ARRAY_BUFFER, pointUpHexVertexBuffer);

        //set color
        gl.vertexAttrib4fv(shaderProgram.vertexColorAttribute, new Float32Array(fillColor));


		setMatrixUniforms();

		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, pointUpHexVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, pointUpHexVertexBuffer.numItems);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        //outline =========================
        gl.bindBuffer(gl.ARRAY_BUFFER, hexOutlineVertexBuffer);
        //set color
        gl.vertexAttrib4fv(shaderProgram.vertexColorAttribute, new Float32Array([0,0,1,1]));
        setMatrixUniforms();
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, hexOutlineVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
        gl.drawArrays(gl.LINE_STRIP,0,hexOutlineVertexBuffer.numItems);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	var drawHex2D = function(x, y, r, fillColor) {
		var g = ctx_2D.createRadialGradient(x, y, 0, x, y, 0.8 * r);
        var color = '#';
        for(var c = 0; c < 3; ++c) {
            var val = (255 * fillColor[c]).toString(16);
            var pad = "00";
            color = color + pad.substr(0,pad.length - val.length) + val;
        }
		g.addColorStop(0, '#fff');
        g.addColorStop(1,color);
		ctx_2D.fillStyle = g;
		ctx_2D.beginPath();
		ctx_2D.lineWidth = 4;
		for (var i = 0; i <= 6; i++) {
			var angle = 2 * Math.PI / 6 * (i + 0.5);

			var x_i = x + r * Math.cos(angle);
			var y_i = y + r * Math.sin(angle);

			if (i == 0) {
				ctx_2D.moveTo(x_i, y_i);
			} else {
				ctx_2D.lineTo(x_i, y_i);
			}
		}

		ctx_2D.closePath();
		ctx_2D.fill();
		ctx_2D.stroke();
	}

	this.drawHexes = function(hexes) {
		preRender();

		for (var i = 0; i < hexes.length; ++i) {
			var hex = hexes[i];
			//var x = hex.width() * (hex.q + hex.r/2)
			//var y = hex.height() * hex.r
		//	console.log(hex.q, )
			//var x = hex.q % 2 == 0 ? 0 : hex.width() / 2.0;
			var x= hex.width() * (hex.q + hex.r / 2);
			var y =  hex.height() * hex.r * 3 / 4.0;
		//	x += hex.width() * hex.q;

            drawHex(x,y,hex.size,hex.color);
        }

		postRender();
	}

	var preRender3D = function() {
        setProjectionMatrix(pMatrix);
	}

	var preRender2D = function() {}

	var preRender;

	var postRender3D = function() {}

	var postRender2D = function() {}

	var postRender;

	var clear2D = function() {
		ctx_2D.clearRect(0, 0, canvas.width, canvas.height)
	}

	var clear3D = function() {
		gl.clearColor(0, 0, 0, 1.0);
        gl.viewportX = 0;
        gl.viewportY = 0;
        gl.viewport(gl.viewportX,gl.viewportY,gl.viewportWidth,gl.viewportHeight);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}

	this.clearCanvas = clear2D;

	var supportsWebGL = function() {
		var contextNames = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"];

		for (var i = 0; i < contextNames.length; i++) {
			try {
				gl = canvas.getContext(contextNames[i]);
				if (gl) {
					return true;
				}

			} catch (e) {
				console.log("WebGL is not supported by this configuration: " + contextNames[i]);
			}
			if (gl === undefined) {
				console.log("WebGL is not supported by this configuration: " + contextNames[i]);
			}
		}
		return false;
	}

	var initGl = function() {
		try {
			gl.viewportWidth = canvas.width;
			gl.viewportHeight = canvas.height;
		}
		catch (e) {
			console.log(e.message);
		}

		initShaders();
		initBuffers();
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
	}

    function intersectLineWithXYPlane(far, near) {
        var vector = [far[0]-near[0],far[1]-near[1],far[2]-near[2]];
        var t = -near[2] / vector[2];
        return [near[0] + t * vector[0], near[1] + t * vector[1]];
    }

    this.projectScreenCoordToXYPlane = function(screenX, screenY){
        screenY = gl.viewportHeight - screenY;// canvas starts 0,top to H,bottom -- gl is opposite
        var nearFarPoints = unprojectPoint(screenX,screenY);
        return intersectLineWithXYPlane(nearFarPoints[0], nearFarPoints[1]);
    }

    if(!use3D || !supportsWebGL()) {
        ctx_2D = canvas.getContext('2d');
        use3D = false;
        this.clearCanvas = clear2D;
        drawHex = drawHex2D;
        preRender = preRender2D;
        postRender = postRender2D;
    }
    else {
        initGl();
        use3D = true;
        this.clearCanvas = clear3D;
        drawHex = drawHex3D;
        preRender = preRender3D;
        postRender = postRender3D;
    }

}

function HexGrid(canvas, use3D) {
    var hexSize = 1.5;
	var hexRenderList = [];
	var hexLookup = {};
	var map = null;

	var renderer = new HexRenderEngine(canvas, use3D);

	function makeHexToMapKey(mapTile) {
		return mapTile.x + "_" + mapTile.y + "_" + mapTile.z;
	}

	function mapHexToTile(hex, mapTile) {
		hexLookup[makeHexToMapKey(mapTile)] = {
			hex: hex,
			tile: mapTile
		};
	}

	function addHexFromTile(mapTile) {
		var hex = new Hex(mapTile.x, mapTile.y, hexSize);
		mapHexToTile(hex, mapTile);
		hexRenderList.push(hex);
	}

	this.loadMap = function(mapData) {
		map = mapData;
		mapData.forEach(addHexFromTile)
	};

	this.getMap = function() {
		return map;
	}

	this.draw = function() {
		renderer.drawHexes(hexRenderList);
	}

	this.clear = function() {
		renderer.clearCanvas();
	}

	this.add = function(x, y) {
		hexRenderList.push(new Hex(x, y, hexSize));
	}

	function pixelToHex(x, y){
		var q = ((1/3*Math.sqrt(3) * (x) - 1/3 * y)) / hexSize;
		var r = (2/3 * y) / hexSize;
		var ret = {
			q: Math.round(q),
			r: Math.round(r)
		};
		return ret;
	}

	this.findByPixel = function(x, y){
        if(use3D) {
            var point = renderer.projectScreenCoordToXYPlane(x,y);
            x = point[0];
            y = point[1];
            console.log('projected point: ', x, y);
        }
		var hexToFind = pixelToHex(x, y);
        console.log('hex coords: ', hexToFind.q, hexToFind.r);
		return this.find(hexToFind.q, hexToFind.r);
	};

	this.find = function(x, y) {
		var h = new Hex(x, y, hexSize);
		for (var i = 0; i < hexRenderList.length; ++i) {
			if (hexRenderList[i].equals(h)) {
				return hexRenderList[i];
			}
		}
		return null;
	}

	this.remove = function(x, y) {
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

	this.setHexSize = function(newSize) {
		hexSize = newSize;
		this.applyToAllHexes(function(hex) {
			hex.size = newSize;
		});
	}

	this.update = function() {}

    this.pickHex = function(x,y) {
    }
}