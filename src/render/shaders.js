define(['render/shaders/basic','render/shaders/texture'],function(basic,texture){
	return {
		SHADER_TYPE_FRAG: 1,
		SHADER_TYPE_VERT: 2,
		basic: basic,
		texture: texture
	};
});