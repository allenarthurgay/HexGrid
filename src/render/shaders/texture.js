goog.provide('hexgrid.render.shaders.texture');

var texture_fs = "" + 
"varying highp vec2 vTexCoord;" +
"uniform sampler2D textureSampler;" +

"void main(void) {" +
"    gl_FragColor = texture2D(textureSampler, vec2(vTexCoord.s,vTexCoord.t));" +
"}";

var texture_vs = "" +
"attribute vec3 aVertexPosition;" +
"attribute vec2 aTextureCoord;" +

"uniform mat4 uMVMatrix;" +
"uniform mat4 uPMatrix;" +

"varying highp vec2 vTexCoord;" +

"void main(void) {" +
"    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);" +
"    vTexCoord = aTextureCoord;" +
"}";
