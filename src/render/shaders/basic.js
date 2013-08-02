define(function(){
	var basic_fs = ""+
		"precision mediump float;" +
		"varying vec4 vColor;" +
		"void main(void) {" +
		"    gl_FragColor = vColor;" +
		"}";
	
	var basic_vs = "" +
		"attribute vec3 aVertexPosition;" +
		"attribute vec4 aVertexColor;" +
		"uniform mat4 uMVMatrix;" +
		"uniform mat4 uPMatrix;" +
		"varying vec4 vColor;" +
		"void main(void) {" +
		"    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);" +
		"    vColor = aVertexColor;" +
		"}";
	return {
		vs: basic_vs,
		fs: basic_fs
	};
});