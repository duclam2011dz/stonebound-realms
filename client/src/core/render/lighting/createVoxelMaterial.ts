import * as THREE from 'three';

type ShaderLike = { vertexShader: string; fragmentShader: string };

export function createVoxelMaterial(texture: THREE.Texture): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    alphaTest: 0.5
  });

  material.onBeforeCompile = (shader: ShaderLike) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nattribute vec2 lightmap;\nattribute vec4 tilemap;\nvarying vec2 vLightmap;\nvarying vec4 vTilemap;'
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      '#include <uv_vertex>\nvLightmap = lightmap;\nvTilemap = tilemap;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec2 vLightmap;\nvarying vec4 vTilemap;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#ifdef USE_MAP\nvec2 tiledUv = clamp(fract(vMapUv), vec2(0.001), vec2(0.999));\nvec2 atlasUv = mix(vTilemap.xy, vTilemap.zw, tiledUv);\nvec4 sampledDiffuseColor = texture2D(map, atlasUv);\n#ifdef DECODE_VIDEO_TEXTURE\nsampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);\n#endif\ndiffuseColor *= sampledDiffuseColor;\n#endif\nfloat skyLight = clamp(vLightmap.x, 0.0, 1.0);\nfloat blockLight = clamp(vLightmap.y, 0.0, 1.0);\nfloat lightStrength = clamp(0.42 + skyLight * 0.58 + blockLight * 0.95, 0.25, 2.0);\ndiffuseColor.rgb *= lightStrength;'
    );
  };

  return material;
}
